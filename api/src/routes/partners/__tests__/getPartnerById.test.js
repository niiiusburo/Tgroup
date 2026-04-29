const {
  PARTNER_BY_ID_SQL,
  fetchPartnerProfileById,
} = require('../getPartnerById');

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
