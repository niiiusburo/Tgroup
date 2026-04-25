const {
  buildClientImportPlan,
  mapAppointmentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  loadSource,
  parseCsvDateOnly,
  parseCsvTimestamp,
} = require('../scripts/tdental-import/import-client');
const { voidLocalOnlyPaymentRows } = require('../scripts/tdental-import/database');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readCsv, uuidOrNull } = require('../scripts/tdental-import/utils');
const {
  DUPLICATE_PARTNER_KEY_POLICY,
  classifyPaymentSource,
  classifyProductReference,
  customerReceiptTargetPolicy,
  getTopAssistantId,
  mapPaymentStatus,
  mapSaleOrderState,
  resolvePartnerIdentity,
  validateOrderTotals,
} = require('../scripts/tdental-import/mapping-rules');

describe('TDental one-client import helpers', () => {
  const partnerId = '6d601de7-5780-4476-a835-b178003777c4';

  it('builds the T8250 dry-run totals and missing line summary by UUID', () => {
    const source = {
      partners: [
        { Id: partnerId.toUpperCase(), Ref: 'T8250', Name: 'Tạ Thị Minh Huệ *', CompanyId: 'company-dd' },
        { Id: 'c795b2d7-684d-422a-8eb0-b178004c5716', Ref: ' T8250', Name: 'TRẦN PHƯƠNG NAM' },
      ],
      saleorders: [
        { Id: 'so-old', PartnerId: partnerId, Name: 'SO50821', AmountTotal: '5600000.00', State: 'sale', IsDeleted: '0' },
        { Id: 'so-new', PartnerId: partnerId, Name: 'SO61718', AmountTotal: '700000.00', State: 'sale', IsDeleted: '0' },
      ],
      saleorderlines: [
        { Id: 'line-old', OrderPartnerId: partnerId, OrderId: 'so-old', PriceTotal: '5600000.00', AmountPaid: '5600000.00', IsDeleted: '0' },
        { Id: 'line-new', OrderPartnerId: partnerId, OrderId: 'so-new', PriceTotal: '700000.00', AmountPaid: '700000.00', IsDeleted: '0' },
      ],
      accountpayments: [
        { Id: 'pay-posted', PartnerId: partnerId, Amount: '700000.00', State: 'posted', PaymentDate: '2026-04-18 00:00:00.0000000' },
        { Id: 'pay-cancel', PartnerId: partnerId, Amount: '700000.00', State: 'cancel', PaymentDate: '2026-04-19 00:00:00.0000000' },
      ],
      appointments: [
        { Id: 'appt-1', PartnerId: partnerId, CompanyId: 'company-dd', Date: '2026-04-18 09:00:00.0000000', State: 'done' },
      ],
      employees: [],
    };

    const local = {
      lineIds: new Set(['line-old']),
      lineCount: 1,
      lineTotal: 5600000,
    };

    const plan = buildClientImportPlan(source, local, partnerId);

    expect(plan.partner.Name).toBe('Tạ Thị Minh Huệ *');
    expect(plan.duplicateRefPartners).toHaveLength(1);
    expect(plan.duplicatePhonePartners).toHaveLength(0);
    expect(plan.source.lineCount).toBe(2);
    expect(plan.source.lineTotal).toBe(6300000);
    expect(plan.local.lineCount).toBe(1);
    expect(plan.local.lineTotal).toBe(5600000);
    expect(plan.missing.lineCount).toBe(1);
    expect(plan.missing.lineTotal).toBe(700000);
    expect(plan.payments.postedTotal).toBe(700000);
    expect(plan.payments.voidedTotal).toBe(700000);
    expect(plan.mapping.salesStaff).toMatchObject({ assistantId: null, totalWithAssistant: 0 });
    expect(plan.mapping.orderTotalChecks.every((check) => check.ok)).toBe(true);
    expect(plan.rows.appointments).toHaveLength(1);
  });

  it('repairs unquoted commas in Partners.csv street without shifting profile fields', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdental-partner-comma-'));
    const file = path.join(dir, 'dbo.Partners.csv');
    fs.writeFileSync(
      file,
      [
        'Id,DisplayName,Name,NameNoSign,Street,Phone,Email,Supplier,Customer,IsAgent,IsInsurance,CompanyId,Ref,Comment,Active,Employee,Gender,JobTitle,BirthYear,BirthMonth,BirthDay,MedicalHistory,SourceId,DateCreated,LastUpdated,IsDeleted',
        'F574A0CC-B910-4016-A09D-B2F4002CBAF4,[T049929] NGUYỄN TẤN PHƯƠNG -G,NGUYỄN TẤN PHƯƠNG -G,NGUYEN TAN PHUONG -G,TÂN THỚI NHẤT, Q12,0855892331,,0,1,0,0,765F6593-2B19-4D06-CC8C-08DC4D479451,T049929,,1,0,male,LYBAE,2000,8,11,,C7B3D31A-6325-4CF7-ABAE-AFE3007CF6F8,2025-06-06 09:42:51.4800556,2025-06-22 16:05:41.1032866,0',
      ].join('\n'),
    );

    const [partner] = readCsv(file);

    expect(partner).toMatchObject({
      Id: 'F574A0CC-B910-4016-A09D-B2F4002CBAF4',
      Street: 'TÂN THỚI NHẤT, Q12',
      Phone: '0855892331',
      CompanyId: '765F6593-2B19-4D06-CC8C-08DC4D479451',
      Ref: 'T049929',
      Gender: 'male',
      JobTitle: 'LYBAE',
      BirthYear: '2000',
      BirthMonth: '8',
      BirthDay: '11',
      SourceId: 'C7B3D31A-6325-4CF7-ABAE-AFE3007CF6F8',
    });
  });

  it('loads PartnerSources.csv so source names can be imported with partner source IDs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdental-sources-'));
    for (const file of [
      'dbo.Companies.csv',
      'dbo.ProductCategories.csv',
      'dbo.Products.csv',
      'dbo.Employees.csv',
      'dbo.Appointments.csv',
      'dbo.CustomerReceipts.csv',
      'dbo.SaleOrders.csv',
      'dbo.SaleOrderLines.csv',
      'dbo.AccountPayments.csv',
      'dbo.SaleOrderPayments.csv',
      'dbo.SaleOrderPaymentAccountPaymentRels.csv',
      'dbo.PartnerAdvances.csv',
    ]) {
      fs.writeFileSync(path.join(dir, file), 'Id\n');
    }
    fs.writeFileSync(
      path.join(dir, 'dbo.Partners.csv'),
      [
        'Id,Name,Ref,Customer,SourceId,IsDeleted',
        'F574A0CC-B910-4016-A09D-B2F4002CBAF4,NGUYỄN TẤN PHƯƠNG -G,T049929,1,C7B3D31A-6325-4CF7-ABAE-AFE3007CF6F8,0',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(dir, 'dbo.PartnerSources.csv'),
      [
        'Id,Name,Type,DateCreated,LastUpdated,IsActive',
        'C7B3D31A-6325-4CF7-ABAE-AFE3007CF6F8,Khách hàng giới thiệu,normal,2023-04-13 14:34:58.9600427,2023-04-13 14:34:58.9600430,1',
      ].join('\n'),
    );

    const source = loadSource(dir);
    const plan = buildClientImportPlan(source, { lineIds: new Set(), lineCount: 0, lineTotal: 0 }, 'f574a0cc-b910-4016-a09d-b2f4002cbaf4');

    expect(plan.rows.customersources).toHaveLength(1);
    expect(plan.rows.customersources[0]).toMatchObject({
      Id: 'C7B3D31A-6325-4CF7-ABAE-AFE3007CF6F8',
      Name: 'Khách hàng giới thiệu',
    });
  });

  it('maps canceled account payments to voided payments and keeps posted totals separate', () => {
    const mapped = mapAccountPaymentToPayment({
      Id: 'D3A002C1-11A1-4B09-A5B3-B431002218F6',
      PartnerId: partnerId,
      PaymentDate: '2026-04-19 00:00:00.0000000',
      State: 'cancel',
      Amount: '700000.00',
      Communication: '[T8250] hàn r27 45 - 700k TM ngày 18/4/26',
      Name: 'CUST.IN/2026/107995',
    });

    expect(mapped.status).toBe('voided');
    expect(mapped.payment_date).toBe('2026-04-19');
    expect(mapped.amount).toBe(700000);
    expect(mapped.method).toBe('cash');
    expect(mapped.payment_category).toBe('payment');
  });

  it('voids local-only payment rows with no TDental reference before allocating imported payments', async () => {
    const client = {
      query: jest.fn(async () => ({
        rows: [{ voided_count: '1', deleted_allocation_count: '1' }],
      })),
    };
    const sourcePaymentId = 'd3a002c1-11a1-4b09-a5b3-b431002218f6';

    const result = await voidLocalOnlyPaymentRows(client, {
      partner: { Id: partnerId },
      rows: { payments: [{ Id: sourcePaymentId }] },
    });

    expect(result).toEqual({ voided: 1, deletedAllocations: 1 });
    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain('DELETE FROM payment_allocations');
    expect(sql).toContain("status = 'voided'");
    expect(sql).toContain('reference_code IS NULL');
    expect(params).toEqual([partnerId, [sourcePaymentId]]);
  });

  it('preserves CSV date text without JavaScript timezone conversion', () => {
    expect(parseCsvDateOnly('2026-04-18 00:00:00.0000000')).toBe('2026-04-18');
    expect(parseCsvTimestamp('2026-04-08 11:47:26.6378765')).toBe('2026-04-08 11:47:26.637876');
    expect(mapSaleOrderLineRow({
      Id: 'line',
      OrderId: 'order',
      Date: '2026-04-18 00:00:00.0000000',
      DateCreated: '2026-04-19 09:03:46.7725439',
      Name: 'Trám răng',
      PriceTotal: '700000.00',
      IsDeleted: '0',
    }).date).toBe('2026-04-18 00:00:00');
  });

  it('requires partner UUID identity and reports duplicate ref or phone risks', () => {
    const identity = resolvePartnerIdentity([
      { Id: partnerId.toUpperCase(), Ref: 'T8250', Phone: '0901' },
      { Id: 'other-ref', Ref: ' T8250', Phone: '0902' },
      { Id: 'other-phone', Ref: 'T9999', Phone: '0901' },
    ], partnerId);

    expect(identity.ok).toBe(true);
    expect(identity.partner.Id).toBe(partnerId.toUpperCase());
    expect(identity.duplicateRefPartners.map((row) => row.Id)).toEqual(['other-ref']);
    expect(identity.duplicatePhonePartners.map((row) => row.Id)).toEqual(['other-phone']);
    expect(DUPLICATE_PARTNER_KEY_POLICY).toEqual({
      ref: 'allowed_warning_only',
      phone: 'allowed_warning_only',
    });
  });

  it('derives sales staff from the most frequent non-null assistant UUID only', () => {
    expect(getTopAssistantId([
      { AssistantId: '' },
      { AssistantId: 'B-ASSISTANT' },
      { AssistantId: 'a-assistant' },
      { AssistantId: 'A-ASSISTANT' },
    ])).toMatchObject({
      assistantId: 'a-assistant',
      count: 2,
      totalWithAssistant: 3,
      ambiguous: false,
    });

    expect(getTopAssistantId([
      { AssistantId: 'a-assistant' },
      { AssistantId: 'b-assistant' },
    ])).toMatchObject({ assistantId: null, ambiguous: true });
  });

  it('maps TDental workflow states to local workflow states explicitly', () => {
    expect(mapSaleOrderState('sale')).toBe('pending');
    expect(mapSaleOrderState('done')).toBe('completed');
    expect(mapSaleOrderState('cancel')).toBe('cancelled');
    expect(mapPaymentStatus('posted')).toBe('posted');
    expect(mapPaymentStatus('cancel')).toBe('voided');
  });

  it('maps TDental appointment rows into local appointment rows without timezone conversion', () => {
    expect(mapAppointmentRow({
      Id: 'APPT-ID',
      Name: 'AP123',
      Date: '2026-04-18 09:00:00.0000000',
      PartnerId: partnerId,
      CompanyId: '00000000-0000-0000-0000-000000000004',
      State: 'done',
      TimeExpected: '',
      IsRepeatCustomer: '0',
      IsNoTreatment: '0',
    })).toMatchObject({
      id: 'appt-id',
      name: 'AP123',
      date: '2026-04-18 09:00:00',
      partnerid: partnerId,
      companyid: '00000000-0000-0000-0000-000000000004',
      state: 'completed',
      timeexpected: 30,
    });
  });

  it('normalizes TDental placeholder UUID values to null', () => {
    expect(uuidOrNull('')).toBeNull();
    expect(uuidOrNull('0')).toBeNull();
    expect(mapSaleOrderLineRow({
      Id: '00000000-0000-0000-0000-000000000001',
      OrderId: '00000000-0000-0000-0000-000000000002',
      ProductId: '00000000-0000-0000-0000-000000000003',
      Name: 'Trám răng',
      PriceTotal: '700000.00',
      EmployeeId: '0',
      InsuranceId: '.00',
      PromotionProgramId: '0',
    })).toMatchObject({
      employeeid: null,
      insuranceid: null,
      productid: '00000000-0000-0000-0000-000000000003',
    });
  });

  it('uses exact product UUIDs and imports missing products instead of name remapping', () => {
    const localProductIds = new Set(['existing-product-id']);

    expect(classifyProductReference({ ProductId: 'EXISTING-PRODUCT-ID', Name: 'Same name' }, localProductIds))
      .toMatchObject({ action: 'use_existing', productId: 'existing-product-id' });
    expect(classifyProductReference({ ProductId: 'missing-product-id', Name: 'Same name' }, localProductIds))
      .toMatchObject({ action: 'import_product', productId: 'missing-product-id' });
  });

  it('classifies posted payments by explicit allocation rels and blocks rich receipts until schema is decided', () => {
    expect(classifyPaymentSource(
      { Id: 'pay-1', State: 'posted', Amount: '300000' },
      [{ AccountPaymentId: 'PAY-1', SaleOrderPaymentId: 'sop-1' }],
    )).toMatchObject({ action: 'create_payment_and_allocations', status: 'posted', amount: 300000 });
    expect(classifyPaymentSource({ Id: 'pay-2', State: 'cancel', Amount: '700000' }, []))
      .toMatchObject({ action: 'store_voided_only', status: 'voided', amount: 700000 });
    expect(customerReceiptTargetPolicy()).toMatchObject({ action: 'blocked_until_schema_decision' });
  });

  it('validates order totals against source service line totals before import', () => {
    expect(validateOrderTotals(
      { AmountTotal: '28000000.00' },
      [{ PriceTotal: '20000000.00' }, { PriceTotal: '8000000.00' }],
    )).toMatchObject({ ok: true, orderTotal: 28000000, lineTotal: 28000000, delta: 0 });
  });
});
