const { clean, normalizeUuid, numberOrZero } = require('./utils');

const REQUIRED_SOURCE_TABLES = [
  'companies',
  'productcategories',
  'products',
  'partners',
  'employees',
  'appointments',
  'customerreceipts',
  'saleorders',
  'saleorderlines',
  'accountpayments',
  'saleorderpayments',
  'saleorderpaymentaccountpaymentrels',
  'partneradvances',
];

const IMPORT_DEPENDENCY_ORDER = [
  'companies',
  'productcategories',
  'products',
  'employees',
  'partners',
  'appointments',
  'saleorders',
  'saleorderlines',
  'payments',
  'payment_allocations',
  'partner_advances',
  'customerreceipts',
];

const SALE_ORDER_STATE_MAP = {
  sale: 'pending',
  done: 'completed',
  cancel: 'cancelled',
  cancelled: 'cancelled',
  draft: 'draft',
};

const APPOINTMENT_STATE_MAP = {
  confirm: 'confirmed',
  confirmed: 'confirmed',
  done: 'completed',
  completed: 'completed',
  cancel: 'cancelled',
  cancelled: 'cancelled',
  draft: 'scheduled',
};

const PAYMENT_STATE_MAP = {
  posted: 'posted',
  cancel: 'voided',
  cancelled: 'voided',
  draft: 'draft',
};

const DUPLICATE_PARTNER_KEY_POLICY = {
  ref: 'allowed_warning_only',
  phone: 'allowed_warning_only',
};

function canonicalKey(value) {
  return clean(value).toLowerCase();
}

function findDuplicateKeys(rows, field) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = canonicalKey(row[field]);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([key, matches]) => ({ key, ids: matches.map((row) => normalizeUuid(row.Id)).filter(Boolean) }));
}

function resolvePartnerIdentity(rows, partnerId) {
  const pid = normalizeUuid(partnerId);
  const partner = (rows || []).find((row) => normalizeUuid(row.Id) === pid);
  if (!partner) {
    return {
      partner: null,
      ok: false,
      reason: 'missing_partner_uuid',
      duplicateRefPartners: [],
      duplicatePhonePartners: [],
    };
  }

  const ref = canonicalKey(partner.Ref);
  const phone = canonicalKey(partner.Phone || partner.Mobile || partner.PhoneNumber);
  const duplicateRefPartners = ref
    ? (rows || []).filter((row) => normalizeUuid(row.Id) !== pid && canonicalKey(row.Ref) === ref)
    : [];
  const duplicatePhonePartners = phone
    ? (rows || []).filter((row) => {
        const rowPhone = canonicalKey(row.Phone || row.Mobile || row.PhoneNumber);
        return normalizeUuid(row.Id) !== pid && rowPhone === phone;
      })
    : [];

  return {
    partner,
    ok: true,
    reason: null,
    duplicateRefPartners,
    duplicatePhonePartners,
  };
}

function mapSaleOrderState(value) {
  const state = canonicalKey(value);
  return SALE_ORDER_STATE_MAP[state] || (state || null);
}

function mapAppointmentState(value) {
  const state = canonicalKey(value);
  return APPOINTMENT_STATE_MAP[state] || (state || null);
}

function mapPaymentStatus(value) {
  const state = canonicalKey(value);
  return PAYMENT_STATE_MAP[state] || 'voided';
}

function getTopAssistantId(lines) {
  const counts = new Map();
  for (const line of lines || []) {
    const assistantId = normalizeUuid(line.AssistantId);
    if (!assistantId) continue;
    counts.set(assistantId, (counts.get(assistantId) || 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([assistantId, count]) => ({ assistantId, count }))
    .sort((a, b) => b.count - a.count || a.assistantId.localeCompare(b.assistantId));
  const top = ranked[0] || null;
  const ambiguous = Boolean(top && ranked[1] && ranked[1].count === top.count);

  return {
    assistantId: ambiguous || !top ? null : top.assistantId,
    count: top ? top.count : 0,
    totalWithAssistant: [...counts.values()].reduce((sum, count) => sum + count, 0),
    ranked,
    ambiguous,
  };
}

function classifyProductReference(line, localProductIds = new Set()) {
  const productId = normalizeUuid(line.ProductId);
  if (!productId) return { action: 'manual_review', reason: 'missing_product_id', productId: null };
  if (localProductIds.has(productId)) return { action: 'use_existing', reason: null, productId };
  return { action: 'import_product', reason: 'product_uuid_missing_locally', productId };
}

function classifyPaymentSource(accountPayment, allocationRows = []) {
  const paymentId = normalizeUuid(accountPayment.Id);
  const status = mapPaymentStatus(accountPayment.State);
  const linkedAllocations = (allocationRows || []).filter((row) => {
    const rowPaymentId = normalizeUuid(row.AccountPaymentId || row.PaymentId);
    return rowPaymentId === paymentId;
  });

  if (status !== 'posted') {
    return { action: 'store_voided_only', status, linkedAllocations, amount: numberOrZero(accountPayment.Amount) };
  }

  if (linkedAllocations.length > 0) {
    return { action: 'create_payment_and_allocations', status, linkedAllocations, amount: numberOrZero(accountPayment.Amount) };
  }

  return { action: 'create_unallocated_payment', status, linkedAllocations, amount: numberOrZero(accountPayment.Amount) };
}

function customerReceiptTargetPolicy() {
  return {
    action: 'blocked_until_schema_decision',
    reason: 'source_customerreceipts_has_visit_fields_but_demo_customerreceipts_only_stores_id_and_dateexamination',
    acceptableTargets: ['schema_expansion', 'staging_table_then_ui_mapping'],
  };
}

function validateOrderTotals(order, lines) {
  const lineTotal = (lines || []).reduce((sum, line) => sum + numberOrZero(line.PriceTotal), 0);
  const orderTotal = numberOrZero(order.AmountTotal);
  return {
    ok: Math.abs(orderTotal - lineTotal) < 1,
    orderTotal,
    lineTotal,
    delta: orderTotal - lineTotal,
  };
}

module.exports = {
  APPOINTMENT_STATE_MAP,
  DUPLICATE_PARTNER_KEY_POLICY,
  IMPORT_DEPENDENCY_ORDER,
  PAYMENT_STATE_MAP,
  REQUIRED_SOURCE_TABLES,
  SALE_ORDER_STATE_MAP,
  classifyPaymentSource,
  classifyProductReference,
  customerReceiptTargetPolicy,
  findDuplicateKeys,
  getTopAssistantId,
  mapAppointmentState,
  mapPaymentStatus,
  mapSaleOrderState,
  resolvePartnerIdentity,
  validateOrderTotals,
};
