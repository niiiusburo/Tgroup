const {
  buildEmployeeMergePlan,
} = require('../scripts/tdental-import/merge-duplicate-employees');

describe('TDental employee duplicate merge planner', () => {
  it('groups alias-equivalent employees and plans missing location scopes', () => {
    const plan = buildEmployeeMergePlan({
      employees: [
        {
          id: '00000000-0000-0000-0000-000000000101',
          name: 'AnhVL saleonline',
          phone: '0373740697',
          companyid: '00000000-0000-0000-0000-000000000301',
          active: true,
          location_ids: ['00000000-0000-0000-0000-000000000301'],
          refCounts: { saleorderlines: 10 },
        },
        {
          id: '00000000-0000-0000-0000-000000000102',
          name: 'AnhVL Sale online',
          companyid: '00000000-0000-0000-0000-000000000302',
          active: true,
          location_ids: [],
          refCounts: { appointments: 2, saleorderlines: 5 },
        },
      ],
      companiesById: new Map([
        ['00000000-0000-0000-0000-000000000301', { name: 'Đống Đa' }],
        ['00000000-0000-0000-0000-000000000302', { name: 'Gò Vấp' }],
      ]),
    });

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({
      aliasKey: 'anhvlsaleonline',
      canonicalId: '00000000-0000-0000-0000-000000000101',
      duplicateIds: ['00000000-0000-0000-0000-000000000102'],
      totalRefsToMove: 7,
    });
    expect(plan.groups[0].locationScopesToAdd).toEqual([{
      companyId: '00000000-0000-0000-0000-000000000302',
      companyName: 'Gò Vấp',
    }]);
  });
});
