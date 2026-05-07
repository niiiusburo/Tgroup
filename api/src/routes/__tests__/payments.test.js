'use strict';

const originalEnv = process.env;

function setupRouter(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };

  jest.doMock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
  jest.doMock('../../middleware/auth', () => ({
    requireAuth: (req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
  }));
  jest.doMock('../../services/permissionService', () => ({
    resolveEffectivePermissions: jest.fn(),
  }));

  const router = require('../payments');
  const { query } = require('../../db');
  const { resolveEffectivePermissions } = require('../../services/permissionService');
  return { router, query, resolveEffectivePermissions };
}

function mockReq({ params = {}, body = {}, user = { employeeId: 'emp-1' } } = {}) {
  return { params, body, user };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  process.env = originalEnv;
  jest.dontMock('../../db');
  jest.dontMock('../../middleware/auth');
  jest.dontMock('../../services/permissionService');
});

describe('POST /api/Payments/:id/confirm', () => {
  it('returns 400 when confirmed is not a boolean', async () => {
    const { router } = setupRouter();
    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;

    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: 'yes' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'confirmed (boolean) is required' });
  });

  it('returns 404 when payment does not exist', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: [] });
    query.mockResolvedValue([]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment not found' });
  });

  it('allows super admin to confirm any payment', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'other', customer_id: 'cust-1', service_id: null }])
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'confirmed', customer_id: 'cust-1', service_id: null, confirmed_at: new Date(), confirmed_by: 'emp-1', confirmation_notes: null }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
  });

  it('blocks non-dentist from confirming', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'other', customer_id: 'cust-1', service_id: null }])
      .mockResolvedValueOnce([{ isdoctor: false }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admins cannot confirm/unconfirm payments' });
  });

  it('allows dentist to confirm their own payment', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'emp-1', customer_id: 'cust-1', service_id: null }])
      .mockResolvedValueOnce([{ isdoctor: true }])
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'confirmed', customer_id: 'cust-1', service_id: null, confirmed_at: new Date(), confirmed_by: 'emp-1', confirmation_notes: null }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
  });

  it('allows dentist to confirm payment for their assigned appointment', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'other', customer_id: 'cust-1', service_id: 'dk-1' }])
      .mockResolvedValueOnce([{ isdoctor: true }])
      .mockResolvedValueOnce([{ '1': 1 }]) // dotkham assignment found
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'confirmed', customer_id: 'cust-1', service_id: 'dk-1', confirmed_at: new Date(), confirmed_by: 'emp-1', confirmation_notes: null }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
  });

  it('blocks dentist from confirming unassigned payment', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'other', customer_id: 'cust-1', service_id: 'dk-2' }])
      .mockResolvedValueOnce([{ isdoctor: true }])
      .mockResolvedValueOnce([]); // no dotkham assignment

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'You can only confirm payments you created or for your assigned appointments' });
  });

  it('prevents confirming a voided payment', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });
    query.mockResolvedValueOnce([{ id: 'pay-1', status: 'voided', created_by: 'other', customer_id: 'cust-1', service_id: null }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot confirm a voided payment' });
  });

  it('unconfirm reverts payment to posted and clears confirmation fields', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'confirmed', created_by: 'other', customer_id: 'cust-1', service_id: null }])
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', customer_id: 'cust-1', service_id: null, confirmed_at: null, confirmed_by: null, confirmation_notes: null }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: false } });
    const res = mockRes();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'posted', confirmedAt: null, confirmedBy: null }));
  });

  it('stores confirmation notes when confirming', async () => {
    const { router, query, resolveEffectivePermissions } = setupRouter();
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });
    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted', created_by: 'other', customer_id: 'cust-1', service_id: null }])
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'confirmed', customer_id: 'cust-1', service_id: null, confirmed_at: new Date(), confirmed_by: 'emp-1', confirmation_notes: 'Cash received' }]);

    const handler = router.stack.find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)?.route.stack[1].handle;
    const req = mockReq({ params: { id: 'pay-1' }, body: { confirmed: true, notes: 'Cash received' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed', confirmationNotes: 'Cash received' }));
  });
});
