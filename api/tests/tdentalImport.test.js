const {
  buildClientImportPlan,
  mapAppointmentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  parseCsvDateOnly,
  parseCsvTimestamp,
} = require('../scripts/tdental-import/import-client');
const { uuidOrNull } = require('../scripts/tdental-import/utils');
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
