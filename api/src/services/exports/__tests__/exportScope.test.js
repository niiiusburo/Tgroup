'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../permissionService', () => ({
  isInvestorGroup: jest.fn((name) => String(name || '').trim().toLowerCase() === 'investor'),
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../permissionService');

const appointmentsExport = require('../builders/appointmentsExport');
const customersExport = require('../builders/customersExport');
const paymentsExport = require('../builders/paymentsExport');
const serviceCatalogExport = require('../builders/serviceCatalogExport');
const servicesExport = require('../builders/servicesExport');

const USER = {
  employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Scoped User',
};

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const CLIENT_A = '33333333-3333-4333-8333-333333333333';

const EXPORTS = [
  {
    name: 'customers',
    builder: customersExport,
    summary: { total: '0', active_count: '0', inactive_count: '0', with_phone: '0', with_birthday: '0' },
    locationSql: 'p.companyid = ANY($1::uuid[])',
    investorSql: 'p.id = ANY($1::uuid[])',
    customerLinked: true,
  },
  {
    name: 'appointments',
    builder: appointmentsExport,
    summary: { total: '0', scheduled_count: '0', done_count: '0', cancelled_count: '0', arrived_count: '0', repeat_count: '0' },
    locationSql: 'a.companyid = ANY($1::uuid[])',
    investorSql: 'a.partnerid = ANY($1::uuid[])',
    customerLinked: true,
  },
  {
    name: 'payments',
    builder: paymentsExport,
    summary: { total: '0', posted_count: '0', voided_count: '0', draft_count: '0', total_amount: '0' },
    locationSql: 'so.companyid = ANY($1::uuid[])',
    investorSql: 'pr.id = ANY($1::uuid[])',
    customerLinked: true,
  },
  {
    name: 'services',
    builder: servicesExport,
    summary: { total: '0', active_count: '0', completed_count: '0', cancelled_count: '0', total_amount: '0', total_paid: '0', total_residual: '0' },
    locationSql: 'so.companyid = ANY($1::uuid[])',
    investorSql: 'p.id = ANY($1::uuid[])',
    customerLinked: true,
  },
  {
    name: 'service-catalog',
    builder: serviceCatalogExport,
    summary: { total: '0', active_count: '0', inactive_count: '0', category_count: '0' },
    locationSql: 'p.companyid = ANY($1::uuid[])',
    customerLinked: false,
  },
];

function setScopedManager() {
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'Manager',
    effectivePermissions: ['exports.view'],
    locations: [{ id: LOC_A, name: 'Location A' }],
  });
  resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

function setInvestor() {
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'investor',
    effectivePermissions: ['exports.view'],
    locations: [],
  });
  resolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: [CLIENT_A] });
}

describe('generic Excel export scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScopedManager();
  });

  it.each(EXPORTS)('narrows all-location $name preview to the employee location scope', async ({ builder, summary, locationSql }) => {
    query.mockResolvedValueOnce([summary]);

    await builder.preview({ companyId: 'all' }, USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain(locationSql);
    expect(params).toEqual([[LOC_A]]);
  });

  it.each(EXPORTS)('rejects out-of-scope $name preview companyId before querying', async ({ builder }) => {
    await expect(builder.preview({ companyId: LOC_B }, USER)).rejects.toMatchObject({
      status: 403,
      code: 'EXPORT_LOCATION_DENIED',
    });
    expect(query).not.toHaveBeenCalled();
  });

  it.each(EXPORTS.filter((entry) => entry.customerLinked))('narrows investor $name preview to checked clients', async ({ builder, summary, investorSql }) => {
    setInvestor();
    query.mockResolvedValueOnce([summary]);

    await builder.preview({ companyId: 'all' }, USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain(investorSql);
    expect(params).toEqual([[CLIENT_A]]);
  });
});
