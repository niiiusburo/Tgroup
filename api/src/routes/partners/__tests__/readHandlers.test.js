jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const { checkPartnerUnique } = require('../readHandlers');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('partner read handlers', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('treats phone uniqueness checks as non-blocking', async () => {
    const req = {
      query: {
        field: 'phone',
        value: 'T8250',
        excludeId: 'customer-1',
      },
    };
    const res = mockResponse();

    await checkPartnerUnique(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ unique: true });
  });

  it('keeps email uniqueness checks active', async () => {
    query.mockResolvedValueOnce([{ id: 'customer-2' }]);

    const req = {
      query: {
        field: 'email',
        value: 'duplicate@example.com',
        excludeId: 'customer-1',
      },
    };
    const res = mockResponse();

    await checkPartnerUnique(req, res);

    expect(query).toHaveBeenCalledWith(
      'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      ['duplicate@example.com', 'customer-1'],
    );
    expect(res.json).toHaveBeenCalledWith({ unique: false, conflictField: 'email' });
  });
});
