'use strict';
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.setTimeout(15000);

function buildInvestorApp({ investorRows = [], active = true } = {}) {
  jest.resetModules();
  process.env.INVESTOR_JWT_SECRET = 'test-investor-secret';

  const queryMock = jest.fn(async (sql) => {
    const text = String(sql).toLowerCase();
    if (text.includes('from dbo.investor_accounts') && text.includes('lower(email)')) {
      if (investorRows.length === 0) return [];
      const row = investorRows[0];
      return [{
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        investor_name: row.investor_name || 'Demo',
        lob: row.lob || 'dental',
        is_active: active,
      }];
    }
    if (text.startsWith('update dbo.investor_accounts')) return [];
    if (text.includes('from dbo.investor_accounts') && text.includes('where id =')) {
      const row = investorRows[0];
      if (!row) return [];
      return [{
        id: row.id,
        email: row.email,
        investor_name: row.investor_name || 'Demo',
        lob: row.lob || 'dental',
        is_active: active,
      }];
    }
    if (text.includes('insert into dbo.investor_view_audit')) return [];
    return [];
  });

  jest.doMock('../../../db', () => ({
    getQuery: (lob) => {
      if (lob === 'dental' || lob === 'cosmetic') return queryMock;
      return queryMock;
    },
  }));

  const authRouter = require('../auth');
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('investor auth router', () => {
  it('rejects staff JWT on /auth/me', async () => {
    const app = buildInvestorApp({
      investorRows: [{
        id: '22222222-2222-2222-2222-222222222222',
        email: 'investor@clinic.vn',
        password_hash: 'x',
      }],
    });

    const staffToken = jwt.sign({ userId: 'staff-1' }, 'test-staff-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(401);
  });

  it('logs in with valid investor credentials', async () => {
    const passwordHash = await bcrypt.hash('123123', 10);
    const app = buildInvestorApp({
      investorRows: [{
        id: '22222222-2222-2222-2222-222222222222',
        email: 'investor@clinic.vn',
        password_hash: passwordHash,
        investor_name: 'Demo Investor',
        lob: 'dental',
      }],
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'investor@clinic.vn', password: '123123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.investor.email).toBe('investor@clinic.vn');
  });

  it('blocks deactivated investor on /me even with valid token', async () => {
    const investorId = '22222222-2222-2222-2222-222222222222';
    const app = buildInvestorApp({
      investorRows: [{
        id: investorId,
        email: 'investor@clinic.vn',
        password_hash: await bcrypt.hash('123123', 10),
        lob: 'dental',
      }],
      active: false,
    });

    const token = jwt.sign(
      { type: 'investor', sub: investorId, lob: 'dental' },
      process.env.INVESTOR_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('S_INVESTOR_DEACTIVATED');
  });
});