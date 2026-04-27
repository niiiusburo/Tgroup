const {
  buildReferenceMaps,
  deterministicUuid,
  mapPaymentAllocationsForApply,
} = require('../scripts/tdental-import/apply');

describe('TDental app-scope apply helpers', () => {
  it('remaps duplicate staff names and services to canonical local targets', () => {
    const refs = buildReferenceMaps({
      employees: [{ Id: '00000000-0000-0000-0000-000000000101', PartnerId: '00000000-0000-0000-0000-000000000201', Name: 'AnhVL saleonline', CompanyId: '00000000-0000-0000-0000-000000000301' }],
      products: [{ Id: '00000000-0000-0000-0000-000000000401', Name: 'Trám răng', DefaultCode: '' }],
    }, {
      employees: [{ id: '00000000-0000-0000-0000-000000000999', name: 'AnhVL saleonline', phone: '037', location_ids: [] }],
      products: [{ id: '00000000-0000-0000-0000-000000000888', name: 'Tram rang', defaultcode: '' }],
      companiesById: new Map(),
    });

    expect(refs.staffIdMap.get('00000000-0000-0000-0000-000000000101')).toBe('00000000-0000-0000-0000-000000000999');
    expect(refs.staffIdMap.get('00000000-0000-0000-0000-000000000201')).toBe('00000000-0000-0000-0000-000000000999');
    expect(refs.productIdMap.get('00000000-0000-0000-0000-000000000401')).toBe('00000000-0000-0000-0000-000000000888');
  });

  it('creates deterministic payment allocation IDs from source relation rows', () => {
    const source = {
      accountpayments: [{ Id: '00000000-0000-0000-0000-000000000001', State: 'posted', DateCreated: '2026-04-01 10:00:00.0000000' }],
      saleorderpayments: [{ Id: '00000000-0000-0000-0000-000000000002', OrderId: '00000000-0000-0000-0000-000000000003', Amount: '123000', Date: '2026-04-01 10:00:00.0000000' }],
      saleorderpaymentaccountpaymentrels: [{ PaymentId: '00000000-0000-0000-0000-000000000001', SaleOrderPaymentId: '00000000-0000-0000-0000-000000000002' }],
    };
    const anomalies = [];
    const rows = mapPaymentAllocationsForApply(source, {
      saleorders: new Set(['00000000-0000-0000-0000-000000000003']),
    }, anomalies);

    expect(rows).toEqual([{
      id: deterministicUuid('tdental-allocation', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
      payment_id: '00000000-0000-0000-0000-000000000001',
      invoice_id: '00000000-0000-0000-0000-000000000003',
      dotkham_id: null,
      allocated_amount: 123000,
      created_at: '2026-04-01 10:00:00',
    }]);
    expect(anomalies).toHaveLength(0);
  });
});
