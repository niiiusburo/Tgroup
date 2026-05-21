jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const { updateAppointment } = require('../mutationHandlers');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('appointment mutation handlers', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('persists explicit null staff fields when clearing appointment selectors', async () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    query
      .mockResolvedValueOnce([{ id: appointmentId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: appointmentId, doctorid: null, assistantid: null, dentalaideid: null }]);

    const req = {
      params: { id: appointmentId },
      body: {
        doctorid: null,
        assistantid: null,
        dentalaideid: null,
      },
    };
    const res = mockResponse();

    await updateAppointment(req, res);

    expect(query).toHaveBeenCalledTimes(3);
    const [updateSql, updateParams] = query.mock.calls[1];
    expect(updateSql).toContain('doctorid = $1');
    expect(updateSql).toContain('assistantid = $2');
    expect(updateSql).toContain('dentalaideid = $3');
    expect(updateParams).toEqual([null, null, null, appointmentId]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: appointmentId,
        doctorid: null,
        assistantid: null,
        dentalaideid: null,
      }),
    );
  });

  it('persists appointment company/location changes on edit', async () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const nextCompanyId = '770e8400-e29b-41d4-a716-446655440002';
    query
      .mockResolvedValueOnce([{ id: appointmentId }])
      .mockResolvedValueOnce([{ id: nextCompanyId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: appointmentId,
          companyid: nextCompanyId,
          companyname: 'Tấm Dentist Quận 10',
        },
      ]);

    const req = {
      params: { id: appointmentId },
      body: {
        companyid: nextCompanyId,
      },
    };
    const res = mockResponse();

    await updateAppointment(req, res);

    expect(query).toHaveBeenCalledTimes(4);
    const [companySql, companyParams] = query.mock.calls[1];
    expect(companySql).toContain('SELECT 1 FROM companies WHERE id = $1');
    expect(companyParams).toEqual([nextCompanyId]);

    const [updateSql, updateParams] = query.mock.calls[2];
    expect(updateSql).toContain('companyid = $1');
    expect(updateParams).toEqual([nextCompanyId, appointmentId]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: appointmentId,
        companyid: nextCompanyId,
        companyname: 'Tấm Dentist Quận 10',
      }),
    );
  });

  it('accepts camelCase companyId when editing appointment location', async () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const nextCompanyId = '770e8400-e29b-41d4-a716-446655440002';
    query
      .mockResolvedValueOnce([{ id: appointmentId }])
      .mockResolvedValueOnce([{ id: nextCompanyId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: appointmentId,
          companyid: nextCompanyId,
          companyname: 'Tấm Dentist Quận 10',
        },
      ]);

    const req = {
      params: { id: appointmentId },
      body: {
        companyId: nextCompanyId,
      },
    };
    const res = mockResponse();

    await updateAppointment(req, res);

    expect(query).toHaveBeenCalledTimes(4);
    const [updateSql, updateParams] = query.mock.calls[2];
    expect(updateSql).toContain('companyid = $1');
    expect(updateParams).toEqual([nextCompanyId, appointmentId]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: appointmentId,
        companyid: nextCompanyId,
        companyname: 'Tấm Dentist Quận 10',
      }),
    );
  });
});
