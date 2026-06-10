'use strict';

const {
  computeCtvRepairPlan,
  classifyServiceCardGap,
  migrationLedgerTargets,
} = require('../nk3CtvIntegrityRepair');

describe('nk3CtvIntegrityRepair — CTV identity planner', () => {
  test('uses dental as canonical for shared CTV rows and normalizes both LOB scopes', () => {
    const plan = computeCtvRepairPlan({
      dentalRows: [{
        id: '4fe5',
        name: 'CTV Test Account',
        phone: '',
        email: 'ctv@clinic.vn',
        password_hash: 'hash-from-dental',
        active: true,
        employee: true,
        customer: false,
        isdeleted: false,
        lob_scope: null,
        referred_by_ctv_id: null,
        created_via: 'admin_create',
      }],
      cosmeticRows: [{
        id: '4fe5',
        name: 'CTV Test Account',
        phone: '0989460997',
        email: 'ctv@clinic.vn',
        password_hash: null,
        active: true,
        employee: false,
        customer: false,
        isdeleted: false,
        lob_scope: null,
        referred_by_ctv_id: null,
        created_via: 'admin_create',
      }],
    });

    expect(plan.dentalUpdates).toEqual([expect.objectContaining({
      id: '4fe5',
      next: expect.objectContaining({ lob_scope: ['dental', 'cosmetic'], customer: false, employee: true }),
      reasons: expect.arrayContaining(['dental_scope_missing_dental', 'dental_scope_missing_cosmetic']),
    })]);
    expect(plan.cosmeticUpdates).toEqual([expect.objectContaining({
      id: '4fe5',
      next: expect.objectContaining({
        phone: '',
        password_hash: 'hash-from-dental',
        active: true,
        employee: true,
        customer: false,
        lob_scope: ['dental', 'cosmetic'],
      }),
      reasons: expect.arrayContaining(['mirror_phone_mismatch', 'mirror_missing_password_hash', 'mirror_employee_mismatch']),
    })]);
  });

  test('creates a dental auth row for an active cosmetic CTV with credentials', () => {
    const plan = computeCtvRepairPlan({
      dentalRows: [],
      cosmeticRows: [{
        id: 'zz',
        name: 'ZZ Move Test',
        phone: '0900000955',
        email: '',
        password_hash: 'cosmetic-hash',
        active: true,
        employee: true,
        customer: false,
        isdeleted: false,
        lob_scope: ['dental', 'cosmetic'],
        referred_by_ctv_id: 'upline',
        created_via: 'admin_create',
      }],
    });

    expect(plan.dentalInserts).toEqual([expect.objectContaining({
      id: 'zz',
      row: expect.objectContaining({
        name: 'ZZ Move Test',
        phone: '0900000955',
        password_hash: 'cosmetic-hash',
        employee: true,
        customer: false,
        lob_scope: ['dental', 'cosmetic'],
      }),
    })]);
    expect(plan.unresolved).toEqual([]);
  });

  test('does not invent a login credential for cosmetic-only CTV rows without a password', () => {
    const plan = computeCtvRepairPlan({
      dentalRows: [],
      cosmeticRows: [{
        id: 'bad',
        name: 'No Password',
        phone: '090',
        password_hash: null,
        active: true,
        employee: false,
        customer: false,
        isdeleted: false,
        lob_scope: ['dental', 'cosmetic'],
      }],
    });

    expect(plan.dentalInserts).toEqual([]);
    expect(plan.unresolved).toEqual([expect.objectContaining({
      id: 'bad',
      reason: 'active_cosmetic_ctv_missing_dental_auth_and_password',
    })]);
  });

  test('normalizes inactive cosmetic-only CTV scope without creating a dental auth row', () => {
    const plan = computeCtvRepairPlan({
      dentalRows: [],
      cosmeticRows: [{
        id: 'inactive-demo',
        name: 'CTV Demo Referrer',
        phone: '',
        password_hash: 'hash',
        active: false,
        employee: true,
        customer: false,
        isdeleted: false,
        lob_scope: null,
      }],
    });

    expect(plan.dentalInserts).toEqual([]);
    expect(plan.unresolved).toEqual([]);
    expect(plan.cosmeticUpdates).toEqual([expect.objectContaining({
      id: 'inactive-demo',
      next: expect.objectContaining({ lob_scope: ['dental', 'cosmetic'], employee: true, customer: false }),
      reasons: ['inactive_cosmetic_ctv_scope_empty'],
    })]);
  });

  test('clears customer=true on a dental CTV auth row because CTV/client identities stay separate', () => {
    const plan = computeCtvRepairPlan({
      dentalRows: [{
        id: 'kien',
        name: 'Trần Trung Kiên',
        phone: '0972020908',
        password_hash: 'hash',
        active: true,
        employee: true,
        customer: true,
        isdeleted: false,
        lob_scope: ['dental', 'cosmetic'],
      }],
      cosmeticRows: [{
        id: 'kien',
        name: 'Trần Trung Kiên',
        phone: '0972020908',
        password_hash: 'hash',
        active: true,
        employee: true,
        customer: false,
        isdeleted: false,
        lob_scope: ['dental', 'cosmetic'],
      }],
    });

    expect(plan.dentalUpdates).toEqual([expect.objectContaining({
      id: 'kien',
      next: expect.objectContaining({ customer: false }),
      reasons: ['dental_ctv_customer_true'],
    })]);
  });
});

describe('nk3CtvIntegrityRepair — service and migration decisions', () => {
  test('soft-cancels invalid service-card gaps instead of creating earnings with bad FKs', () => {
    expect(classifyServiceCardGap({
      lob: 'dental',
      service_line_id: 'line-1',
      order_partner_missing: true,
      product_missing: false,
    })).toEqual({
      action: 'soft_cancel_invalid_service',
      reason: 'missing_customer_or_product',
    });
  });

  test('backfills a valid CTV service-card gap from full service price', () => {
    expect(classifyServiceCardGap({
      lob: 'cosmetic',
      service_line_id: 'line-2',
      order_partner_missing: false,
      product_missing: false,
      ctv_id: 'ctv',
      price: '4000000',
    })).toEqual({
      action: 'backfill_service_card_earning',
      reason: 'valid_ctv_service_without_paymentless_earning',
    });
  });

  test('records the migration ledger files already present in NK3 schema shape', () => {
    expect(migrationLedgerTargets('dental')).toEqual([
      '055_earnings_service_card_created.sql',
      '056_braces_commission_config.sql',
      '057_payout_group_id.sql',
      '058_audit_logs.sql',
    ]);
    expect(migrationLedgerTargets('cosmetic')).toEqual([
      '055_earnings_service_card_created.sql',
      '057_payout_group_id.sql',
    ]);
  });
});
