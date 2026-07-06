'use strict';

// Locks the canonical revenue formula against drift.
// If this test ever fails, either:
//   (a) the Excel revenue-flat export's SQL changed → update this test to match, OR
//   (b) canonicalRevenue.js drifted → fix it back to mirror the export.
// Either way, on-screen reports MUST match the Excel total the clinic owner reconciles against.

jest.mock('../../../db', () => ({
  query: jest.fn().mockResolvedValue([{ total: '0', revenue: '0' }]),
}));

const { query } = require('../../../db');
const {
  getCanonicalRevenue,
  getCanonicalRevenueByMonth,
  getCanonicalRevenueByDoctor,
  getCanonicalRevenueByLocation,
} = require('../canonicalRevenue');

const EXCEL_FILTERS = [
  "p.status = 'posted'",
  'pa.invoice_id IS NOT NULL',
  "COALESCE(p.payment_category, 'payment') = 'payment'",
  "COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')",
  'COALESCE(so.isdeleted, false) = false',
];

const EXCEL_JOINS = [
  'FROM dbo.payment_allocations pa',
  'JOIN dbo.payments p ON p.id = pa.payment_id',
  'JOIN dbo.saleorders so ON so.id = pa.invoice_id',
];

const EXCEL_CAP_EXPR = 'pa.allocated_amount * p.amount / at.total_allocated_for_payment';

