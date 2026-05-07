jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const { checkPartnerUnique, listPartners } = require('../readHandlers');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function mockListRequest(overrides = {}) {
  return {
    query: {},
    userPermissions: {
      effectivePermissions: [],
      locations: [],
    },
    ...overrides,
  };
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

describe('listPartners - customer visibility scope', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('allows admin to fetch all customers without search', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = mockListRequest({
      userPermissions: {
        effectivePermissions: ['*'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalItems: 0,
        items: [],
      }),
    );
    // Admin should not have location restriction
    const listSql = query.mock.calls[0][0];
    expect(listSql).not.toContain('p.companyid = ANY');
  });

  it('allows customers.view_all to fetch full list scoped by locations', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = mockListRequest({
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const listSql = query.mock.calls[0][0];
    expect(listSql).toContain('p.companyid = ANY($1)');
  });

  it('allows customers.view to fetch full list scoped by locations', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = mockListRequest({
      userPermissions: {
        effectivePermissions: ['customers.view'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const listSql = query.mock.calls[0][0];
    expect(listSql).toContain('p.companyid = ANY($1)');
  });

  it('returns 403 when search-only user provides no search param', async () => {
    const req = mockListRequest({
      query: {},
      userPermissions: {
        effectivePermissions: ['customers.search'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Search parameter is required (min 2 characters)',
        totalItems: 0,
        items: [],
      }),
    );
  });

  it('returns 403 when search-only user provides search shorter than 2 chars', async () => {
    const req = mockListRequest({
      query: { search: 'a' },
      userPermissions: {
        effectivePermissions: ['customers.search'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Search parameter is required (min 2 characters)',
      }),
    );
  });

  it('allows search-only user with valid search param', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = mockListRequest({
      query: { search: 'Nguyen' },
      userPermissions: {
        effectivePermissions: ['customers.search'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const listSql = query.mock.calls[0][0];
    expect(listSql).toContain('p.companyid = ANY($1)');
    expect(listSql).toContain('p.name ILIKE');
  });

  it('returns 403 when user has no customer read permissions', async () => {
    const req = mockListRequest({
      userPermissions: {
        effectivePermissions: ['appointments.view'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Permission denied',
      }),
    );
  });

  it('returns 403 when user requests a location outside their scope', async () => {
    const req = mockListRequest({
      query: { companyId: 'loc-2' },
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Location not allowed',
      }),
    );
  });

  it('restricts search-only results to allowed locations', async () => {
    query
      .mockResolvedValueOnce([{ id: 'c1', name: 'Nguyen Van A' }])
      .mockResolvedValueOnce([{ total: 1, active: 1, inactive: 0 }]);

    const req = mockListRequest({
      query: { search: 'Nguyen' },
      userPermissions: {
        effectivePermissions: ['customers.search'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const [listSql, listParams] = query.mock.calls[0];
    expect(listSql).toContain('p.companyid = ANY($1)');
    expect(listParams[0]).toEqual(['loc-1']);
    expect(listSql).toContain('p.name ILIKE');
  });

  it('returns empty result when user has no assigned locations', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = mockListRequest({
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [],
      },
    });
    const res = mockResponse();

    await listPartners(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const listSql = query.mock.calls[0][0];
    expect(listSql).toContain('FALSE');
  });
});
