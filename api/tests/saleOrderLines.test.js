jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
  requireAnyPermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('GET /api/SaleOrderLines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses sale order fallbacks for sparse service lines on the overview feed', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.includes('SELECT COUNT(*) AS count')) return [{ count: '1' }];
      if (sql.includes('COALESCE(SUM(COALESCE(NULLIF(sol.pricesubtotal, 0)')) {
        return [{ totalrevenue: '1500000', ordercount: '1', linecount: '1' }];
      }
      if (sql.includes('FROM saleorderlines sol') && sql.includes('ORDER BY')) {
        return [{
          id: 'line-id',
          date: '2026-05-09T09:15:00',
          name: null,
          state: 'sale',
          orderpartnerid: 'customer-id',
          partner_displayname: 'Nguyen Van A',
          partner_ref: 'T9001',
          partner_phone: '0901111222',
          orderid: 'order-id',
          order_name: 'SO-2026-0001',
          productid: 'product-id',
          product_name: 'Tay trang rang',
          employeeid: 'doctor-id',
          employee_name: 'Bac si Dat',
          companyid: 'location-id',
          company_name: 'District 1',
          productuomqty: '2',
          pricesubtotal: '1500000',
          pricetotal: '1500000',
          amountinvoiced: '1500000',
          amountresidual: '1500000',
          isactive: true,
        }];
      }
      throw new Error(`Unexpected query: ${sql} ${JSON.stringify(params)}`);
    });

    const res = await request(app)
      .get('/api/SaleOrderLines')
      .query({
        company_id: 'location-id',
        date_from: '2026-05-09',
        date_to: '2026-05-09T23:59:59',
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      orderPartnerId: 'customer-id',
      orderPartnerName: 'Nguyen Van A',
      orderPartnerCode: 'T9001',
      employeeId: 'doctor-id',
      companyId: 'location-id',
      companyName: 'District 1',
      productUOMQty: '2',
      priceTotal: '1500000',
    });

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('ORDER BY'));
    expect(listQuery?.[0]).toContain('COALESCE(sol.date, so.datestart::timestamp, so.datecreated)');
    expect(listQuery?.[0]).toContain('COALESCE(sol.companyid, so.companyid) = $1');
    expect(listQuery?.[0]).toContain('LEFT JOIN partners p ON p.id = COALESCE(sol.orderpartnerid, so.partnerid)');
    expect(listQuery?.[0]).toContain('LEFT JOIN companies co ON co.id = COALESCE(sol.companyid, so.companyid)');
    expect(listQuery?.[1]).toEqual(['location-id', '2026-05-09', '2026-05-09T23:59:59', 20, 0]);
  });
});

describe('DELETE /api/SaleOrderLines/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft-deletes the service line and keeps the parent order when active lines remain', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.startsWith('UPDATE saleorderlines')) return [{ id: 'line-id', orderid: 'order-id' }];
      if (sql.includes('COUNT(*) AS count')) return [{ count: '1' }];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id: 'line-id',
      orderId: 'order-id',
      deletedOrder: false,
    });
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE saleorders'))).toBe(false);
  });

  it('soft-deletes the parent order when the last active line is deleted', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.startsWith('UPDATE saleorderlines')) return [{ id: 'line-id', orderid: 'order-id' }];
      if (sql.includes('COUNT(*) AS count')) return [{ count: '0' }];
      if (sql.startsWith('UPDATE saleorders')) return [{ id: 'order-id' }];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body.deletedOrder).toBe(true);
    const orderUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorders'));
    expect(orderUpdate?.[1]).toEqual(['order-id']);
  });
});
