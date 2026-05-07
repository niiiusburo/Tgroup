jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const {
  PARTNER_BY_ID_SQL,
  fetchPartnerProfileById,
  getPartnerById,
} = require('../getPartnerById');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('getPartnerById profile query', () => {
  it('selects assigned sales and CSKH employee names for the customer profile card', () => {
    expect(PARTNER_BY_ID_SQL).toContain('sales_staff.name AS salestaffname');
    expect(PARTNER_BY_ID_SQL).toContain('cskh_staff.name AS cskhname');
    expect(PARTNER_BY_ID_SQL).toContain('LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid');
    expect(PARTNER_BY_ID_SQL).toContain('LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid');
  });

  it('loads one customer profile by id', async () => {
    const runQuery = jest.fn().mockResolvedValue([{ id: 'customer-id' }]);

    const rows = await fetchPartnerProfileById('customer-id', runQuery);

    expect(runQuery).toHaveBeenCalledWith(PARTNER_BY_ID_SQL, ['customer-id']);
    expect(rows).toEqual([{ id: 'customer-id' }]);
  });
});

describe('getPartnerById - location scope enforcement', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('allows admin to access any customer regardless of location', async () => {
    query.mockResolvedValue([{ id: 'customer-1', companyid: 'loc-2' }]);

    const req = {
      params: { id: 'customer-1' },
      userPermissions: {
        effectivePermissions: ['*'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'customer-1' }),
    );
  });

  it('allows access when customer companyid is in user allowed locations', async () => {
    query.mockResolvedValue([{ id: 'customer-1', companyid: 'loc-1' }]);

    const req = {
      params: { id: 'customer-1' },
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'customer-1' }),
    );
  });

  it('returns 403 when customer companyid is not in user allowed locations', async () => {
    query.mockResolvedValue([{ id: 'customer-1', companyid: 'loc-2' }]);

    const req = {
      params: { id: 'customer-1' },
      userPermissions: {
        effectivePermissions: ['customers.search'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Partner not accessible from your location',
    });
  });

  it('returns 403 when user has no assigned locations', async () => {
    query.mockResolvedValue([{ id: 'customer-1', companyid: 'loc-2' }]);

    const req = {
      params: { id: 'customer-1' },
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [],
      },
    };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Partner not accessible from your location',
    });
  });

  it('returns 404 when customer is not found', async () => {
    query.mockResolvedValue([]);

    const req = {
      params: { id: 'missing-id' },
      userPermissions: {
        effectivePermissions: ['customers.view_all'],
        locations: [{ id: 'loc-1', name: 'Branch A' }],
      },
    };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Partner not found' });
  });
});
