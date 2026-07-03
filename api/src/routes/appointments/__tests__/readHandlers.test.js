jest.mock('../../../db', () =>
  require('../../../__tests__/helpers/routeTestHelpers').createMockQueryDb()
);

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const { listAppointments } = require('../readHandlers');
const { mockResponse } = require('../../../__tests__/helpers/routeTestHelpers');

const LOC_A = '11111111-1111-4111-8111-111111111111';

describe('appointment read handlers', () => {
  beforeEach(() => {
    query.mockReset();
    resolveEffectivePermissions.mockReset();
  });

  it('uses the lightweight calendar query without counts when requested', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['appointments.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
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
      user: { employeeId: 'staff-1', authLob: 'dental' },
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
    expect(sql).toContain('a.companyid = ANY($1::uuid[])');
    expect(sql).not.toContain('LEFT JOIN dotkhams');
    expect(sql).not.toContain('LEFT JOIN saleorders');
    expect(sql).not.toContain('LEFT JOIN customerreceipts');
    expect(params).toEqual([[LOC_A], '2026-05-04', '2026-05-10 23:59:59', 3000, 0]);
    expect(res.json).toHaveBeenCalledWith({
      offset: 0,
      limit: 3000,
      totalItems: 2,
      items: expect.any(Array),
      aggregates: null,
    });
  });

  it('rejects explicit out-of-scope appointment locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['appointments.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const req = {
      user: { employeeId: 'staff-1', authLob: 'dental' },
      query: {
        company_id: '22222222-2222-4222-8222-222222222222',
      },
    };
    const res = mockResponse();

    await listAppointments(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LOCATION_NOT_ALLOWED' }));
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
