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
});
