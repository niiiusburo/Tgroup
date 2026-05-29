'use strict';

const { setCustomerReferrer, clearCustomerReferrer, isUuid } = require('../customerReferrer');

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const CTV_ID = '22222222-2222-4222-8222-222222222222';

/**
 * Build a fake query fn that records calls. By default the CTV-existence SELECT finds the
 * CTV and the UPDATE ... RETURNING id touches one row. Pass { ctvExists:false } or
 * { customerExists:false } to simulate the respective no-op paths.
 */
function makeQuery(opts = {}) {
  const { ctvExists = true, customerExists = true } = opts;
  const calls = [];
  const q = async (sql, params) => {
    calls.push({ sql, params });
    if (/SELECT\s+1\s+FROM\s+partners/i.test(sql)) {
      return ctvExists ? [{ '?column?': 1 }] : [];
    }
    if (/UPDATE\s+partners/i.test(sql)) {
      return customerExists ? [{ id: params[1] }] : [];
    }
    return [];
  };
  q.calls = calls;
  return q;
}

describe('isUuid', () => {
  test('accepts a valid uuid (trimmed)', () => {
    expect(isUuid(CTV_ID)).toBe(true);
    expect(isUuid(`  ${CTV_ID}  `)).toBe(true);
  });

  test('rejects empty, null, and non-uuid strings', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

describe('setCustomerReferrer (assign-only, never clears)', () => {
  test('validates the CTV exists, then updates referred_by_ctv_id', async () => {
    const q = makeQuery();
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID);

    expect(result).toBe(true);
    expect(q.calls).toHaveLength(2);
    // 1) CTV existence check in the (LOB-bound) DB
    expect(q.calls[0].sql).toMatch(/SELECT\s+1\s+FROM\s+partners/i);
    expect(q.calls[0].sql).toMatch(/is_ctv\s*=\s*true/i);
    expect(q.calls[0].params).toEqual([CTV_ID]);
    // 2) the UPDATE
    expect(q.calls[1].sql).toMatch(/UPDATE partners/i);
    expect(q.calls[1].sql).toMatch(/referred_by_ctv_id\s*=\s*\$1/i);
    expect(q.calls[1].params).toEqual([CTV_ID, CUSTOMER_ID]);
  });

  test('is a NO-OP when the CTV does not exist / is not an active CTV in this LOB DB', async () => {
    const q = makeQuery({ ctvExists: false });
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID);
    expect(result).toBe(false);
    expect(q.calls).toHaveLength(1); // only the existence check ran; no UPDATE
    expect(q.calls[0].sql).toMatch(/SELECT\s+1\s+FROM\s+partners/i);
  });

  test('returns false when the customer row does not exist (UPDATE touched no rows)', async () => {
    const q = makeQuery({ customerExists: false });
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID);
    expect(result).toBe(false);
    expect(q.calls).toHaveLength(2);
  });

  test('trims a padded CTV id before writing', async () => {
    const q = makeQuery();
    await setCustomerReferrer(q, CUSTOMER_ID, `  ${CTV_ID}  `);
    expect(q.calls[0].params).toEqual([CTV_ID]);
    expect(q.calls[1].params).toEqual([CTV_ID, CUSTOMER_ID]);
  });

  test('is a NO-OP when ctvId is null (does not clear an existing referrer)', async () => {
    const q = makeQuery();
    const result = await setCustomerReferrer(q, CUSTOMER_ID, null);
    expect(result).toBe(false);
    expect(q.calls).toHaveLength(0);
  });

  test('is a NO-OP when ctvId is undefined or empty string', async () => {
    const q = makeQuery();
    expect(await setCustomerReferrer(q, CUSTOMER_ID, undefined)).toBe(false);
    expect(await setCustomerReferrer(q, CUSTOMER_ID, '')).toBe(false);
    expect(q.calls).toHaveLength(0);
  });

  test('is a NO-OP when ctvId is not a valid uuid', async () => {
    const q = makeQuery();
    expect(await setCustomerReferrer(q, CUSTOMER_ID, 'garbage')).toBe(false);
    expect(q.calls).toHaveLength(0);
  });

  test('is a NO-OP when customerId is missing/invalid', async () => {
    const q = makeQuery();
    expect(await setCustomerReferrer(q, null, CTV_ID)).toBe(false);
    expect(await setCustomerReferrer(q, 'nope', CTV_ID)).toBe(false);
    expect(q.calls).toHaveLength(0);
  });
});

describe('clearCustomerReferrer (explicit clear, used by UPDATE paths)', () => {
  test('sets referred_by_ctv_id = NULL for a valid customer', async () => {
    const q = makeQuery();
    const result = await clearCustomerReferrer(q, CUSTOMER_ID);
    expect(result).toBe(true);
    expect(q.calls).toHaveLength(1);
    expect(q.calls[0].sql).toMatch(/UPDATE partners/i);
    expect(q.calls[0].sql).toMatch(/referred_by_ctv_id\s*=\s*NULL/i);
    expect(q.calls[0].params).toEqual([CUSTOMER_ID]);
  });

  test('is a NO-OP when customerId is invalid', async () => {
    const q = makeQuery();
    expect(await clearCustomerReferrer(q, 'nope')).toBe(false);
    expect(await clearCustomerReferrer(q, null)).toBe(false);
    expect(q.calls).toHaveLength(0);
  });

  test('returns false when the customer row does not exist', async () => {
    const q = makeQuery({ customerExists: false });
    expect(await clearCustomerReferrer(q, CUSTOMER_ID)).toBe(false);
    expect(q.calls).toHaveLength(1);
  });
});
