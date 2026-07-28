jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const { query } = require('../src/db');
const {
  softDeletePartner,
  updatePartner,
} = require('../src/routes/partners/mutationHandlers');

const PARTNER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('AUD-011 partner mutation password_hash leak', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('omits password fields from a normal PUT receipt', async () => {
    query
      .mockResolvedValueOnce([{ id: PARTNER_ID, sourceid: SOURCE_ID }])
      .mockResolvedValueOnce([{
        id: PARTNER_ID,
        name: 'Updated Employee',
        password_hash: 'stored-hash',
        password: 'plaintext',
      }]);
    const res = mockResponse();

    await updatePartner(
      { params: { id: PARTNER_ID }, body: { name: 'Updated Employee' } },
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      id: PARTNER_ID,
      name: 'Updated Employee',
    });
  });

  it('omits password fields from a compatible no-op PUT receipt', async () => {
    query.mockResolvedValueOnce([{
      id: PARTNER_ID,
      sourceid: SOURCE_ID,
      password_hash: 'stored-hash',
      password: 'plaintext',
    }]);
    const res = mockResponse();

    await updatePartner(
      { params: { id: PARTNER_ID }, body: { sourceid: SOURCE_ID } },
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      id: PARTNER_ID,
      sourceid: SOURCE_ID,
    });
  });

  it('omits password fields from a soft-delete receipt', async () => {
    query.mockResolvedValueOnce([{
      id: PARTNER_ID,
      isdeleted: true,
      password_hash: 'stored-hash',
      password: 'plaintext',
    }]);
    const res = mockResponse();

    await softDeletePartner({ params: { id: PARTNER_ID } }, res);

    expect(res.json).toHaveBeenCalledWith({
      id: PARTNER_ID,
      isdeleted: true,
    });
  });
});
