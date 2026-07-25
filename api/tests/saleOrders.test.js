process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (work) => {
    const { query } = require('../src/db');
    return work(query);
  }),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('PATCH /api/SaleOrders/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mirrors edited doctor and assistant onto the primary service line', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) {
        return [{ mode: 'disabled' }];
      }
      if (sql.includes('ip_access_entries')) {
        return [];
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
          doctorid: 'doctor-new',
          assistantid: 'assistant-new',
          amounttotal: '1000000',
          residual: '1000000',
          totalpaid: '0',
          state: 'sale',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .patch('/api/SaleOrders/order-id')
      .send({ doctorid: 'doctor-new', assistantid: 'assistant-new' });

    expect(res.status).toBe(200);

    const lineUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorderlines'));
    expect(lineUpdate?.[0]).toContain('employeeid');
    expect(lineUpdate?.[0]).toContain('assistantid');
    expect(lineUpdate?.[1]).toEqual(expect.arrayContaining(['doctor-new', 'assistant-new', 'line-id']));
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

  it('caps overallocated imported allocation rows to the posted payment amount', async () => {
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
          amountpaid: '15400000.00',
          paid_amount: '15400000.00',
          order_line_count: '1',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .get('/api/SaleOrders/lines')
      .query({ partner_id: 'customer-id' });

    expect(res.status).toBe(200);
    expect(res.body.items[0].paid_amount).toBe('15400000.00');

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN products pr ON pr.id = sol.productid'));
    expect(listQuery?.[0]).toContain('invoice_allocated * payment_amount / total_allocated_for_payment');
    expect(listQuery?.[0]).toContain('SUM(SUM(pa.allocated_amount)) OVER (PARTITION BY pa.payment_id)');
    expect(listQuery?.[0]).toContain("COALESCE(p.payment_category, 'payment') = 'payment'");
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

  it('returns the dental aide name from the sale order when dentalaideid is set', async () => {
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
          dentalaideid: 'dental-aide-id',
          dentalaidename: 'BÙI NGỌC TÚ QUYÊN',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .get('/api/SaleOrders/lines')
      .query({ partner_id: 'customer-id' });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      dentalaideid: 'dental-aide-id',
      dentalaidename: 'BÙI NGỌC TÚ QUYÊN',
    });

    const listQuery = query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN products pr ON pr.id = sol.productid'));
    expect(listQuery?.[0]).toContain('so.dentalaideid');
    expect(listQuery?.[0]).toContain('da.name as dentalaidename');
    expect(listQuery?.[0]).toContain('LEFT JOIN employees da ON da.id = so.dentalaideid');
  });
});

