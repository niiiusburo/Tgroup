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

  it('places arrived CASE columns before state = so PostgreSQL evaluates OLD state', async () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440001';
    query
      .mockResolvedValueOnce([{ id: appointmentId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: appointmentId, state: 'arrived' }]);

    const req = { params: { id: appointmentId }, body: { state: 'arrived' } };
    const res = mockResponse();

    await updateAppointment(req, res);

    expect(query).toHaveBeenCalledTimes(3);
    const [updateSql] = query.mock.calls[1];
    const setMatch = updateSql.match(/^UPDATE appointments SET (.+) WHERE id = \$\d+\s*$/s);
    expect(setMatch).not.toBeNull();
    const setClause = setMatch[1];
    const datetimeIdx = setClause.indexOf('datetimearrived');
    const stateIdx = setClause.search(/\bstate = \$/);
    expect(datetimeIdx).toBeGreaterThanOrEqual(0);
    expect(stateIdx).toBeGreaterThan(datetimeIdx);
    expect(setClause.indexOf('datedone')).toBeLessThan(stateIdx);
    expect(setClause.indexOf('datetimeseated = CASE')).toBeLessThan(stateIdx);
  });
});
