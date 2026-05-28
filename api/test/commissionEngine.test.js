const { triggerCommissionEngine } = require('../src/services/commissionEngine');
const { getDb } = require('../src/db');

// Mock getDb to return in-memory DBs for testing
jest.mock('../src/db', () => ({
  getDb: jest.fn(),
}));

describe('commissionEngine', () => {
  let mockCosmeticDb;
  let mockDentalDb;

  beforeEach(() => {
    mockCosmeticDb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn(),
      transaction: jest.fn(),
    };

    mockDentalDb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn(),
    };

    getDb.mockImplementation((lob) => {
      if (lob === 'cosmetic') return mockCosmeticDb;
      if (lob === 'dental') return mockDentalDb;
      throw new Error(`Unknown LOB: ${lob}`);
    });

    // Mock transaction
    mockCosmeticDb.transaction.mockImplementation(async (fn) => {
      await fn(mockCosmeticDb);
      return { insertedCount: 2 };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate and insert earnings for a direct CTV referral', async () => {
    // Mock service line and product
    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce([
          { id: 'sl_123', price: '1000000', quantity: '1' },
        ]),
      }),
    });

    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce([
          { commission_rate_percent: 10.0 },
        ]),
      }),
    });

    // Mock commission_level_config
    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        orderBy: jest.fn().mockReturnValueOnce([
          { level: 0, percentage: 24.0 },
          { level: 1, percentage: 4.0 },
        ]),
      }),
    });

    // Mock partners chain
    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce([
          { id: 'ctv_abc', referred_by_ctv_id: null, lob_scope: ['cosmetic'] },
        ]),
      }),
    });

    const result = await triggerCommissionEngine(
      'sl_123',
      'client_xyz',
      'ctv_abc',
      'cosmetic'
    );

    expect(result.insertedCount).toBe(1);
    expect(mockCosmeticDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDentalDb.insert).toHaveBeenCalledTimes(1);
  });

  it('should return 0 if no commission rate is configured', async () => {
    // Mock service line
    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce([
          { id: 'sl_123', price: '1000000', quantity: '1' },
        ]),
      }),
    });

    // Mock product with no commission_rate_percent
    mockCosmeticDb.select.mockReturnValueOnce({
      where: jest.fn().mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce([
          { commission_rate_percent: null },
        ]),
      }),
    });

    const result = await triggerCommissionEngine(
      'sl_123',
      'client_xyz',
      'ctv_abc',
      'cosmetic'
    );

    expect(result.insertedCount).toBe(0);
  });
});