describe('canonicalRevenue — mirrors Excel revenue-flat export', () => {
  beforeEach(() => {
    query.mockClear();
  });

  function lastSql() {
    return query.mock.calls[query.mock.calls.length - 1][0];
  }

  function lastParams() {
    return query.mock.calls[query.mock.calls.length - 1][1];
  }

  test.each([
    ['getCanonicalRevenue', getCanonicalRevenue],
    ['getCanonicalRevenueByMonth', getCanonicalRevenueByMonth],
    ['getCanonicalRevenueByDoctor', getCanonicalRevenueByDoctor],
    ['getCanonicalRevenueByLocation', getCanonicalRevenueByLocation],
  ])('%s uses the Excel canonical WHERE clause', async (_name, fn) => {
    await fn({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    const sql = lastSql();
    for (const filter of EXCEL_FILTERS) {
      expect(sql).toContain(filter);
    }
  });

  test.each([
    ['getCanonicalRevenue', getCanonicalRevenue],
    ['getCanonicalRevenueByMonth', getCanonicalRevenueByMonth],
    ['getCanonicalRevenueByDoctor', getCanonicalRevenueByDoctor],
    ['getCanonicalRevenueByLocation', getCanonicalRevenueByLocation],
  ])('%s uses the Excel JOIN topology and capping expression', async (_name, fn) => {
    await fn({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    const sql = lastSql();
    for (const join of EXCEL_JOINS) {
      expect(sql).toContain(join);
    }
    expect(sql).toContain(EXCEL_CAP_EXPR);
    expect(sql).toContain('allocation_totals AS');
  });

  test.each([
    ['getCanonicalRevenue', getCanonicalRevenue],
    ['getCanonicalRevenueByMonth', getCanonicalRevenueByMonth],
    ['getCanonicalRevenueByDoctor', getCanonicalRevenueByDoctor],
    ['getCanonicalRevenueByLocation', getCanonicalRevenueByLocation],
  ])('%s filters on payment date (not order creation date)', async (_name, fn) => {
    await fn({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    const sql = lastSql();
    expect(sql).toContain('COALESCE(p.payment_date, p.created_at)');
    expect(sql).not.toMatch(/datecreated/i);
  });

  test('passes date params positionally', async () => {
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30']);
  });

  test('appends companyId param when provided', async () => {
    const cid = '765f6593-2b19-4d06-cc8c-08dc4d479451';
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', companyId: cid });
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30', cid]);
    expect(lastSql()).toContain('so.companyid =');
  });

  test('filters by ANY(uuid[]) when companyId is an array (multi-location scope)', async () => {
    const ids = ['765f6593-2b19-4d06-cc8c-08dc4d479451', '9a2c1f10-1111-4111-8111-08dc4d479452'];
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', companyId: ids });
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30', ids]);
    expect(lastSql()).toContain('so.companyid = ANY(');
  });

  test('omits the company condition for an empty array companyId', async () => {
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', companyId: [] });
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30']);
    expect(lastSql()).not.toContain('so.companyid');
  });

  test('applies investor customer allowlist via so.partnerid when allowedCustomerIds is provided', async () => {
    const allowed = ['aaaaaaaa-1111-4111-8111-000000000001', 'bbbbbbbb-2222-4222-8222-000000000002'];
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', allowedCustomerIds: allowed });
    expect(lastSql()).toContain('so.partnerid = ANY(');
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30', allowed]);
  });

  test('applies investor customer allowlist to getCanonicalRevenueByDoctor', async () => {
    const allowed = ['aaaaaaaa-1111-4111-8111-000000000001'];
    await getCanonicalRevenueByDoctor({ dateFrom: '2026-04-01', dateTo: '2026-04-30', allowedCustomerIds: allowed });
    expect(lastSql()).toContain('so.partnerid = ANY(');
    expect(lastParams()).toContainEqual(allowed);
  });

  test('applies investor customer allowlist to getCanonicalRevenueByLocation', async () => {
    const allowed = ['aaaaaaaa-1111-4111-8111-000000000001'];
    await getCanonicalRevenueByLocation({ dateFrom: '2026-04-01', dateTo: '2026-04-30', allowedCustomerIds: allowed });
    expect(lastSql()).toContain('so.partnerid = ANY(');
    expect(lastParams()).toContainEqual(allowed);
  });

  test('applies investor customer allowlist to getCanonicalRevenueByMonth', async () => {
    const allowed = ['aaaaaaaa-1111-4111-8111-000000000001'];
    await getCanonicalRevenueByMonth({ dateFrom: '2026-04-01', dateTo: '2026-04-30', allowedCustomerIds: allowed });
    expect(lastSql()).toContain('so.partnerid = ANY(');
    expect(lastParams()).toContainEqual(allowed);
  });

  test('omits the customer allowlist condition when allowedCustomerIds is empty or absent', async () => {
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', allowedCustomerIds: [] });
    expect(lastSql()).not.toContain('so.partnerid');
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30']);
  });

  test('combines companyId array scope and investor allowlist correctly (multi-param ordering)', async () => {
    const locs = ['loc-1111-4111-8111-000000000001'];
    const allowed = ['cust-1111-4111-8111-000000000002'];
    await getCanonicalRevenue({ dateFrom: '2026-04-01', dateTo: '2026-04-30', companyId: locs, allowedCustomerIds: allowed });
    expect(lastSql()).toContain('so.companyid = ANY(');
    expect(lastSql()).toContain('so.partnerid = ANY(');
    expect(lastParams()).toEqual(['2026-04-01', '2026-04-30', locs, allowed]);
  });

  test('omits date filters when not provided', async () => {
    await getCanonicalRevenue({});
    expect(lastParams()).toEqual([]);
    expect(lastSql()).not.toContain('COALESCE(p.payment_date, p.created_at)::date >=');
  });

  test('getCanonicalRevenueByDoctor groups by saleorder.doctorid (matches Excel attribution)', async () => {
    await getCanonicalRevenueByDoctor({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    const sql = lastSql();
    expect(sql).toContain('so.doctorid');
    expect(sql).toContain('GROUP BY so.doctorid');
  });

  test('getCanonicalRevenueByLocation groups by saleorder.companyid (matches Excel attribution)', async () => {
    await getCanonicalRevenueByLocation({ dateFrom: '2026-04-01', dateTo: '2026-04-30' });
    const sql = lastSql();
    expect(sql).toContain('so.companyid');
    expect(sql).toContain('GROUP BY so.companyid');
  });

  test('getCanonicalRevenueByMonth uses payment date for the month bucket (not order creation)', async () => {
    await getCanonicalRevenueByMonth({ dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    const sql = lastSql();
    expect(sql).toMatch(/DATE_TRUNC\('month',\s*COALESCE\(p\.payment_date,\s*p\.created_at\)\)/);
  });
});
