jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('PATCH /api/SaleOrders/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reopens residual and updates the primary service line when amounttotal changes', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access_settings')) {
        return [{ mode: 'disabled' }];
      }
      if (sql.includes('ip_access_entries')) {
        return [];
      }
      if (sql.includes('FROM payment_allocations')) {
        return [{ totalpaid: '0' }];
      }
      if (sql.startsWith('UPDATE saleorders')) {
        return [{ id: 'order-id' }];
      }
      if (sql.includes('SELECT id, productid FROM saleorderlines')) {
        return [{ id: 'line-id', productid: 'product-id' }];
      }
      if (sql.startsWith('UPDATE saleorderlines')) {
        return [{ id: 'line-id' }];
      }
      if (sql.includes('FROM saleorders so')) {
        return [{
          id: 'order-id',
          name: 'SO12763',
          amounttotal: '1000000',
          residual: '1000000',
          totalpaid: '0',
          state: 'sale',
        }];
      }
      throw new Error(`Unexpected query: ${sql} ${JSON.stringify(params)}`);
    });

    const res = await request(app)
      .patch('/api/SaleOrders/order-id')
      .send({ amounttotal: 1000000 });

    expect(res.status).toBe(200);
    expect(query.mock.calls.some(([sql]) => sql.includes('FROM payment_allocations'))).toBe(true);

    const orderUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorders'));
    expect(orderUpdate?.[0]).toContain('totalpaid');
    expect(orderUpdate?.[0]).toContain('residual');
    expect(orderUpdate?.[1]).toEqual(expect.arrayContaining([1000000, 0, 1000000, 'order-id']));

    const lineUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorderlines'));
    expect(lineUpdate?.[0]).toContain('pricetotal');
    expect(lineUpdate?.[0]).toContain('amountpaid');
    expect(lineUpdate?.[0]).toContain('amountresidual');
    expect(lineUpdate?.[1]).toEqual(expect.arrayContaining([1000000, 0, 1000000, 'line-id']));
  });
});

describe('GET /api/SaleOrders/lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to product or line name when imported line productname is blank', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) {
        return [{ mode: 'disabled' }];
      }
      if (sql.includes('ip_access_entries')) {
        return [];
      }
      if (sql.includes('COUNT(*) as count')) {
        return [{ count: '1' }];
      }
      if (sql.includes('FROM saleorderlines sol')) {
        return [{
          id: 'line-id',
          productname: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
          ordername: 'SO55172',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .get('/api/SaleOrders/lines')
      .query({ partner_id: 'customer-id' });

    expect(res.status).toBe(200);
    expect(res.body.items[0].productname).toBe('Niềng Mắc Cài Kim Loại Tiêu Chuẩn');

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN products pr ON pr.id = sol.productid'));
    expect(listQuery?.[0]).toContain('LEFT JOIN products pr ON pr.id = sol.productid');
    expect(listQuery?.[0]).toContain("COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), so.name) as productname");
    expect(listQuery?.[0]).toContain('so.code ASC NULLS LAST, sol.sequence ASC NULLS LAST, sol.id ASC');
  });

  it('includes direct posted service payments when no allocation row exists', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) {
        return [{ mode: 'disabled' }];
      }
      if (sql.includes('ip_access_entries')) {
        return [];
      }
      if (sql.includes('COUNT(*) as count')) {
        return [{ count: '1' }];
      }
      if (sql.includes('FROM saleorderlines sol')) {
        return [{
          id: 'line-id',
          orderid: 'order-id',
          amountpaid: '0.00',
          paid_amount: '3200000.00',
          order_line_count: '1',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .get('/api/SaleOrders/lines')
      .query({ partner_id: 'customer-id' });

    expect(res.status).toBe(200);
    expect(res.body.items[0].paid_amount).toBe('3200000.00');

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN products pr ON pr.id = sol.productid'));
    expect(listQuery?.[0]).toContain('FROM payments p');
    expect(listQuery?.[0]).toContain('p.service_id = so.id');
    expect(listQuery?.[0]).toContain('NOT EXISTS');
    expect(listQuery?.[0]).toContain('order_line_count');
  });

  it('falls back to sale order edit fields when imported line fields are blank', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) {
        return [{ mode: 'disabled' }];
      }
      if (sql.includes('ip_access_entries')) {
        return [];
      }
      if (sql.includes('COUNT(*) as count')) {
        return [{ count: '1' }];
      }
      if (sql.includes('FROM saleorderlines sol')) {
        return [{
          id: 'line-id',
          orderid: 'order-id',
          ordercode: 'SO-2026-0036',
          productid: 'product-id',
          productname: 'Cắt cầu răng',
          date: '2026-04-26',
          employeeid: 'doctor-id',
          companyid: 'company-id',
          unit: 'răng',
          note: 'order note',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .get('/api/SaleOrders/lines')
      .query({ partner_id: 'customer-id' });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      ordercode: 'SO-2026-0036',
      productname: 'Cắt cầu răng',
      date: '2026-04-26',
      employeeid: 'doctor-id',
      companyid: 'company-id',
      unit: 'răng',
      note: 'order note',
    });

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN products pr ON pr.id = sol.productid'));
    expect(listQuery?.[0]).toContain('COALESCE(sol.date, so.datestart::timestamp) as date');
    expect(listQuery?.[0]).toContain('COALESCE(sol.employeeid, so.doctorid) as employeeid');
    expect(listQuery?.[0]).toContain('so.companyid');
    expect(listQuery?.[0]).toContain("COALESCE(NULLIF(NULLIF(so.unit, ''), 'services.form.unitPlaceholder'), pr.uomname) as unit");
    expect(listQuery?.[0]).toContain("COALESCE(NULLIF(sol.note, ''), so.notes) as note");
  });
});
