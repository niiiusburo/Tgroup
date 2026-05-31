'use strict';

const { buildCtvHierarchy } = require('../ctvNetwork');

// Minimal CTV partner row as produced by the hierarchy source query.
const ctv = (id, ref = null) => ({
  id,
  name: id,
  phone: '',
  email: '',
  active: true,
  referred_by_ctv_id: ref,
  datecreated: '2026-01-01',
});

// commission_level_config rows (subset) as returned from dbo.commission_level_config.
const CONFIG = [
  { level: 0, share_percent: '72.7', enabled: true },
  { level: 1, share_percent: '14.5', enabled: true },
  { level: 2, share_percent: '7.3', enabled: true },
  { level: 3, share_percent: '3.6', enabled: true },
  { level: 4, share_percent: '1.8', enabled: true },
];

describe('buildCtvHierarchy — downline earnings rollup + projected override', () => {
  test('rolls up direct (L1) downline earnings at the configured L1 share', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A'), ctv('C', 'A')],
      cosmeticCtvs: [],
      dentalEarnings: [{ ctv_id: 'B', amount: '1000' }, { ctv_id: 'C', amount: '2000' }],
      cosmeticEarnings: [],
      levelConfig: CONFIG,
    });
    expect(res.totals.downlineCount).toBe(2);
    expect(res.totals.downlineEarningsBase).toBe(3000);
    expect(res.totals.potentialOverride).toBe(Math.round(3000 * 0.145)); // 435
    expect(res.totals.overrideRatePct).toBeCloseTo(14.5, 1);
  });

  test('applies the per-depth share for a level-2 downline member', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A'), ctv('D', 'B')], // A → B (L1) → D (L2)
      cosmeticCtvs: [],
      dentalEarnings: [{ ctv_id: 'B', amount: '1000' }, { ctv_id: 'D', amount: '1000' }],
      cosmeticEarnings: [],
      levelConfig: CONFIG,
    });
    expect(res.totals.downlineCount).toBe(2);
    expect(res.totals.downlineEarningsBase).toBe(2000);
    // B earns 14.5% override, D earns 7.3% override.
    expect(res.totals.potentialOverride).toBe(Math.round(1000 * 0.145 + 1000 * 0.073)); // 218
  });

  test('falls back to STANDARD_OVERRIDE_SHARES when no levelConfig is provided', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A')],
      dentalEarnings: [{ ctv_id: 'B', amount: '1000' }],
    });
    expect(res.totals.potentialOverride).toBe(145); // 14.5% fallback
  });

  test('a disabled level contributes zero override', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A')],
      dentalEarnings: [{ ctv_id: 'B', amount: '1000' }],
      levelConfig: [{ level: 1, share_percent: '14.5', enabled: false }],
    });
    expect(res.totals.downlineEarningsBase).toBe(1000);
    expect(res.totals.potentialOverride).toBe(0);
  });

  test('zero downline yields a zeroed rollup', () => {
    const res = buildCtvHierarchy({ ctvId: 'A', dentalCtvs: [ctv('A')], levelConfig: CONFIG });
    expect(res.totals.downlineCount).toBe(0);
    expect(res.totals.downlineEarningsBase).toBe(0);
    expect(res.totals.potentialOverride).toBe(0);
  });

  test('overrideRatePct falls back to the L1 rate when the downline has not earned yet', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A')],
      dentalEarnings: [],
      levelConfig: CONFIG,
    });
    expect(res.totals.downlineCount).toBe(1);
    expect(res.totals.downlineEarningsBase).toBe(0);
    expect(res.totals.potentialOverride).toBe(0);
    expect(res.totals.overrideRatePct).toBeCloseTo(14.5, 1); // indicative direct-downline rate
  });

  test('each downline node carries its own earned + override contribution', () => {
    const res = buildCtvHierarchy({
      ctvId: 'A',
      dentalCtvs: [ctv('A'), ctv('B', 'A'), ctv('D', 'B')], // A → B (L1) → D (L2)
      cosmeticCtvs: [],
      dentalEarnings: [{ ctv_id: 'B', amount: '1000' }, { ctv_id: 'D', amount: '500' }],
      cosmeticEarnings: [],
      levelConfig: CONFIG,
    });
    const byId = Object.fromEntries(res.downline.map((n) => [n.id, n]));
    expect(byId.B.earned).toBe(1000);
    expect(byId.B.overrideContribution).toBe(Math.round(1000 * 0.145)); // L1 14.5% → 145
    expect(byId.D.earned).toBe(500);
    expect(byId.D.overrideContribution).toBe(Math.round(500 * 0.073)); // L2 7.3% → 37
    // Per-node contributions sum to the rolled-up total.
    const sum = res.downline.reduce((acc, n) => acc + (n.overrideContribution || 0), 0);
    expect(sum).toBe(res.totals.potentialOverride);
  });

  test('an unknown ctv (not in source) returns a safe zeroed shape', () => {
    const res = buildCtvHierarchy({ ctvId: 'ZZZ', dentalCtvs: [ctv('A')], levelConfig: CONFIG });
    expect(res.totals.downlineEarningsBase).toBe(0);
    expect(res.totals.potentialOverride).toBe(0);
    expect(res.totals.overrideRatePct).toBe(0);
  });
});
