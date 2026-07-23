const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '../..');
const repairDir = path.join(repoRoot, 'scripts/data-repairs');
const targetsPath = path.join(repairDir, '20260723_q10_customer_source_targets.inc.sql');
const applyPath = path.join(repairDir, '20260723_q10_customer_source_apply.sql');
const rollbackPath = path.join(repairDir, '20260723_q10_customer_source_rollback.sql');

describe('confirmed Q10 43-order source-repair artifacts', () => {
  const targets = fs.readFileSync(targetsPath, 'utf8');
  const apply = fs.readFileSync(applyPath, 'utf8');
  const rollback = fs.readFileSync(rollbackPath, 'utf8');

  it('keeps the executed manifest fixed at the 43 explicitly confirmed orders', () => {
    const rows = [...targets.matchAll(
      /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g,
    )].map((match) => ({
      code: match[1],
      customerRef: match[2],
      expectedSource: match[3],
      reviewedCurrentSource: match[4],
    }));
    const orderCodes = rows.map((row) => row.code);
    const countBy = (field) => rows.reduce((counts, row) => ({
      ...counts,
      [row[field]]: (counts[row[field]] || 0) + 1,
    }), {});

    expect(orderCodes).toHaveLength(43);
    expect(new Set(orderCodes).size).toBe(43);
    expect(orderCodes).not.toContain('SO-2026-5176');
    expect(countBy('expectedSource')).toEqual({
      'Giới thiệu': 21,
      'Khách cũ': 16,
      'Khách hàng giới thiệu': 4,
      Hotline: 2,
    });
    expect(countBy('reviewedCurrentSource')).toEqual({
      'Sale Online': 41,
      'Khách hàng giới thiệu': 2,
    });
    expect(crypto.createHash('sha256').update(targets).digest('hex')).toBe(
      '2ebc1c1fe38dec59cdeb946c16c6d39bee61994d2426fc94fe5803e36cf1bbb3',
    );
  });

  it('requires the exact apply and rollback confirmation tokens', () => {
    expect(apply).toContain("'APPLY-Q10-43-ORDERS'");
    expect(apply).toContain('expected exactly 43 updates');
    expect(rollback).toContain("'ROLLBACK-Q10-43-ORDERS'");
    expect(rollback).toContain('expected exactly 43 restores');
  });

  it('limits mutations to sale-order source attribution and repair audit state', () => {
    const protectedTableDml = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|TRUNCATE(?:\s+TABLE)?|DROP\s+TABLE)\s+dbo\.(?:partners|payments)\b/i;
    const forbiddenSaleOrderDml = /(?:INSERT\s+INTO|DELETE\s+FROM|ALTER\s+TABLE|TRUNCATE(?:\s+TABLE)?|DROP\s+TABLE)\s+dbo\.saleorders\b/i;

    expect(apply).not.toMatch(protectedTableDml);
    expect(apply).toMatch(/UPDATE\s+dbo\.saleorders\b/i);
    expect(apply).not.toMatch(forbiddenSaleOrderDml);
    expect(rollback).not.toMatch(protectedTableDml);
    expect(rollback).not.toMatch(forbiddenSaleOrderDml);
    expect(crypto.createHash('sha256').update(apply).digest('hex')).toBe(
      '09ce36c72271ce0c24bb723a05ca0959ef45efaba401b1795d7ad1bd667a9070',
    );
    expect(crypto.createHash('sha256').update(rollback).digest('hex')).toBe(
      '64f13259af873bf3aa69c5b681caefaa29ebc9860362fa977a08bb2aa8f3866c',
    );
  });
});