describe('SaleOrders source semantics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockIpDisabled(sql) {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    return null;
  }

  it('GET list exposes direct order source and customer source separately (no COALESCE into sourceid)', async () => {
    query.mockImplementation(async (sql) => {
      const ip = mockIpDisabled(sql);
      if (ip) return ip;
      if (sql.includes('COUNT(*) AS count') || sql.includes('COUNT(*) as count')) {
        return [{ count: '1' }];
      }
      if (sql.includes('FROM saleorders so')) {
        return [{
          id: 'order-1',
          sourceid: null,
          sourcename: null,
          customersourceid: 'cust-src',
          customersourcename: 'Facebook',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).get('/api/SaleOrders');
    expect(res.status).toBe(200);

    const listSql = query.mock.calls.find(([sql]) =>
      sql.includes('FROM saleorders so') && sql.includes('sourceid'),
    )?.[0];
    expect(listSql).toContain('so.sourceid AS sourceid');
    expect(listSql).toContain('p.sourceid AS customersourceid');
    expect(listSql).not.toMatch(/COALESCE\s*\(\s*so\.sourceid\s*,\s*p\.sourceid\s*\)/i);
    expect(res.body.items[0]).toMatchObject({
      sourceid: null,
      customersourceid: 'cust-src',
      customersourcename: 'Facebook',
    });
  });

  it('POST snapshots customer source when body omits sourceid', async () => {
    query.mockImplementation(async (sql) => {
      const ip = mockIpDisabled(sql);
      if (ip) return ip;
      if (sql.includes("nextval('dbo.saleorder_code_seq')")) {
        return [{ seq: '42' }];
      }
      if (sql.includes('SELECT sourceid FROM partners')) {
        return [{ sourceid: 'snap-source' }];
      }
      if (sql.includes('FROM dbo.customersources cs')) {
        return [{ is_active: true, already_selected: false }];
      }
      if (sql.startsWith('INSERT INTO saleorders')) {
        return [{ id: 'new-order' }];
      }
      if (sql.includes('FROM saleorders so') && sql.includes('WHERE so.id')) {
        return [{
          id: 'new-order',
          sourceid: 'snap-source',
          sourcename: 'Hotline',
          customersourceid: 'snap-source',
          customersourcename: 'Hotline',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post('/api/SaleOrders')
      .send({ partnerid: 'partner-1', amounttotal: 1000, productname: 'Implant' });

    expect(res.status).toBe(201);
    const insert = query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO saleorders'));
    expect(insert?.[1]).toEqual(expect.arrayContaining(['snap-source']));
    expect(res.body.sourceid).toBe('snap-source');
  });

  it('POST keeps explicit sourceid and does not overwrite with customer source', async () => {
    query.mockImplementation(async (sql) => {
      const ip = mockIpDisabled(sql);
      if (ip) return ip;
      if (sql.includes("nextval('dbo.saleorder_code_seq')")) {
        return [{ seq: '43' }];
      }
      if (sql.includes('FROM dbo.customersources cs')) {
        return [{ is_active: true, already_selected: false }];
      }
      if (sql.startsWith('INSERT INTO saleorders')) {
        return [{ id: 'new-order-2' }];
      }
      if (sql.includes('FROM saleorders so') && sql.includes('WHERE so.id')) {
        return [{
          id: 'new-order-2',
          sourceid: 'order-src',
          sourcename: 'Sale Online',
          customersourceid: 'cust-src',
          customersourcename: 'Facebook',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .post('/api/SaleOrders')
      .send({
        partnerid: 'partner-1',
        amounttotal: 1000,
        sourceid: 'order-src',
        productname: 'Niềng',
      });

    expect(res.status).toBe(201);
    expect(query.mock.calls.some(([sql]) => sql.includes('SELECT sourceid FROM partners'))).toBe(false);
    const insert = query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO saleorders'));
    expect(insert?.[1]).toEqual(expect.arrayContaining(['order-src']));
  });

  it('PATCH with only non-source fields does not write sourceid', async () => {
    query.mockImplementation(async (sql) => {
      const ip = mockIpDisabled(sql);
      if (ip) return ip;
      if (sql.startsWith('UPDATE saleorders')) {
        return [{ id: 'order-id' }];
      }
      if (sql.includes('FROM saleorders so')) {
        return [{ id: 'order-id', notes: 'updated', sourceid: null }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .patch('/api/SaleOrders/order-id')
      .send({ notes: 'updated' });

    expect(res.status).toBe(200);
    const orderUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorders'));
    expect(orderUpdate?.[0]).toContain('notes');
    expect(orderUpdate?.[0]).not.toContain('sourceid');
  });

  it('PATCH clears only the direct source on an open order (never inherits customer source)', async () => {
    query.mockImplementation(async (sql) => {
      const ip = mockIpDisabled(sql);
      if (ip) return ip;
      if (sql.includes('so.sourceid AS order_sourceid')) {
        return [{
          id: 'order-id',
          order_sourceid: 'order-src',
          totalpaid: '0',
          datestart: new Date().toISOString().slice(0, 10),
          datecreated: new Date().toISOString(),
          isdeleted: false,
        }];
      }
      if (sql.includes('FROM payment_allocations pa')) {
        return [{ totalpaid: '0' }];
      }
      if (sql.startsWith('UPDATE saleorders')) {
        return [{ id: 'order-id', sourceid: null }];
      }
      if (sql.includes('FROM saleorders so')) {
        return [{
          id: 'order-id',
          sourceid: null,
          sourcename: null,
          customersourceid: 'cust-src',
          customersourcename: 'Facebook',
        }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .patch('/api/SaleOrders/order-id')
      .send({ sourceid: null });

    expect(res.status).toBe(200);
    const orderUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorders'));
    expect(orderUpdate?.[0]).toContain('sourceid');
    expect(orderUpdate?.[1]).toEqual(expect.arrayContaining([null, 'order-id']));
    expect(res.body.sourceid).toBeNull();
    expect(res.body.customersourceid).toBe('cust-src');
  });
});
