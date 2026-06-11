/**
 * @crossref:domain[payment]
 * @crossref:used-in[jest route-wiring tests for DELETE /api/SaleOrderLines/:id]
 * @crossref:uses[api/src/routes/saleOrderLines.js, api/src/services/serviceReversal.js (mocked; covered by src/services/__tests__/serviceReversal.test.js), docs/INVARIANTS.md INV-003B]
 *
 * Route-layer test: transaction wiring (BEGIN/COMMIT/ROLLBACK/release),
 * result passthrough, and ServiceReversalError → HTTP mapping. The reversal
 * business logic itself (paid-out guards, last-line order soft-delete) is
 * covered by the serviceReversal service tests.
 */
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
  requireLobScope: () => (_req, _res, next) => next(),
}));

const mockTxClient = { query: jest.fn(), release: jest.fn() };

// uuid ships ESM-only; mock it so babel-jest doesn't have to transform it.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(async () => mockTxClient) },
}));

jest.mock('../src/services/serviceReversal', () => {
  const actual = jest.requireActual('../src/services/serviceReversal');
  return { ...actual, reverseServiceLine: jest.fn() };
});

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');
const { reverseServiceLine, ServiceReversalError } = require('../src/services/serviceReversal');

describe('DELETE /api/SaleOrderLines/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // server-level middleware queries (ip access etc.)
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      return [];
    });
  });

  it('soft-deletes the line inside a transaction and passes the result through', async () => {
    reverseServiceLine.mockResolvedValueOnce({
      success: true,
      id: 'line-id',
      orderId: 'order-id',
      deletedOrder: false,
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id: 'line-id',
      orderId: 'order-id',
      deletedOrder: false,
    });
    expect(reverseServiceLine).toHaveBeenCalledWith({
      lineId: 'line-id',
      lob: 'dental',
      txClient: mockTxClient,
    });
    const txCalls = mockTxClient.query.mock.calls.map(([sql]) => sql);
    expect(txCalls).toEqual(['BEGIN', 'COMMIT']);
    expect(mockTxClient.release).toHaveBeenCalled();
  });

  it('reports deletedOrder=true when the service reversed the last active line', async () => {
    reverseServiceLine.mockResolvedValueOnce({
      success: true,
      id: 'line-id',
      orderId: 'order-id',
      deletedOrder: true,
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body.deletedOrder).toBe(true);
  });

  it('maps ServiceReversalError to its HTTP status and rolls back (INV-003B guard surface)', async () => {
    reverseServiceLine.mockRejectedValueOnce(
      new ServiceReversalError(409, 'E_PAID_OUT', 'Earnings already paid out', { lineId: 'line-id' })
    );

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'E_PAID_OUT',
      message: 'Earnings already paid out',
      lineId: 'line-id',
    });
    const txCalls = mockTxClient.query.mock.calls.map(([sql]) => sql);
    expect(txCalls).toEqual(['BEGIN', 'ROLLBACK']);
    expect(mockTxClient.release).toHaveBeenCalled();
  });

  it('returns 500 and rolls back on unexpected errors', async () => {
    reverseServiceLine.mockRejectedValueOnce(new Error('db exploded'));

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db exploded');
    const txCalls = mockTxClient.query.mock.calls.map(([sql]) => sql);
    expect(txCalls).toEqual(['BEGIN', 'ROLLBACK']);
  });
});
