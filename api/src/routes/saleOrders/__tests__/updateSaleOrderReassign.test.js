'use strict';

// INV-003C Wave 3: admin service-card CTV reassignment — paid-out lock + reverse-old + recreate-new.
// The engine internals are unit-tested in commissionEngineServiceCard.test.js; here we verify the
// orchestration in updateSaleOrder, so the engine functions are mocked.

jest.mock('../../../services/commissionEngine', () => ({
  createEarningsForServiceCard: jest.fn(() => Promise.resolve([])),
  reverseServiceCardEarnings: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../../services/customerReferrer', () => ({
  setCustomerReferrer: jest.fn(() => Promise.resolve()),
  clearCustomerReferrer: jest.fn(() => Promise.resolve()),
}));
jest.mock('../fetchSaleOrderById', () => ({
  fetchSaleOrderById: jest.fn(() => Promise.resolve([{ id: 'so1', ctv_id: 'c9' }])),
}));
jest.mock('../../../lib/saleOrderTotals', () => ({
  calculateSaleOrderPaymentStateFromAllocations: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../../db', () => ({ query: jest.fn(), getQuery: jest.fn() }));

const { getQuery } = require('../../../db');
const { createEarningsForServiceCard, reverseServiceCardEarnings } = require('../../../services/commissionEngine');
const { updateSaleOrder } = require('../updateSaleOrder');

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.jsonBody = b; return this; },
  };
}

function smartQ({ paidOut = false } = {}) {
  return jest.fn(async (sql) => {
    if (/ctv_id, partnerid FROM saleorders WHERE id/.test(sql)) return [{ ctv_id: 'c0', partnerid: 'cust' }];
    if (/SELECT id, pricetotal FROM saleorderlines/.test(sql)) return [{ id: 'L1', pricetotal: 1000000 }];
    if (/FROM dbo\.earnings/.test(sql)) return paidOut ? [{ one: 1 }] : [];
    if (/UPDATE saleorders SET/.test(sql)) return [{ id: 'so1', ctv_id: 'c9' }];
    if (/SELECT partnerid FROM saleorders WHERE id/.test(sql)) return [{ partnerid: 'cust' }];
    return [];
  });
}

describe('updateSaleOrder — service-card CTV reassignment (Wave 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CTV_SERVICE_CARD_COMMISSION = 'true';
  });
  afterAll(() => {
    delete process.env.CTV_SERVICE_CARD_COMMISSION;
  });

  test('reverses the old pending earnings and recreates them for the new CTV', async () => {
    getQuery.mockReturnValue(smartQ({ paidOut: false }));
    const req = { params: { id: 'so1' }, body: { ctv_id: 'c9' }, lob: 'dental' };
    const res = makeRes();

    await updateSaleOrder(req, res);

    expect(res.statusCode).toBe(200);
    // Old earnings reversed for the existing line.
    expect(reverseServiceCardEarnings).toHaveBeenCalledWith(expect.objectContaining({ serviceLineId: 'L1' }));
    // New earnings recreated for the new CTV at the full line price.
    expect(createEarningsForServiceCard).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceLine: expect.objectContaining({ id: 'L1', ctv_id: 'c9', price: 1000000, client_id: 'cust' }),
      }),
    );
  });

  test('blocks reassignment with 409 when commission is already paid out (paid-out lock)', async () => {
    getQuery.mockReturnValue(smartQ({ paidOut: true }));
    const req = { params: { id: 'so1' }, body: { ctv_id: 'c9' }, lob: 'dental' };
    const res = makeRes();

    await updateSaleOrder(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.jsonBody).toMatchObject({ error: { code: 'B_COMMISSION_PAID_OUT' } });
    expect(reverseServiceCardEarnings).not.toHaveBeenCalled();
    expect(createEarningsForServiceCard).not.toHaveBeenCalled();
  });

  test('does nothing commission-related when the flag is off (NK/NK2 default)', async () => {
    delete process.env.CTV_SERVICE_CARD_COMMISSION;
    getQuery.mockReturnValue(smartQ({ paidOut: true })); // even if "paid", flag-off path ignores it
    const req = { params: { id: 'so1' }, body: { ctv_id: 'c9' }, lob: 'dental' };
    const res = makeRes();

    await updateSaleOrder(req, res);

    expect(res.statusCode).toBe(200);
    expect(reverseServiceCardEarnings).not.toHaveBeenCalled();
    expect(createEarningsForServiceCard).not.toHaveBeenCalled();
  });
});
