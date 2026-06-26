'use strict';
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.setTimeout(20000);

function buildPhase2App() {
  jest.resetModules();
  process.env.INVESTOR_JWT_SECRET = 'test-investor-secret';
  process.env.NODE_ENV = 'development';

  const state = {
    investors: [],
    clients: [],
    resetTokens: [],
    partners: [{ id: '33333333-3333-3333-3333-333333333333', customer: true, isdeleted: false }],
  };

  const queryMock = jest.fn(async (sql, params = []) => {
    const text = String(sql).toLowerCase();

    if (text.includes('from dbo.partners') && text.includes('customer = true')) {
      return state.partners;
    }
    if (text.includes('from dbo.investor_accounts') && text.includes('lower(email)')) {
      const email = params[0];
      const row = state.investors.find((i) => i.email.toLowerCase() === email.toLowerCase());
      return row ? [row] : [];
    }
    if (text.includes('from dbo.investor_accounts') && text.includes('where id =')) {
      const row = state.investors.find((i) => i.id === params[0]);
      return row ? [row] : [];
    }
    if (text.includes('insert into dbo.investor_accounts')) {
      const row = {
        id: '44444444-4444-4444-4444-444444444444',
        email: params[0],
        password_hash: params[1],
        investor_name: params[2],
        lob: params[3],
        is_active: true,
      };
      state.investors.push(row);
      return [{ ...row, created_at: new Date().toISOString() }];
    }
    if (text.includes('insert into dbo.investor_clients')) {
      state.clients.push({ investor_id: params[0], partner_id: params[1], is_visible: params[3] });
      return [];
    }
    if (text.includes('from dbo.investor_password_reset_tokens')) {
      const hash = params[0];
      const tok = state.resetTokens.find((t) => t.token_hash === hash);
      if (!tok) return [];
      const inv = state.investors.find((i) => i.id === tok.investor_id);
      return [{
        token_id: tok.id,
        investor_id: tok.investor_id,
        expires_at: tok.expires_at,
        used_at: tok.used_at,
        is_active: inv?.is_active !== false,
      }];
    }
    if (text.includes('insert into dbo.investor_password_reset_tokens')) {
      state.resetTokens.push({
        id: 'tok-1',
        investor_id: params[0],
        token_hash: params[1],
        expires_at: params[2],
        used_at: null,
      });
      return [];
    }
    if (text.startsWith('update dbo.investor_password_reset_tokens') && text.includes('used_at = now()')) {
      if (text.includes('where investor_id')) {
        state.resetTokens.forEach((t) => {
          if (t.investor_id === params[0] && !t.used_at) t.used_at = new Date();
        });
      } else {
        const tok = state.resetTokens.find((t) => t.id === params[0]);
        if (tok) tok.used_at = new Date();
      }
      return [];
    }
    if (text.includes('update dbo.investor_accounts set password_hash')) {
      const inv = state.investors.find((i) => i.id === params[1]);
      if (inv) inv.password_hash = params[0];
      return [];
    }
    return [];
  });

  jest.doMock('../../../db', () => ({
    getQuery: () => queryMock,
  }));

  jest.doMock('../../../middleware/auth', () => ({
    requirePermission: () => (_req, _res, next) => next(),
  }));

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '11111111-1111-1111-1111-111111111111' };
    req.lob = 'dental';
    next();
  });

  const adminRouter = require('../adminStaff');
  const { patchInvestorVisibility } = require('../../partners/investorVisibilityPatch');
  const authRouter = require('../auth');

  app.use('/admin/investors', adminRouter);
  app.patch('/partners/:id/investor-visibility', patchInvestorVisibility);
  app.use('/auth', authRouter);

  return { app, state };
}

describe('investor portal phase 2', () => {
  it('creates investor via admin API', async () => {
    const { app } = buildPhase2App();
    const res = await request(app)
      .post('/admin/investors')
      .send({ email: 'new@clinic.vn', investorName: 'New Inv', lob: 'dental' });
    expect(res.status).toBe(201);
    expect(res.body.initialPassword).toBeTruthy();
  });

  it('patches investor visibility', async () => {
    const { app, state } = buildPhase2App();
    state.investors.push({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'inv@clinic.vn',
      investor_name: 'Inv',
      lob: 'dental',
      is_active: true,
    });

    const res = await request(app)
      .patch('/partners/33333333-3333-3333-3333-333333333333/investor-visibility')
      .send({ investorId: '44444444-4444-4444-4444-444444444444', isVisible: true });

    expect(res.status).toBe(200);
    expect(res.body.isVisible).toBe(true);
    expect(state.clients.length).toBe(1);
  });

  it('password reset happy path', async () => {
    const { app, state } = buildPhase2App();
    state.investors.push({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'inv@clinic.vn',
      password_hash: await bcrypt.hash('oldpass', 4),
      investor_name: 'Inv',
      lob: 'dental',
      is_active: true,
    });

    const reqRes = await request(app)
      .post('/auth/password-reset-request')
      .send({ email: 'inv@clinic.vn' });
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.token).toBeTruthy();

    const resetRes = await request(app)
      .post('/auth/password-reset')
      .send({ token: reqRes.body.token, password: 'newpass', confirmPassword: 'newpass' });
    expect(resetRes.status).toBe(200);

    const inv = state.investors[0];
    expect(await bcrypt.compare('newpass', inv.password_hash)).toBe(true);
  });

  it('reset request always returns 200 for unknown email', async () => {
    const { app } = buildPhase2App();
    const res = await request(app)
      .post('/auth/password-reset-request')
      .send({ email: 'nobody@clinic.vn' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects duplicate email on admin create', async () => {
    const { app, state } = buildPhase2App();
    state.investors.push({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'dup@clinic.vn',
      investor_name: 'Dup',
      lob: 'dental',
      is_active: true,
    });
    const res = await request(app)
      .post('/admin/investors')
      .send({ email: 'dup@clinic.vn', investorName: 'Dup2', lob: 'dental' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('U_DUPLICATE_EMAIL');
  });

  it('rejects visibility patch for missing partner', async () => {
    const { app, state } = buildPhase2App();
    state.partners = [];
    state.investors.push({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'inv@clinic.vn',
      lob: 'dental',
      is_active: true,
    });
    const res = await request(app)
      .patch('/partners/33333333-3333-3333-3333-333333333333/investor-visibility')
      .send({ investorId: '44444444-4444-4444-4444-444444444444', isVisible: true });
    expect(res.status).toBe(404);
  });

  it('rejects reused reset token', async () => {
    const { app, state } = buildPhase2App();
    state.investors.push({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'inv@clinic.vn',
      password_hash: await bcrypt.hash('old', 4),
      lob: 'dental',
      is_active: true,
    });
    const reqRes = await request(app)
      .post('/auth/password-reset-request')
      .send({ email: 'inv@clinic.vn' });
    const token = reqRes.body.token;
    await request(app)
      .post('/auth/password-reset')
      .send({ token, password: 'newpass1', confirmPassword: 'newpass1' });
    const reuse = await request(app)
      .post('/auth/password-reset')
      .send({ token, password: 'newpass2', confirmPassword: 'newpass2' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('U_RESET_TOKEN_INVALID');
  });
});