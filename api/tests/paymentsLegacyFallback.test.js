jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('GET /api/Payments legacy fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes canceled accountpayments as voided payment history when modern payment rows are absent', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.includes('FROM payments p') && sql.includes('SELECT COUNT')) return [{ count: '0' }];
      if (sql.includes('FROM payments p')) return [];
      if (sql.includes('COUNT(*) FROM accountpayments')) return [{ count: '2' }];
      if (sql.includes('FROM accountpayments ap')) {
        return [
          {
            id: 'posted-payment',
            customer_id: 'customer-id',
            service_id: null,
            amount: '1000000.00',
            method: 'cash',
            notes: 'SO37124',
            created_at: '2025-06-06 10:47:46',
            payment_date: '2025-06-06',
            reference_code: 'CUST.IN/2025/62656',
            status: 'posted',
            deposit_used: '0',
            cash_amount: '0',
            bank_amount: '0',
            receipt_number: null,
            deposit_type: null,
          },
          {
            id: 'canceled-payment',
            customer_id: 'customer-id',
            service_id: null,
            amount: '2000000.00',
            method: 'cash',
            notes: 'SO38545 canceled',
            created_at: '2025-12-13 09:00:00',
            payment_date: '2025-06-22',
            reference_code: 'CUST.IN/2025/CANCEL',
            status: 'voided',
            deposit_used: '0',
            cash_amount: '0',
            bank_amount: '0',
            receipt_number: null,
            deposit_type: 'usage',
          },
        ];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).get('/api/Payments?customerId=customer-id&type=payments');

    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(2);
    expect(res.body.items).toEqual([
      expect.objectContaining({ id: 'posted-payment', status: 'posted', amount: 1000000 }),
      expect.objectContaining({ id: 'canceled-payment', status: 'voided', amount: 2000000 }),
    ]);
  });
});
