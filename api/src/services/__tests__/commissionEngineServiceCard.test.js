'use strict';

// INV-003C Wave 2: service-card-created earnings at FULL price (commissionEngine).
const {
  createEarningsForServiceCard,
  reverseServiceCardEarnings,
  isBracesService,
} = require('../commissionEngine');

/**
 * A SQL-routing runner mock: returns level config, walks the CTV chain, and records
 * INSERTs. `chain` maps partnerId -> referred_by_ctv_id (null = top).
 */
function makeRun({ config, chain }) {
  const inserts = [];
  const run = jest.fn(async (sql, params) => {
    if (/FROM dbo\.commission_level_config/.test(sql)) return config;
    if (/referred_by_ctv_id FROM dbo\.partners/.test(sql)) {
      const id = params[0];
      return [{ referred_by_ctv_id: chain[id] ?? null }];
    }
    if (/INSERT INTO dbo\.earnings/.test(sql)) {
      inserts.push(params);
      // params: [client_id, recipient, service_line_id, level, amount]
      return [{ id: 'e' + inserts.length, amount: params[4], level: params[3], recipient_partner_id: params[1] }];
    }
    if (/UPDATE dbo\.earnings/.test(sql)) {
      return [{ id: 'rev', amount: 100000, level: 0, recipient_partner_id: 'c0' }];
    }
    return [];
  });
  return { run, inserts };
}

const ACTIVE_3 = [
  { level: 0, share_percent: 10, enabled: true },
  { level: 1, share_percent: 5, enabled: true },
  { level: 2, share_percent: 2, enabled: true },
];

describe('createEarningsForServiceCard — INV-003C full-price, service-card-created', () => {
  test('creates pending earnings per level on the FULL service price (not paid amount)', async () => {
    const { run, inserts } = makeRun({ config: ACTIVE_3, chain: { c0: 'c1', c1: 'c2', c2: null } });

    const created = await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli' },
      run,
    });

    expect(created).toHaveLength(3);
    // Amounts are % of the FULL 1,000,000 price: 10% / 5% / 2%.
    expect(inserts.map((p) => p[4])).toEqual([100000, 50000, 20000]);
    // recipients are level 0 (the attached CTV) then uplines.
    expect(inserts.map((p) => p[1])).toEqual(['c0', 'c1', 'c2']);
    // levels stamped 0,1,2.
    expect(inserts.map((p) => p[3])).toEqual([0, 1, 2]);
    // client + service line FK carried through.
    expect(inserts[0][0]).toBe('cli');
    expect(inserts[0][2]).toBe('L1');
  });

  test('creates NO earnings when the service card has no attached CTV', async () => {
    const { run, inserts } = makeRun({ config: ACTIVE_3, chain: {} });
    const created = await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: null, price: 1_000_000, client_id: 'cli' },
      run,
    });
    expect(created).toEqual([]);
    expect(inserts).toHaveLength(0);
  });

  test('creates NO earnings when price is zero or missing', async () => {
    const { run, inserts } = makeRun({ config: ACTIVE_3, chain: { c0: null } });
    const created = await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 0, client_id: 'cli' },
      run,
    });
    expect(created).toEqual([]);
    expect(inserts).toHaveLength(0);
  });

  test('disabled/missing levels earn nothing and are NOT redistributed to lower levels', async () => {
    const config = [
      { level: 0, share_percent: 10, enabled: true },
      { level: 1, share_percent: 5, enabled: false }, // disabled upline
      { level: 2, share_percent: 2, enabled: true },
    ];
    const { run, inserts } = makeRun({ config, chain: { c0: 'c1', c1: 'c2', c2: null } });

    const created = await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli' },
      run,
    });

    // Level 1 disabled → c1 earns nothing; its 5% stays with the company (not given to c0/c2).
    expect(created).toHaveLength(2);
    expect(inserts.map((p) => [p[1], p[3], p[4]])).toEqual([
      ['c0', 0, 100000],
      ['c2', 2, 20000],
    ]);
  });

  test('does not pay a cycle twice (cycle-guarded chain walk)', async () => {
    // c0 -> c1 -> c0 (corrupt back-edge). Walk must stop, not re-emit c0.
    const { run, inserts } = makeRun({ config: ACTIVE_3, chain: { c0: 'c1', c1: 'c0' } });
    const created = await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli' },
      run,
    });
    expect(created).toHaveLength(2); // c0 (level0) + c1 (level1), then stop on the cycle
    expect(inserts.map((p) => p[1])).toEqual(['c0', 'c1']);
  });
});

