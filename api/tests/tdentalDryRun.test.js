const {
  buildDryRunSummary,
  normalizeAliasName,
  normalizeMatchName,
  planProductMatches,
  planStaffMatches,
} = require('../scripts/tdental-import/dry-run');

describe('TDental full-export dry run', () => {
  it('normalizes Vietnamese staff and service names for fuzzy matching', () => {
    expect(normalizeMatchName('  BS. Hải  ')).toBe('bs hai');
    expect(normalizeMatchName('AnhVL saleonline')).toBe('anhvl saleonline');
    expect(normalizeMatchName('Răng sứ Emax')).toBe('rang su emax');
    expect(normalizeAliasName('AnhVL Sale online')).toBe('anhvlsaleonline');
    expect(normalizeAliasName('Bác sĩ (17)')).toBe('bacsi17');
  });

  it('adds employee location scope for same-name staff instead of creating a duplicate', () => {
    const sourceEmployees = [
      {
        Id: 'src-anhvl-gv',
        Name: 'AnhVL saleonline',
        CompanyId: '00000000-0000-0000-0000-000000000301',
      },
    ];
    const localEmployees = [
      {
        id: 'rich-anhvl',
        name: 'AnhVL saleonline',
        ref: 'NV00118',
        phone: '0373740697',
        email: '0373740697@gmail.com',
        companyid: '00000000-0000-0000-0000-000000000302',
        loc_scope: 'assigned',
        location_ids: ['00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000303'],
      },
      {
        id: 'sparse-anhvl',
        name: 'AnhVL saleonline',
        ref: 'NV00125',
        companyid: '00000000-0000-0000-0000-000000000301',
        loc_scope: null,
        location_ids: [],
      },
    ];

    const plan = planStaffMatches(sourceEmployees, {
      employees: localEmployees,
      companiesById: new Map([
        ['00000000-0000-0000-0000-000000000301', { id: '00000000-0000-0000-0000-000000000301', name: 'Tấm Dentist Gò Vấp' }],
      ]),
    });

    expect(plan.summary.creates).toBe(0);
    expect(plan.summary.nameMatches).toBe(1);
    expect(plan.summary.locationScopeAdds).toBe(1);
    expect(plan.matches[0]).toMatchObject({
      action: 'name_match',
      targetId: 'rich-anhvl',
      sourceCompanyId: '00000000-0000-0000-0000-000000000301',
      needsLocationScope: true,
    });
    expect(plan.anomalies.map((a) => a.code)).toContain('duplicate_local_employee_name');
    expect(plan.anomalies.map((a) => a.code)).toContain('staff_location_scope_add');
  });

  it('matches alias-equivalent staff names before creating duplicate employees', () => {
    const sourceEmployees = [
      {
        Id: '00000000-0000-0000-0000-000000000701',
        PartnerId: '00000000-0000-0000-0000-000000000801',
        Name: 'AnhVL Sale online',
        CompanyId: '00000000-0000-0000-0000-000000000301',
      },
    ];
    const localEmployees = [
      {
        id: '00000000-0000-0000-0000-000000000999',
        name: 'AnhVL saleonline',
        phone: '0373740697',
        loc_scope: 'assigned',
        location_ids: [],
      },
    ];

    const plan = planStaffMatches(sourceEmployees, {
      employees: localEmployees,
      companiesById: new Map([
        ['00000000-0000-0000-0000-000000000301', { id: '00000000-0000-0000-0000-000000000301', name: 'Tấm Dentist Gò Vấp' }],
      ]),
    });

    expect(plan.summary.creates).toBe(0);
    expect(plan.summary.aliasNameMatches).toBe(1);
    expect(plan.matches[0]).toMatchObject({
      action: 'alias_name_match',
      targetId: '00000000-0000-0000-0000-000000000999',
      needsLocationScope: true,
    });
  });

  it('deduplicates same alias staff rows inside one source export', () => {
    const sourceEmployees = [
      {
        Id: '00000000-0000-0000-0000-000000000701',
        PartnerId: '00000000-0000-0000-0000-000000000801',
        Name: 'Bác sĩ 17',
        CompanyId: '00000000-0000-0000-0000-000000000301',
      },
      {
        Id: '00000000-0000-0000-0000-000000000702',
        PartnerId: '00000000-0000-0000-0000-000000000802',
        Name: 'Bác sĩ (17)',
        Phone: '0900000000',
        CompanyId: '00000000-0000-0000-0000-000000000302',
      },
    ];

    const plan = planStaffMatches(sourceEmployees, {
      employees: [],
      companiesById: new Map(),
    });

    expect(plan.summary.creates).toBe(1);
    expect(plan.summary.sourceDuplicateMatches).toBe(1);
    expect(plan.matches.map((match) => [match.sourceId, match.action, match.targetId])).toEqual([
      ['00000000-0000-0000-0000-000000000701', 'source_alias_match', '00000000-0000-0000-0000-000000000702'],
      ['00000000-0000-0000-0000-000000000702', 'create', '00000000-0000-0000-0000-000000000702'],
    ]);
  });

  it('matches services by exact id, default code, then normalized name before creating', () => {
    const sourceProducts = [
      { Id: 'existing-id', Name: 'Implant Mỹ', DefaultCode: 'IMPLANT-US', ListPrice: '18000000' },
      { Id: 'source-code-id', Name: 'Răng sứ Emax', DefaultCode: 'EMAX', ListPrice: '4400000' },
      { Id: 'source-name-id', Name: 'Trám răng', DefaultCode: '', ListPrice: '350000' },
      { Id: 'new-service-id', Name: 'Dịch vụ mới', DefaultCode: '', ListPrice: '123000' },
    ];
    const localProducts = [
      { id: 'existing-id', name: 'Implant Mỹ', defaultcode: 'IMPLANT-US', listprice: 18000000 },
      { id: 'local-emax', name: 'RS Emax', defaultcode: 'EMAX', listprice: 4400000 },
      { id: 'local-tram', name: 'Trám răng', defaultcode: 'TRAM', listprice: 350000 },
    ];

    const plan = planProductMatches(sourceProducts, { products: localProducts });

    expect(plan.summary).toMatchObject({
      exactMatches: 1,
      defaultCodeMatches: 1,
      nameMatches: 1,
      creates: 1,
    });
    expect(plan.matches.map((m) => [m.sourceId, m.action, m.targetId])).toEqual([
      ['existing-id', 'exact_match', 'existing-id'],
      ['source-code-id', 'default_code_match', 'local-emax'],
      ['source-name-id', 'name_match', 'local-tram'],
      ['new-service-id', 'create', null],
    ]);
  });

  it('builds a compact app-scoped dry-run summary without dotkham as a target', () => {
    const summary = buildDryRunSummary({
      source: {
        partners: [
          { Id: 'customer-existing', Customer: '1', IsDeleted: '0' },
          { Id: 'customer-new', Customer: '1', IsDeleted: '0' },
        ],
        employees: [{ Id: '00000000-0000-0000-0000-000000000501', Name: 'TrangTL', CompanyId: '00000000-0000-0000-0000-000000000601' }],
        products: [{ Id: 'prod-new', Name: 'Service New', DefaultCode: '' }],
        appointments: [{ Id: 'appt-new' }],
        saleorders: [{ Id: 'so-new' }],
        saleorderlines: [{ Id: 'line-new' }],
        accountpayments: [{ Id: 'pay-new', State: 'posted' }],
        saleorderpayments: [{ Id: 'sop-1', OrderId: 'so-new', Amount: '100' }],
        saleorderpaymentaccountpaymentrels: [{ PaymentId: 'pay-new', SaleOrderPaymentId: 'sop-1' }],
        partneradvances: [],
      },
      local: {
        partners: new Set(['customer-existing']),
        employees: [{ id: '00000000-0000-0000-0000-000000000502', name: 'TrangTL', loc_scope: 'assigned', location_ids: [] }],
        products: [],
        appointments: new Set(),
        saleorders: new Set(),
        saleorderlines: new Set(),
        payments: new Set(),
        companiesById: new Map([['00000000-0000-0000-0000-000000000601', { id: '00000000-0000-0000-0000-000000000601', name: 'Tấm Dentist Đống Đa' }]]),
      },
    });

    expect(summary.scope.excludedTargets).toContain('dotkhams');
    expect(summary.entities.customers).toMatchObject({ creates: 1, updates: 1 });
    expect(summary.entities.staff.creates).toBe(0);
    expect(summary.entities.staff.locationScopeAdds).toBe(1);
    expect(summary.entities.services.creates).toBe(1);
    expect(summary.entities.paymentAllocations.relationRows).toBe(1);
    expect(summary.entities.paymentAllocations.dotkhamOnlyIgnored).toBe(0);
  });
});
