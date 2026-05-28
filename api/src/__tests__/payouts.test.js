'use strict';

const express = require('express');
const request = require('supertest');

/**
 * Payouts route tests — Gap 1: manual payout cycles + receipt photo.
 * Tests POST /, PATCH /:id, and the adminOrPerm permission gate.
 */

// We need to mock db and permissionService before requiring the router.
const mockQueryRows = jest.fn();
const mockDb = {
  queryRows: mockQueryRows,
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn(),
};

jest.mock('../db', () => ({
  getDb: jest.fn(() => mockDb),
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = req._testUser || { employeeId: 'admin-uuid' };
    next();
  },
}));

const mockResolveEffectivePermissions = jest.fn();
const mockIsAdminPermissionState = jest.fn();
jest.mock('../services/permissionService', () => ({
  resolveEffectivePermissions: mockResolveEffectivePermissions,
  isAdminPermissionState: mockIsAdminPermissionState,
}));

const payoutsRouter = require('../routes/payouts');

function buildApp({ user } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req._testUser = user;
    next();
  });
  app.use('/api/Payouts', payoutsRouter);
  return app;
}

describe('payouts.js — adminOrPerm gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / rejects non-admin without commissions.payout.run', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['payment.view'] });
    mockIsAdminPermissionState.mockReturnValue(false);
    const app = buildApp({ user: { employeeId: 'user-uuid' } });
    const res = await request(app).get('/api/Payouts');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('S_FORBIDDEN');
  });

  test('GET / allows admin via isAdminPermissionState', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({ effectivePermissions: [] });
    mockIsAdminPermissionState.mockReturnValue(true);
    mockQueryRows.mockResolvedValue([]);
    const app = buildApp({ user: { employeeId: 'admin-uuid' } });
    const res = await request(app).get('/api/Payouts');
    expect(res.status).toBe(200);
  });

  test('GET / allows user with commissions.payout.run', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['commissions.payout.run'] });
    mockIsAdminPermissionState.mockReturnValue(false);
    mockQueryRows.mockResolvedValue([]);
    const app = buildApp({ user: { employeeId: 'user-uuid' } });
    const res = await request(app).get('/api/Payouts');
    expect(res.status).toBe(200);
  });
});

describe('payouts.js — POST /', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['commissions.payout.run'] });
    mockIsAdminPermissionState.mockReturnValue(false);
  });

  test('POST / creates payout and updates earnings', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockDb.connect.mockResolvedValue(mockClient);

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [
            { id: 'earn-1', amount: '50000' },
            { id: 'earn-2', amount: '30000' },
          ],
        });
      }
      if (sql.includes('INSERT INTO dbo.payouts')) {
        return Promise.resolve({
          rows: [{
            id: 'payout-1',
            cycle_label: 'May 2026',
            paid_at: new Date().toISOString(),
            total_amount: '80000',
            notes: null,
            receipt_url: 'https://example.com/receipt.jpg',
            created_by_partner_id: 'admin-uuid',
            created_at: new Date().toISOString(),
          }],
        });
      }
      if (sql.includes('UPDATE dbo.earnings')) return Promise.resolve();
      if (sql === 'COMMIT') return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });

    const app = buildApp({ user: { employeeId: 'admin-uuid' } });
    const res = await request(app)
      .post('/api/Payouts')
      .send({
        lob: 'cosmetic',
        earningIds: ['earn-1', 'earn-2'],
        cycleLabel: 'May 2026',
        receipt_url: 'https://example.com/receipt.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.cycle_label).toBe('May 2026');
    expect(res.body.total_amount).toBe(80000);
    expect(res.body.receipt_url).toBe('https://example.com/receipt.jpg');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE dbo.earnings'),
      expect.any(Array)
    );
  });

  test('POST / returns B_EARNINGS_NOT_PAYABLE when some earnings are already paid', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockDb.connect.mockResolvedValue(mockClient);

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('FOR UPDATE')) {
        // Only 1 of 2 earnings is pending
        return Promise.resolve({
          rows: [{ id: 'earn-1', amount: '50000' }],
        });
      }
      if (sql === 'ROLLBACK') return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });

    const app = buildApp({ user: { employeeId: 'admin-uuid' } });
    const res = await request(app)
      .post('/api/Payouts')
      .send({
        lob: 'dental',
        earningIds: ['earn-1', 'earn-2'],
        cycleLabel: 'May 2026',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('B_EARNINGS_NOT_PAYABLE');
  });
});

describe('payouts.js — PATCH /:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveEffectivePermissions.mockResolvedValue({ effectivePermissions: ['commissions.payout.run'] });
    mockIsAdminPermissionState.mockReturnValue(false);
  });

  test('PATCH /:id sets receipt_url and receipt_uploaded_at', async () => {
    mockQueryRows.mockResolvedValue([{
      id: 'payout-1',
      cycle_label: 'May 2026',
      paid_at: new Date().toISOString(),
      total_amount: '80000',
      notes: null,
      receipt_url: '/uploads/payouts/receipt.jpg',
      receipt_uploaded_at: new Date().toISOString(),
      created_by_partner_id: 'admin-uuid',
      created_at: new Date().toISOString(),
    }]);

    const app = buildApp({ user: { employeeId: 'admin-uuid' } });
    const res = await request(app)
      .patch('/api/Payouts/payout-1')
      .send({ receipt_url: '/uploads/payouts/receipt.jpg', lob: 'cosmetic' });

    expect(res.status).toBe(200);
    expect(res.body.receipt_url).toBe('/uploads/payouts/receipt.jpg');
    expect(res.body.receipt_uploaded_at).toBeTruthy();
  });

  test('PATCH /:id returns 404 for missing payout', async () => {
    mockQueryRows.mockResolvedValue([]);

    const app = buildApp({ user: { employeeId: 'admin-uuid' } });
    const res = await request(app)
      .patch('/api/Payouts/missing-id')
      .send({ receipt_url: '/uploads/payouts/receipt.jpg', lob: 'dental' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('S_NOT_FOUND');
  });
});
