const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockPool = {
  connect: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
  types: { setTypeParser: jest.fn() },
}));

const { withTransaction } = require('../src/db');

describe('withTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  it('commits work on one checked-out client and releases it', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'row' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(withTransaction(async (transactionQuery) => (
      transactionQuery('SELECT id FROM example WHERE id = $1', ['row'])
    ))).resolves.toEqual([{ id: 'row' }]);

    expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'SELECT id FROM example WHERE id = $1',
      'COMMIT',
    ]);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back failed work and releases the client', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce({ rows: [] });

    await expect(withTransaction((transactionQuery) => (
      transactionQuery('UPDATE example SET value = 1')
    ))).rejects.toThrow('write failed');

    expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'UPDATE example SET value = 1',
      'ROLLBACK',
    ]);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
