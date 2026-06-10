'use strict';

// Owner decision 2026-06-10 (strict commission attribution): a service card created
// with no ctv_id stays CTV-less and produces ZERO commission — even when the customer
// has a recorded referrer. The old create-time inheritance is removed. Explicit
// ctv_id still attaches and earns at full price.

const crypto = require('crypto');

jest.mock('../../../services/commissionEngine', () => ({
  createEarningsForServiceCard: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../../services/customerReferrer', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return {
    setCustomerReferrer: jest.fn(() => Promise.resolve(true)),
    isUuid: (value) => typeof value === 'string' && UUID_RE.test(value.trim()),
  };
});

jest.mock('../fetchSaleOrderById', () => ({
  fetchSaleOrderById: jest.fn(() => Promise.resolve([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }])),
}));

jest.mock('../../../db', () => ({ query: jest.fn(), getQuery: jest.fn() }));

const { getQuery } = require('../../../db');
const { createEarningsForServiceCard } = require('../../../services/commissionEngine');
const { setCustomerReferrer } = require('../../../services/customerReferrer');
const { createSaleOrder } = require('../createSaleOrder');

const CUSTOMER_ID = '00000000-0000-4000-8000-000000000001';
const REFERRER_CTV_ID = '11111111-1111-4111-8111-111111111111';
const EXPLICIT_CTV_ID = '22222222-2222-4222-8222-222222222222';

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.jsonBody = b; return this; },
  };
}

function makeQueryRecorder() {
  const calls = { saleOrderParams: null };
  const q = jest.fn(async (sql, params = []) => {
    if (/nextval\('dbo\.saleorder_code_seq'\)/.test(sql)) return [{ seq: '12' }];
    if (/SELECT c\.referred_by_ctv_id/.test(sql)) {
      throw new Error('strict mode: createSaleOrder must NOT look up the customer referrer');
    }
    if (/INSERT INTO saleorders/.test(sql)) {
      calls.saleOrderParams = params;
      return [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }];
    }
    if (/INSERT INTO saleorderlines/.test(sql)) return [];
    if (/SELECT p\.name AS pname/.test(sql)) return [{ pname: 'Laser skin', cname: 'Cosmetic' }];
    return [];
  });
  return { q, calls };
}

describe('createSaleOrder — strict per-card CTV attribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CTV_SERVICE_CARD_COMMISSION = 'true';
    jest.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .mockReturnValueOnce('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  afterEach(() => {
    crypto.randomUUID.mockRestore();
    delete process.env.CTV_SERVICE_CARD_COMMISSION;
  });

  test('no ctv_id → card stays CTV-less, NO earnings, NO referrer lookup (referred client)', async () => {
    const { q, calls } = makeQueryRecorder();
    getQuery.mockReturnValue(q);
    const req = {
      lob: 'cosmetic',
      body: {
        partnerid: CUSTOMER_ID, // this customer has referred_by_ctv_id = REFERRER_CTV_ID in the DB
        productid: 'prod-1',
        productname: 'Laser skin',
        amounttotal: 4000000,
        quantity: 1,
        ctv_id: null,
      },
    };
    const res = makeRes();

    await createSaleOrder(req, res);

    expect(res.statusCode).toBe(201);
    expect(calls.saleOrderParams[18]).toBeNull(); // saleorders.ctv_id stays NULL
    expect(createEarningsForServiceCard).not.toHaveBeenCalled(); // no CTV → no commission
    // assign-only referrer update receives null (no-op) — never the inherited referrer
    expect(setCustomerReferrer).toHaveBeenCalledWith(q, CUSTOMER_ID, null, { lob: 'cosmetic' });
    void REFERRER_CTV_ID;
  });

  test('explicit ctv_id → attached + full-price earnings (unchanged)', async () => {
    const { q, calls } = makeQueryRecorder();
    getQuery.mockReturnValue(q);
    const req = {
      lob: 'cosmetic',
      body: {
        partnerid: CUSTOMER_ID,
        productid: 'prod-1',
        productname: 'Laser skin',
        amounttotal: 4000000,
        quantity: 1,
        ctv_id: EXPLICIT_CTV_ID,
      },
    };
    const res = makeRes();

    await createSaleOrder(req, res);

    expect(res.statusCode).toBe(201);
    expect(calls.saleOrderParams[18]).toBe(EXPLICIT_CTV_ID);
    expect(createEarningsForServiceCard).toHaveBeenCalledWith(
      expect.objectContaining({
        lob: 'cosmetic',
        serviceLine: expect.objectContaining({
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          ctv_id: EXPLICIT_CTV_ID,
          price: 4000000,
          client_id: CUSTOMER_ID,
        }),
      }),
    );
    expect(setCustomerReferrer).toHaveBeenCalledWith(q, CUSTOMER_ID, EXPLICIT_CTV_ID, { lob: 'cosmetic' });
  });
});
