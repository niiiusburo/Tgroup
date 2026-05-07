process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { employeeId: '55555555-5555-4555-8555-555555555555' };
    next();
  },
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');
const { resolveEffectivePermissions } = require('../src/services/permissionService');

const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';
const EMPLOYEE_ID = '55555555-5555-4555-8555-555555555555';
const DOCTOR_ID = '66666666-6666-4666-8666-666666666666';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    // Allow other queries to pass through to their own mocks
  });
}

describe('POST /api/Payments/:id/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIpAccess();
  });

  it('confirms a payment when user is super admin', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: false }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'posted',
          service_id: null,
          created_by: DOCTOR_ID,
        }];
      }
      if (sql.includes('UPDATE payments') && sql.includes('confirmed_at')) {
        return [{
          id: PAYMENT_ID,
          customer_id: '11111111-1111-4111-8111-111111111111',
          service_id: null,
          amount: '1200000',
          method: 'cash',
          notes: null,
          payment_date: '2026-05-02',
          reference_code: null,
          status: 'confirmed',
          receipt_number: null,
          deposit_type: null,
          created_at: '2026-05-02T00:00:00.000Z',
          created_by: DOCTOR_ID,
          confirmed_at: '2026-05-02T12:00:00.000Z',
          confirmed_by: EMPLOYEE_ID,
          confirmation_notes: 'Received cash',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true, notes: 'Received cash' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      id: PAYMENT_ID,
      status: 'confirmed',
      confirmationNotes: 'Received cash',
    }));
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE payments') && sql.includes('confirmed_at'))).toBe(true);
  });

  it('allows dentist to confirm payment they created', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: true }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'posted',
          service_id: null,
          created_by: EMPLOYEE_ID,
        }];
      }
      if (sql.includes('UPDATE payments') && sql.includes('confirmed_at')) {
        return [{
          id: PAYMENT_ID,
          customer_id: '11111111-1111-4111-8111-111111111111',
          service_id: null,
          amount: '500000',
          method: 'bank_transfer',
          notes: null,
          payment_date: '2026-05-02',
          reference_code: null,
          status: 'confirmed',
          receipt_number: null,
          deposit_type: null,
          created_at: '2026-05-02T00:00:00.000Z',
          created_by: EMPLOYEE_ID,
          confirmed_at: '2026-05-02T12:00:00.000Z',
          confirmed_by: EMPLOYEE_ID,
          confirmation_notes: null,
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('allows dentist to confirm payment for their assigned dotkham', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: true }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'posted',
          service_id: 'dk-1',
          created_by: '99999999-9999-4999-8999-999999999999',
        }];
      }
      if (sql.includes('SELECT 1 FROM dotkhams')) {
        return [{ '1': 1 }];
      }
      if (sql.includes('UPDATE payments') && sql.includes('confirmed_at')) {
        return [{
          id: PAYMENT_ID,
          customer_id: '11111111-1111-4111-8111-111111111111',
          service_id: 'dk-1',
          amount: '500000',
          method: 'cash',
          notes: null,
          payment_date: '2026-05-02',
          reference_code: null,
          status: 'confirmed',
          receipt_number: null,
          deposit_type: null,
          created_at: '2026-05-02T00:00:00.000Z',
          created_by: '99999999-9999-4999-8999-999999999999',
          confirmed_at: '2026-05-02T12:00:00.000Z',
          confirmed_by: EMPLOYEE_ID,
          confirmation_notes: null,
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('rejects dentist confirming payment they did not create and is not assigned to', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.confirm'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: true }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'posted',
          service_id: 'dk-2',
          created_by: DOCTOR_ID,
        }];
      }
      if (sql.includes('SELECT 1 FROM dotkhams')) {
        return [];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('only confirm payments you created');
  });

  it('unconfirms a payment and reverts to posted', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: false }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'confirmed',
          service_id: null,
          created_by: DOCTOR_ID,
        }];
      }
      if (sql.includes('UPDATE payments') && sql.includes('confirmed_at')) {
        return [{
          id: PAYMENT_ID,
          customer_id: '11111111-1111-4111-8111-111111111111',
          service_id: null,
          amount: '1200000',
          method: 'cash',
          notes: null,
          payment_date: '2026-05-02',
          reference_code: null,
          status: 'posted',
          receipt_number: null,
          deposit_type: null,
          created_at: '2026-05-02T00:00:00.000Z',
          created_by: DOCTOR_ID,
          confirmed_at: null,
          confirmed_by: null,
          confirmation_notes: null,
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      id: PAYMENT_ID,
      status: 'posted',
      confirmedAt: null,
      confirmedBy: null,
      confirmationNotes: null,
    }));
  });

  it('returns 404 for non-existent payment', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: false }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Payment not found');
  });

  it('returns 400 when confirmed is not a boolean', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('confirmed (boolean) is required');
  });

  it('returns 400 when trying to confirm a voided payment', async () => {
    resolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['*'] });

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access')) return [{ mode: 'disabled' }];
      if (sql.includes('SELECT isdoctor FROM partners')) return [{ isdoctor: false }];
      if (sql.includes('SELECT id, status, service_id, created_by FROM payments')) {
        return [{
          id: PAYMENT_ID,
          status: 'voided',
          service_id: null,
          created_by: DOCTOR_ID,
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/confirm`)
      .send({ confirmed: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot confirm a voided payment');
  });
});
