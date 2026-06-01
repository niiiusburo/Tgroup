'use strict';

/**
 * newClientsQuery — admin "New Clients" list (referral-only leads).
 * The SQL predicate (referred_by_ctv_id set, no priced saleorderline, no payment) is
 * validated live against the real schema; these tests cover the cross-LOB JS aggregation:
 * per-LOB tagging, dedup by id, date-desc sort, single-LOB scoping, and date-filter params.
 */

// Per-LOB canned data + a recording of the SQL/params each pool received.
let dentalRows = [];
let cosmeticRows = [];
let dentalCount = 0;
let cosmeticCount = 0;
const calls = { dental: [], cosmetic: [] };

function makePool(lob) {
  return {
    queryRows: jest.fn(async (sql, params = []) => {
      calls[lob].push({ sql, params });
      if (/COUNT\(\*\)/.test(sql)) {
        return [{ count: String(lob === 'dental' ? dentalCount : cosmeticCount) }];
      }
      return lob === 'dental' ? dentalRows : cosmeticRows;
    }),
  };
}

jest.mock('../../db', () => ({
  getDb: (lob) => mockGetPool(lob),
}));

// Stable pool instances per lob so jest.fn call records persist across listForLob.
// `mock`-prefixed so the jest.mock factory may reference it (jest hoisting rule).
const mockPools = {};
function mockGetPool(lob) {
  if (!mockPools[lob]) mockPools[lob] = makePool(lob);
  return mockPools[lob];
}
const _pools = mockPools;

const { listNewClients } = require('../newClientsQuery');

function row(id, lob, referredAt, extra = {}) {
  return {
    id,
    name: `Client ${id}`,
    phone: `090000${id}`,
    email: `${id}@ex.vn`,
    referred_at: referredAt,
    referred_by_ctv_id: 'ctv-1',
    referring_ctv_name: 'CTV One',
    referring_ctv_phone: '0911',
    ...extra,
  };
}

beforeEach(() => {
  dentalRows = [];
  cosmeticRows = [];
  dentalCount = 0;
  cosmeticCount = 0;
  calls.dental = [];
  calls.cosmetic = [];
  _pools.dental && _pools.dental.queryRows.mockClear();
  _pools.cosmetic && _pools.cosmetic.queryRows.mockClear();
});

describe('listNewClients — cross-LOB aggregation', () => {
  test('lob=all spans both DBs and tags each row with its LOB', async () => {
    dentalRows = [row('d1', 'dental', '2026-05-10T00:00:00Z')];
    cosmeticRows = [row('c1', 'cosmetic', '2026-05-11T00:00:00Z')];
    dentalCount = 1;
    cosmeticCount = 1;

    const res = await listNewClients({ lob: 'all', limit: 100 });

    expect(res.totalItems).toBe(2);
    expect(res.items).toHaveLength(2);
    const byId = Object.fromEntries(res.items.map((r) => [r.id, r.lob]));
    expect(byId).toEqual({ d1: 'dental', c1: 'cosmetic' });
  });

  test('dedupes a client present in both DBs by id (keeps one)', async () => {
    dentalRows = [row('shared', 'dental', '2026-05-10T00:00:00Z')];
    cosmeticRows = [row('shared', 'cosmetic', '2026-05-10T00:00:00Z')];
    dentalCount = 1;
    cosmeticCount = 1;

    const res = await listNewClients({ lob: 'all', limit: 100 });

    expect(res.items.filter((r) => r.id === 'shared')).toHaveLength(1);
  });

  test('sorts merged results by referred_at descending', async () => {
    dentalRows = [row('old', 'dental', '2026-01-01T00:00:00Z')];
    cosmeticRows = [row('new', 'cosmetic', '2026-12-31T00:00:00Z')];
    dentalCount = 1;
    cosmeticCount = 1;

    const res = await listNewClients({ lob: 'all', limit: 100 });

    expect(res.items.map((r) => r.id)).toEqual(['new', 'old']);
  });

  test('shapes rows with phone + referring CTV fields for staff callbacks', async () => {
    dentalRows = [row('d1', 'dental', '2026-05-10T00:00:00Z')];
    dentalCount = 1;

    const res = await listNewClients({ lob: 'dental', limit: 100 });
    const r = res.items[0];
    expect(r).toMatchObject({
      id: 'd1',
      phone: '090000d1',
      referring_ctv_name: 'CTV One',
      referring_ctv_phone: '0911',
      lob: 'dental',
    });
  });
});

describe('listNewClients — LOB scoping & date filters', () => {
  test('lob=dental only queries the dental DB', async () => {
    dentalRows = [row('d1', 'dental', '2026-05-10T00:00:00Z')];
    dentalCount = 1;

    await listNewClients({ lob: 'dental', limit: 100 });

    expect(_pools.dental.queryRows).toHaveBeenCalled();
    expect(_pools.cosmetic.queryRows).not.toHaveBeenCalled();
  });

  test('date range is applied as datecreated::date params (VN-local, no TZ conversion)', async () => {
    dentalCount = 0;
    await listNewClients({ lob: 'dental', dateFrom: '2026-05-01', dateTo: '2026-05-31', limit: 100 });

    const listSql = calls.dental.find((c) => !/COUNT\(\*\)/.test(c.sql));
    expect(listSql.sql).toMatch(/c\.datecreated::date >= \$1/);
    expect(listSql.sql).toMatch(/c\.datecreated::date <= \$2/);
    expect(listSql.params.slice(0, 2)).toEqual(['2026-05-01', '2026-05-31']);
    // No AT TIME ZONE conversion on the referral timestamp.
    expect(listSql.sql).not.toMatch(/AT TIME ZONE/);
  });

  test('predicate excludes CTVs, deleted, priced services and prior payments', async () => {
    dentalCount = 0;
    await listNewClients({ lob: 'dental', limit: 100 });

    const listSql = calls.dental.find((c) => !/COUNT\(\*\)/.test(c.sql)).sql;
    expect(listSql).toMatch(/referred_by_ctv_id IS NOT NULL/);
    expect(listSql).toMatch(/COALESCE\(c\.is_ctv, false\) = false/);
    expect(listSql).toMatch(/COALESCE\(c\.isdeleted, false\) = false/);
    expect(listSql).toMatch(/pricetotal, 0\) > 0/);
    expect(listSql).toMatch(/p\.amount > 0/);
  });
});
