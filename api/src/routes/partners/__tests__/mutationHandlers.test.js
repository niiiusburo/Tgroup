jest.mock('../../../db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getQuery: jest.fn((reqOrLob) => mockQuery),
    getDb: jest.fn(() => ({ queryRows: mockQuery })),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'customer-uuid'),
}));

const { query } = require('../../../db');
const { createPartner, updatePartner } = require('../mutationHandlers');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('partner mutation handlers', () => {
  let randomSpy;

  beforeEach(() => {
    query.mockReset();
  });

  afterEach(() => {
    if (randomSpy) {
      randomSpy.mockRestore();
      randomSpy = null;
    }
  });

  it('generates a cosmetic customer code with TM prefix', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'customer-1', ref: 'TM100000', name: 'Tham My Customer' }]);

    const req = {
      originalUrl: '/api/cosmetic/Partners',
      body: {
        name: 'Tham My Customer',
        phone: '0900000000',
      },
    };
    const res = mockResponse();

    await createPartner(req, res);

    const insertCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO partners'));
    expect(query.mock.calls[0]).toEqual([
      'SELECT id FROM partners WHERE ref = $1 LIMIT 1',
      ['TM100000'],
    ]);
    expect(insertCall[1]).toContain('TM100000');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', ref: 'TM100000', name: 'Tham My Customer' });
  });

  it('keeps the dental customer code prefix as T', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'customer-1', ref: 'T100000', name: 'Dental Customer' }]);

    const req = {
      originalUrl: '/api/Partners',
      body: {
        name: 'Dental Customer',
        phone: '0911111111',
      },
    };
    const res = mockResponse();

    await createPartner(req, res);

    expect(query.mock.calls[0]).toEqual([
      'SELECT id FROM partners WHERE ref = $1 LIMIT 1',
      ['T100000'],
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', ref: 'T100000', name: 'Dental Customer' });
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
