const express = require('express');
const request = require('supertest');

const mockDentalQueryRows = jest.fn();
const mockCosmeticQueryRows = jest.fn();

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = {
      employeeId: 'ctv-1',
      is_ctv: true,
      name: 'CTV Demo',
      email: 'ctv-demo@clinic.vn',
    };
    next();
  },
}));

jest.mock('../../db', () => ({
  getDb: jest.fn((lob) => ({
    queryRows: lob === 'cosmetic' ? mockCosmeticQueryRows : mockDentalQueryRows,
  })),
}));

const ctvRouter = require('../ctv');

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
  // Test-only Supertest app mounts a GET-only router with mocked auth; production CSRF policy is outside this unit test.
  const app = express(); // nosemgrep
  app.use(express.json());
  app.use('/api/ctv', ctvRouter);
  return app;
}

describe('CTV referrals route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDentalQueryRows.mockImplementation(async (sql) => {
      if (sql.includes('WITH RECURSIVE upline')) {
        return [
          {
            id: 'ctv-parent',
            name: 'Leader CTV',
            phone: '0909999999',
            email: 'leader@clinic.vn',
            joined_at: '2026-05-01T00:00:00.000Z',
            referred_by_ctv_id: null,
            level: 1,
            direct_downline_count: 2,
          },
        ];
      }

      if (sql.includes('WITH RECURSIVE downline')) {
        return [
          {
            id: 'ctv-child',
            name: 'Junior CTV',
            phone: '0902222222',
            email: 'junior@clinic.vn',
            joined_at: '2026-05-25T00:00:00.000Z',
            referred_by_ctv_id: 'ctv-1',
            level: 1,
            direct_downline_count: 0,
          },
        ];
      }

      if (sql.includes('WHERE id = $1') && sql.includes('COALESCE(is_ctv, false) = true')) {
        return [
          {
            id: 'ctv-1',
            name: 'CTV Demo',
            phone: '',
            email: 'ctv-demo@clinic.vn',
            joined_at: '2026-05-20T00:00:00.000Z',
            referred_by_ctv_id: 'ctv-parent',
            level: 0,
            direct_downline_count: 1,
          },
        ];
      }

      if (sql.includes('FROM dbo.partners') && sql.includes('customer = true')) {
        return [
          {
            id: 'client-1',
            name: 'Seed Client - NK3 CTV',
            phone: '0900000000',
            email: 'seed@example.test',
            referred_at: '2026-05-24T08:00:00.000Z',
          },
        ];
      }

      if (sql.includes('COALESCE(SUM(amount), 0) AS total')) {
        return [{ total: '172000', cnt: '3' }];
      }

      if (sql.includes('service_name') && sql.includes('LEFT JOIN dbo.saleorderlines')) {
        return [
          {
            id: 'earning-1',
            service_line_id: 'line-1',
            payment_id: 'payment-1',
            service_name: 'Botox gọn hàm',
            amount: '72000',
            status: 'pending',
            source: 'ctv',
            earned_at: '2026-05-24T10:00:00.000Z',
          },
          {
            id: 'earning-2',
            service_line_id: 'line-2',
            payment_id: 'payment-2',
            service_name: 'Laser da mặt',
            amount: '48000',
            status: 'pending',
            source: 'ctv',
            earned_at: '2026-05-25T10:00:00.000Z',
          },
          {
            id: 'earning-3',
            service_line_id: 'line-3',
            payment_id: 'payment-3',
            service_name: 'Tẩy trắng răng',
            amount: '52000',
            status: 'paid',
            source: 'ctv',
            earned_at: '2026-05-26T10:00:00.000Z',
          },
        ];
      }

      throw new Error(`Unexpected dental query: ${sql}`);
    });

    mockCosmeticQueryRows.mockImplementation(async (sql) => {
      if (
        sql.includes('WITH RECURSIVE upline') ||
        sql.includes('WITH RECURSIVE downline') ||
        (sql.includes('WHERE id = $1') && sql.includes('COALESCE(is_ctv, false) = true')) ||
        (sql.includes('FROM dbo.partners') && sql.includes('customer = true'))
      ) {
        return [];
      }
      throw new Error(`Unexpected cosmetic query: ${sql}`);
    });
  });

  it('returns every earned service under each referred client', async () => {
    const res = await request(makeApp()).get('/api/ctv/referrals');

    expect(res.status).toBe(200);
    expect(res.body.referrals).toHaveLength(1);
    expect(res.body.referrals[0]).toMatchObject({
      id: 'client-1',
      name: 'Seed Client - NK3 CTV',
      total_earned: 172000,
      earned_count: 3,
      service_count: 3,
    });
    expect(res.body.referrals[0].services).toEqual([
      expect.objectContaining({
        id: 'earning-1',
        serviceLineId: 'line-1',
        serviceName: 'Botox gọn hàm',
        amount: 72000,
        status: 'pending',
        lob: 'dental',
      }),
      expect.objectContaining({
        id: 'earning-2',
        serviceName: 'Laser da mặt',
        amount: 48000,
      }),
      expect.objectContaining({
        id: 'earning-3',
        serviceName: 'Tẩy trắng răng',
        status: 'paid',
      }),
    ]);
  });

  it('returns the CTV-only upline and downline hierarchy separately from referred clients', async () => {
    const res = await request(makeApp()).get('/api/ctv/hierarchy');

    expect(res.status).toBe(200);
    expect(res.body.current).toMatchObject({
      id: 'ctv-1',
      name: 'CTV Demo',
      referredByCtvId: 'ctv-parent',
      level: 0,
      lobs: ['dental'],
    });
    expect(res.body.upline).toEqual([
      expect.objectContaining({
        id: 'ctv-parent',
        name: 'Leader CTV',
        level: 1,
        directDownlineCount: 2,
        lobs: ['dental'],
      }),
    ]);
    expect(res.body.downline).toEqual([
      expect.objectContaining({
        id: 'ctv-child',
        name: 'Junior CTV',
        referredByCtvId: 'ctv-1',
        level: 1,
        directDownlineCount: 0,
        lobs: ['dental'],
      }),
    ]);
    expect(res.body.totals).toEqual({
      uplineCount: 1,
      downlineCount: 1,
      directDownlineCount: 1,
    });
  });
});
