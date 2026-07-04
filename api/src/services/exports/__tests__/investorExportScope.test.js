'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../permissionService');
const customersExport = require('../builders/customersExport');
const servicesExport = require('../builders/servicesExport');
const appointmentsExport = require('../builders/appointmentsExport');
const paymentsExport = require('../builders/paymentsExport');
const legacyFlatReportsExport = require('../builders/legacyFlatReportsExport');
const reportSalesEmployeesExport = require('../builders/reportSalesEmployeesExport');

const INVESTOR_USER = {
  employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Investor',
};
const ALLOWED_CUSTOMERS = ['11111111-1111-4111-8111-111111111111'];

beforeEach(() => {
  jest.clearAllMocks();
  resolveInvestorScope.mockResolvedValue({
    isInvestor: true,
    allowedCustomerIds: ALLOWED_CUSTOMERS,
  });
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'Investor',
    effectivePermissions: ['reports.export'],
    locations: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Clinic' }],
  });
});

describe('investor export scoping', () => {
  it('scopes customer exports to allowed customers', async () => {
    query.mockResolvedValueOnce([{
      total: '0',
      active_count: '0',
      inactive_count: '0',
      with_phone: '0',
      with_birthday: '0',
    }]);

    await customersExport.preview({ companyId: 'all', search: '', status: 'all' }, INVESTOR_USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('p.id = ANY($1::uuid[])');
    expect(params).toEqual([ALLOWED_CUSTOMERS]);
  });

  it('scopes service, appointment, and payment exports to allowed customers', async () => {
    query
      .mockResolvedValueOnce([{
        total: '0',
        active_count: '0',
        completed_count: '0',
        cancelled_count: '0',
        total_amount: '0',
        total_paid: '0',
        total_residual: '0',
      }])
      .mockResolvedValueOnce([{
        total: '0',
        scheduled_count: '0',
        done_count: '0',
        cancelled_count: '0',
        arrived_count: '0',
        repeat_count: '0',
      }])
      .mockResolvedValueOnce([{
        total: '0',
        posted_count: '0',
        voided_count: '0',
        draft_count: '0',
        total_amount: '0',
      }]);

    await servicesExport.preview({ companyId: 'all' }, INVESTOR_USER);
    await appointmentsExport.preview({ companyId: 'all' }, INVESTOR_USER);
    await paymentsExport.preview({ companyId: 'all' }, INVESTOR_USER);

    expect(query.mock.calls[0][0]).toContain('so.partnerid = ANY($1::uuid[])');
    expect(query.mock.calls[0][1]).toEqual([ALLOWED_CUSTOMERS]);
    expect(query.mock.calls[1][0]).toContain('a.partnerid = ANY($1::uuid[])');
    expect(query.mock.calls[1][1]).toEqual([ALLOWED_CUSTOMERS]);
    expect(query.mock.calls[2][0]).toContain('COALESCE(p.customer_id, so.partnerid) = ANY($1::uuid[])');
    expect(query.mock.calls[2][1]).toEqual([ALLOWED_CUSTOMERS]);
  });

  it('scopes flat revenue and deposit exports to allowed customers', async () => {
    query
      .mockResolvedValueOnce([{ total: '0', total_amount: '0' }])
      .mockResolvedValueOnce([{ total: '0', total_amount: '0' }]);

    await legacyFlatReportsExport.revenue.preview({ companyId: 'all' }, INVESTOR_USER);
    await legacyFlatReportsExport.deposit.preview({ companyId: 'all' }, INVESTOR_USER);

    expect(query.mock.calls[0][0]).toContain('COALESCE(p.customer_id, so.partnerid) = ANY($1::uuid[])');
    expect(query.mock.calls[0][1]).toEqual([ALLOWED_CUSTOMERS]);
    expect(query.mock.calls[1][0]).toContain('p.customer_id = ANY($1::uuid[])');
    expect(query.mock.calls[1][1]).toEqual([ALLOWED_CUSTOMERS]);
  });

  it('scopes employee revenue report exports to allowed customers', async () => {
    query.mockResolvedValueOnce([]);

    await reportSalesEmployeesExport.preview({
      companyId: 'all',
      employeeType: 'doctor',
      employeeId: '',
      dateFrom: '',
      dateTo: '',
    }, INVESTOR_USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('COALESCE(p.customer_id, so.partnerid) = ANY($');
    expect(params).toEqual(expect.arrayContaining([ALLOWED_CUSTOMERS]));
  });
});
