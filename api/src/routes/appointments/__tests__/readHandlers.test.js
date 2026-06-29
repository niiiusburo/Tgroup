jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../../../services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
}));

const { query } = require('../../../db');
const { listAppointments } = require('../readHandlers');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('appointment read handlers', () => {
  beforeEach(() => {
    query.mockReset();
    mockResolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  it('uses the lightweight calendar query without counts when requested', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'appointment-1',
        date: '2026-05-04',
        time: '09:00:00',
        partnername: 'Test Customer',
      },
      {
        id: 'appointment-2',
        date: '2026-05-04',
        time: '10:00:00',
        partnername: 'Test Customer 2',
      },
    ]);

    const req = {
      query: {
        offset: '0',
        limit: '3000',
        date_from: '2026-05-04',
        date_to: '2026-05-10',
        calendar_mode: 'true',
        include_counts: 'false',
      },
    };
    const res = mockResponse();

    await listAppointments(req, res);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('LEFT JOIN partners p ON p.id = a.partnerid');
    expect(sql).not.toContain('LEFT JOIN dotkhams');
    expect(sql).not.toContain('LEFT JOIN saleorders');
    expect(sql).not.toContain('LEFT JOIN customerreceipts');
    expect(params).toEqual(['2026-05-04', '2026-05-10 23:59:59', 3000, 0]);
    expect(res.json).toHaveBeenCalledWith({
      offset: 0,
      limit: 3000,
      totalItems: 2,
      items: expect.any(Array),
      aggregates: null,
    });
  });

  it('filters investor calendar lists by customer allowlist without adding a location filter', async () => {
    mockResolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['11111111-1111-4111-8111-111111111111'],
    });
    query.mockResolvedValueOnce([]);

    const req = {
      user: { employeeId: 'investor-1' },
      query: {
        offset: '0',
        limit: '3000',
        date_from: '2026-06-29',
        date_to: '2026-06-29 23:59:59',
        calendar_mode: 'true',
        include_counts: 'false',
      },
    };
    const res = mockResponse();

    await listAppointments(req, res);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('a.partnerid = ANY($3::uuid[])');
    expect(sql).not.toContain('a.companyid =');
    expect(params).toEqual([
      '2026-06-29',
      '2026-06-29 23:59:59',
      ['11111111-1111-4111-8111-111111111111'],
      3000,
      0,
    ]);
  });

  it('keeps the normal appointment list capped at 500 rows', async () => {
    const req = {
      query: {
        offset: '0',
        limit: '3000',
      },
    };
    const res = mockResponse();

    await listAppointments(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'INVALID_LIMIT',
      message: 'limit must be between 1 and 500',
    });
  });
});
