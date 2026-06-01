'use strict';

/**
 * commissionEngine v3 — per-service CTV commission.
 * Levels (commission_level_config) applied directly to the PAID amount; level 0 = the CTV
 * attached to the service, levels 1..N = the upline chain. Cycle-guarded, idempotent,
 * pay-as-paid. No product rate, no default_referral_percent, no consultation/salestaff.
 */

const engine = require('../commissionEngine');

// L0 33.33%, L1 14.5%, L2 7.3%, L3/L4 disabled.
const CONFIG = [
  { level: 0, share_percent: '33.33', enabled: true },
  { level: 1, share_percent: '14.5', enabled: true },
  { level: 2, share_percent: '7.3', enabled: true },
  { level: 3, share_percent: '3.6', enabled: false },
  { level: 4, share_percent: '1.8', enabled: false },
];

// Mock DB: queryRows dispatches by SQL. uplineById maps a CTV id -> its referred_by_ctv_id.
function makeDb({ config = CONFIG, uplineById = {} } = {}) {
  const inserts = [];
  const reversals = [];
  const queryRows = jest.fn(async (sql, params = []) => {
    if (/commission_level_config/.test(sql)) return config;
    if (/referred_by_ctv_id FROM dbo\.partners/.test(sql)) {
      return [{ referred_by_ctv_id: Object.prototype.hasOwnProperty.call(uplineById, params[0]) ? uplineById[params[0]] : null }];
    }
    if (/INSERT INTO dbo\.earnings/.test(sql)) {
      if (/amount < 0/.test(sql)) {
        reversals.push(params); // [client, recipient, refundId, line, source, level, amount]
        return [{ id: 'r' + reversals.length, amount: params[6], level: params[5], recipient_partner_id: params[1] }];
      }
      inserts.push(params); // [client, recipient, payment, line, level, amount]
      return [{ id: 'e' + inserts.length, amount: params[5], level: params[4], recipient_partner_id: params[1] }];
    }
    return [];
  });
  return { db: { queryRows }, inserts, reversals };
}

const getDbOf = (db) => () => db;

describe('_walkCtvChain — cycle-guarded upline walk', () => {
  test('walks L0..Ln up referred_by_ctv_id', async () => {
    const { db } = makeDb({ uplineById: { X: 'Y', Y: 'Z', Z: null } });
    const chain = await engine._walkCtvChain('X', 'dental', null, getDbOf(db));
    expect(chain).toEqual([
      { level: 0, partner_id: 'X' },
      { level: 1, partner_id: 'Y' },
      { level: 2, partner_id: 'Z' },
    ]);
  });

  test('stops at a referral cycle instead of looping/over-paying', async () => {
    const { db } = makeDb({ uplineById: { X: 'Y', Y: 'X' } }); // X<->Y back-edge
    const chain = await engine._walkCtvChain('X', 'dental', null, getDbOf(db));
    expect(chain).toEqual([
      { level: 0, partner_id: 'X' },
      { level: 1, partner_id: 'Y' },
    ]);
  });
});

