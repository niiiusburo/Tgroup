jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const { updatePartner } = require('../mutationHandlers');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('partner mutation handlers', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('allows updating a customer phone even when phone values are not globally unique', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1' }])
      .mockResolvedValueOnce([{ id: 'customer-1', phone: 'T8250', ref: 'T8250' }]);

    const req = {
      params: { id: 'customer-1' },
      body: {
        name: 'Test Customer',
        phone: 'T8250',
        ref: 'T8250',
      },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', phone: 'T8250', ref: 'T8250' });
    expect(query.mock.calls.some(([sql]) => String(sql).includes('WHERE phone = $1'))).toBe(false);
  });
});