describe('§5 Braces override (Wave 5)', () => {
  afterEach(() => { delete process.env.BRACES_OVERRIDE_ENABLED; });

  test('isBracesService detects by category and by name (incl. Vietnamese)', () => {
    expect(isBracesService('X', 'Braces')).toBe(true);
    expect(isBracesService('X', 'Orthodontics')).toBe(true);
    expect(isBracesService('Niềng răng mắc cài', null)).toBe(true);
    expect(isBracesService('Braces package', null)).toBe(true);
    // Real NK3 data: product name omits the full phrase but the VN category is "Niềng răng".
    expect(isBracesService('Niềng Mắc Cài Kim Loại Tự Buộc 3M', 'Niềng răng')).toBe(true);
    expect(isBracesService('Teeth cleaning', 'Hygiene')).toBe(false);
  });

  function makeBracesRun({ standard, braces, chain }) {
    const inserts = [];
    const run = jest.fn(async (sql, params) => {
      if (/FROM dbo\.braces_commission_level_config/.test(sql)) return braces;
      if (/FROM dbo\.commission_level_config/.test(sql)) return standard;
      if (/referred_by_ctv_id FROM dbo\.partners/.test(sql)) return [{ referred_by_ctv_id: chain[params[0]] ?? null }];
      if (/INSERT INTO dbo\.earnings/.test(sql)) { inserts.push(params); return [{ id: 'e' + inserts.length, amount: params[4], level: params[3], recipient_partner_id: params[1] }]; }
      return [];
    });
    return { run, inserts };
  }

  test('a DENTAL braces service uses the BRACES tier rate (30% L0), not the standard 10%', async () => {
    process.env.BRACES_OVERRIDE_ENABLED = 'true';
    const { run, inserts } = makeBracesRun({
      standard: [{ level: 0, share_percent: 10, enabled: true }],
      braces: [{ level: 0, share_percent: 30, enabled: true }],
      chain: { c0: null },
    });
    await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli', productName: 'Niềng răng mắc cài', categoryName: 'Braces' },
      lob: 'dental',
      run,
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0][4]).toBe(300000); // 30% of full price, from the braces table
  });

  test('a COSMETIC braces-named service uses the STANDARD tier (braces override is Dental-only)', async () => {
    process.env.BRACES_OVERRIDE_ENABLED = 'true';
    const { run, inserts } = makeBracesRun({
      standard: [{ level: 0, share_percent: 10, enabled: true }],
      braces: [{ level: 0, share_percent: 30, enabled: true }],
      chain: { c0: null },
    });
    await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli', productName: 'Braces', categoryName: 'Braces' },
      lob: 'cosmetic',
      run,
    });
    expect(inserts[0][4]).toBe(100000); // standard 10%, NOT braces
  });

  test('with the flag OFF, a braces service uses the standard tier', async () => {
    const { run, inserts } = makeBracesRun({
      standard: [{ level: 0, share_percent: 10, enabled: true }],
      braces: [{ level: 0, share_percent: 30, enabled: true }],
      chain: { c0: null },
    });
    await createEarningsForServiceCard({
      serviceLine: { id: 'L1', ctv_id: 'c0', price: 1_000_000, client_id: 'cli', productName: 'Braces', categoryName: 'Braces' },
      lob: 'dental',
      run,
    });
    expect(inserts[0][4]).toBe(100000); // standard
  });
});

describe('reverseServiceCardEarnings — reverse pending service-card earnings before payout', () => {
  test('marks pending unpaid service-card earnings as reversed', async () => {
    const { run } = makeRun({ config: ACTIVE_3, chain: {} });
    const reversed = await reverseServiceCardEarnings({ serviceLineId: 'L1', run });
    expect(reversed).toHaveLength(1);
    const updateCall = run.mock.calls.find(([sql]) => /UPDATE dbo\.earnings/.test(sql));
    expect(updateCall[0]).toMatch(/status = 'reversed'/);
    // Only pending + unpaid (payment_id IS NULL) rows are touched — paid-out stays locked.
    expect(updateCall[0]).toMatch(/payment_id IS NULL/);
    expect(updateCall[0]).toMatch(/status = 'pending'/);
    expect(updateCall[1]).toEqual(['L1']);
  });

  test('no-op for a missing service line id', async () => {
    const { run } = makeRun({ config: ACTIVE_3, chain: {} });
    const reversed = await reverseServiceCardEarnings({ serviceLineId: null, run });
    expect(reversed).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });
});