describe('createEarningsForPayment — per-service levels on the paid amount', () => {
  const payment = { id: 'pay-1', customer_id: 'cust-1' };

  test('attached CTV + uplines each earn level% of the paid amount', async () => {
    const { db, inserts } = makeDb({ uplineById: { X: 'Y', Y: 'Z', Z: null } });
    const created = await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: 'X', amount: 6000000 }],
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(created).toHaveLength(3);
    const byRecipient = Object.fromEntries(inserts.map((p) => [p[1], { level: p[4], amount: p[5] }]));
    expect(byRecipient.X).toEqual({ level: 0, amount: 1999800 }); // 33.33%
    expect(byRecipient.Y).toEqual({ level: 1, amount: 870000 }); // 14.5%
    expect(byRecipient.Z).toEqual({ level: 2, amount: 438000 }); // 7.3%
  });

  test('a service with NO ctv_id earns nothing (explicit attribution only)', async () => {
    const { db, inserts } = makeDb({ uplineById: { X: 'Y' } });
    const created = await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: null, amount: 6000000 }],
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(created).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  test('pay-as-paid: commission is level% of the AMOUNT collected, not the full price', async () => {
    const { db, inserts } = makeDb({ uplineById: { X: null } });
    await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: 'X', amount: 2000000 }], // only 2M of a 6M service paid now
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0][5]).toBe(666600); // 33.33% × 2,000,000
  });

  test('disabled levels pay nothing and do not redistribute', async () => {
    const { db, inserts } = makeDb({ uplineById: { X: 'Y', Y: 'Z', Z: 'W', W: null } });
    await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: 'X', amount: 1000000 }],
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(inserts.map((p) => p[4]).sort()).toEqual([0, 1, 2]); // no level 3 (disabled)
  });

  test('a referral cycle does NOT over-pay (guarded walk)', async () => {
    const { db, inserts } = makeDb({ uplineById: { X: 'Y', Y: 'X' } });
    await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: 'X', amount: 1000000 }],
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(inserts.map((p) => p[1]).sort()).toEqual(['X', 'Y']); // each once
  });

  test('no level config → no commission', async () => {
    const { db, inserts } = makeDb({ config: [], uplineById: { X: null } });
    const created = await engine.createEarningsForPayment({
      payment,
      lines: [{ id: 'line-1', ctv_id: 'X', amount: 1000000 }],
      lob: 'cosmetic',
      getDb: getDbOf(db),
    });
    expect(created).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  test('forward insert is idempotent (NOT EXISTS per payment/line/recipient/level)', async () => {
    const { db } = makeDb({ uplineById: { X: null } });
    await engine.createEarningsForPayment({ payment, lines: [{ id: 'l', ctv_id: 'X', amount: 100 }], lob: 'cosmetic', getDb: getDbOf(db) });
    const insertSql = db.queryRows.mock.calls.map((c) => c[0]).find((s) => /INSERT INTO dbo\.earnings/.test(s) && !/amount < 0/.test(s));
    expect(insertSql).toMatch(/NOT EXISTS/);
    expect(insertSql).toMatch(/payment_id = \$3 AND service_line_id = \$4 AND recipient_partner_id = \$2 AND level = \$5/);
  });
});

describe('reverseOnRefund — level-preserving, idempotent reversal', () => {
  test('writes a negative reversal per positive original, preserving level', async () => {
    const reversals = [];
    const queryRows = jest.fn(async (sql, params = []) => {
      if (/FROM dbo\.earnings WHERE payment_id = \$1 AND amount > 0/.test(sql)) {
        return [
          { client_id: 'c', recipient_partner_id: 'X', service_line_id: 'l', source: 'ctv', level: 0, amount: '1999800' },
          { client_id: 'c', recipient_partner_id: 'Y', service_line_id: 'l', source: 'ctv', level: 1, amount: '870000' },
        ];
      }
      if (/INSERT INTO dbo\.earnings/.test(sql)) { reversals.push(params); return [{ id: 'r' + reversals.length }]; }
      return [];
    });
    const db = { queryRows };
    const out = await engine.reverseOnRefund({ originalPaymentId: 'pay-1', refundPayment: { id: 'ref-1' }, lob: 'cosmetic', getDb: () => db });
    expect(out).toHaveLength(2);
    expect(reversals[0][5]).toBe(0); // level preserved
    expect(reversals[0][6]).toBe(-1999800); // negated
    expect(reversals[1][5]).toBe(1);
    expect(reversals[1][6]).toBe(-870000);
    const revSql = queryRows.mock.calls.map((c) => c[0]).find((s) => /INSERT INTO dbo\.earnings/.test(s));
    expect(revSql).toMatch(/NOT EXISTS/);
    expect(revSql).toMatch(/amount < 0/);
  });
});
