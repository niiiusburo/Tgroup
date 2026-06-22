'use strict';

/**
 * Wiring test: setCustomerReferrer(opts.lob) must trigger a retroactive CTV earnings backfill
 * so a customer who already paid (before being linked to the CTV) shows up in the CTV portal
 * journey. The engine internals are covered in commissionEngine.test.js — here we only assert
 * the trigger contract (called / not called / non-fatal on error).
 */

jest.mock('../commissionEngine', () => ({
  backfillEarningsForClient: jest.fn().mockResolvedValue({ paymentsScanned: 1, paymentsAttributed: 1, earningsCreated: 1 }),
}));

const { backfillEarningsForClient } = require('../commissionEngine');
const { setCustomerReferrer } = require('../customerReferrer');

const CUSTOMER_ID = '22222222-2222-2222-2222-222222222222';
const CTV_ID = '33333333-3333-3333-3333-333333333333';

function makeQ(updateResult = [{ id: CUSTOMER_ID }]) {
  return jest.fn(async (sql) => {
    if (/SELECT 1 FROM partners/i.test(sql)) return [{ '?column?': 1 }];
    if (/UPDATE partners/i.test(sql)) return updateResult;
    return [];
  });
}

describe('setCustomerReferrer — retroactive backfill trigger', () => {
  const envSnapshot = process.env.CTV_SERVICE_CARD_COMMISSION;

  beforeEach(() => {
    backfillEarningsForClient.mockClear();
    delete process.env.CTV_SERVICE_CARD_COMMISSION;
  });

  afterAll(() => {
    if (envSnapshot === undefined) delete process.env.CTV_SERVICE_CARD_COMMISSION;
    else process.env.CTV_SERVICE_CARD_COMMISSION = envSnapshot;
  });

  test('triggers backfill with the request lob after a successful assign', async () => {
    const q = makeQ();
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID, { lob: 'dental' });
    expect(result).toBe(true);
    expect(backfillEarningsForClient).toHaveBeenCalledTimes(1);
    const arg = backfillEarningsForClient.mock.calls[0][0];
    expect(arg.clientId).toBe(CUSTOMER_ID);
    expect(arg.lob).toBe('dental');
    expect(typeof arg.getDb).toBe('function');
  });

  test('does NOT trigger backfill when no lob is provided (create paths stay cheap)', async () => {
    const q = makeQ();
    await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID);
    expect(backfillEarningsForClient).not.toHaveBeenCalled();
  });

  test('does NOT trigger backfill when the assign was a no-op (no row updated)', async () => {
    const q = makeQ([]); // UPDATE hits no row
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID, { lob: 'cosmetic' });
    expect(result).toBe(false);
    expect(backfillEarningsForClient).not.toHaveBeenCalled();
  });

  test('a backfill failure is non-fatal — the assignment still succeeds', async () => {
    backfillEarningsForClient.mockRejectedValueOnce(new Error('boom'));
    const q = makeQ();
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID, { lob: 'dental' });
    expect(result).toBe(true);
  });

  test('does NOT trigger payment-time backfill when CTV_SERVICE_CARD_COMMISSION is on (NK3)', async () => {
    process.env.CTV_SERVICE_CARD_COMMISSION = 'true';
    const q = makeQ();
    const result = await setCustomerReferrer(q, CUSTOMER_ID, CTV_ID, { lob: 'cosmetic' });
    expect(result).toBe(true);
    expect(backfillEarningsForClient).not.toHaveBeenCalled();
  });
});
