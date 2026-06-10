'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/nk3CtvIntegrityRepair, scripts/nk3-only/nk3-live-ctv-integrity-repair.js (CLI runner)]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[computeCtvRepairPlan, classifyServiceCardGap, migrationLedgerTargets]
 * @crossref:uses[scripts/nk3-only/nk3-live-ctv-integrity-repair.js, product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md]
 */
const DENTAL_LEDGER_TARGETS = [
  '055_earnings_service_card_created.sql',
  '056_braces_commission_config.sql',
  '057_payout_group_id.sql',
  '058_audit_logs.sql',
];

const COSMETIC_LEDGER_TARGETS = [
  '055_earnings_service_card_created.sql',
  '057_payout_group_id.sql',
];

function toBool(value) {
  return value === true || value === 't' || value === 'true' || value === 1 || value === '1';
}

function normalizeScope(scope) {
  if (!Array.isArray(scope)) return [];
  return Array.from(new Set(scope.filter((lob) => lob === 'dental' || lob === 'cosmetic')));
}

function text(value) {
  return value == null ? '' : String(value);
}

function sameText(a, b) {
  return text(a) === text(b);
}

function canonicalScope(row, hasCosmeticMirror) {
  const current = normalizeScope(row && row.lob_scope);
  const next = ['dental'];
  if (hasCosmeticMirror || current.includes('cosmetic')) next.push('cosmetic');
  return next;
}

function scopeEqual(a, b) {
  const left = normalizeScope(a).sort();
  const right = normalizeScope(b).sort();
  return left.length === right.length && left.every((item, i) => item === right[i]);
}

function mapById(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (row && row.id) map.set(row.id, row);
  }
  return map;
}

function buildDentalUpdate(row, hasCosmeticMirror, cosmeticRow) {
  const next = {};
  const reasons = [];
  const desiredScope = canonicalScope(row, hasCosmeticMirror);
  const currentScope = normalizeScope(row.lob_scope);

  if (!currentScope.includes('dental')) reasons.push('dental_scope_missing_dental');
  if (hasCosmeticMirror && !currentScope.includes('cosmetic')) reasons.push('dental_scope_missing_cosmetic');
  if (!scopeEqual(currentScope, desiredScope)) next.lob_scope = desiredScope;

  if (toBool(row.customer)) {
    next.customer = false;
    reasons.push('dental_ctv_customer_true');
  }
  if (!toBool(row.employee)) {
    next.employee = true;
    reasons.push('dental_ctv_employee_false');
  }
  if (!row.password_hash && cosmeticRow && cosmeticRow.password_hash) {
    next.password_hash = cosmeticRow.password_hash;
    reasons.push('dental_missing_password_hash');
  }

  if (reasons.length > 0) {
    if (next.employee === undefined) next.employee = true;
    if (next.customer === undefined) next.customer = false;
  }

  return reasons.length > 0 ? { id: row.id, next, reasons } : null;
}

function buildCosmeticUpdate(dentalRow, cosmeticRow) {
  const next = {};
  const reasons = [];
  const desiredScope = canonicalScope(dentalRow, true);

  for (const field of ['name', 'phone', 'email', 'password_hash', 'referred_by_ctv_id', 'created_via']) {
    if (!sameText(cosmeticRow[field], dentalRow[field])) {
      next[field] = dentalRow[field] == null ? null : dentalRow[field];
      const reason = field === 'password_hash' && !cosmeticRow[field] && dentalRow[field]
        ? 'mirror_missing_password_hash'
        : `mirror_${field}_mismatch`;
      reasons.push(reason);
    }
  }

  if (toBool(cosmeticRow.active) !== toBool(dentalRow.active)) {
    next.active = toBool(dentalRow.active);
    reasons.push('mirror_active_mismatch');
  }
  if (toBool(cosmeticRow.employee) !== true) {
    next.employee = true;
    reasons.push('mirror_employee_mismatch');
  }
  if (toBool(cosmeticRow.customer) !== false) {
    next.customer = false;
    reasons.push('mirror_customer_mismatch');
  }
  if (!scopeEqual(cosmeticRow.lob_scope, desiredScope)) {
    next.lob_scope = desiredScope;
    reasons.push('mirror_lob_scope_mismatch');
  }

  if (reasons.length > 0) {
    if (next.active === undefined) next.active = toBool(dentalRow.active);
    if (next.employee === undefined) next.employee = true;
    if (next.customer === undefined) next.customer = false;
  }

  return reasons.length > 0 ? { id: dentalRow.id, next, reasons } : null;
}

function dentalInsertFromCosmetic(row) {
  return {
    id: row.id,
    row: {
      id: row.id,
      name: row.name || null,
      phone: row.phone || null,
      email: row.email || null,
      password_hash: row.password_hash,
      is_ctv: true,
      lob_scope: ['dental', 'cosmetic'],
      referred_by_ctv_id: row.referred_by_ctv_id || null,
      active: toBool(row.active),
      employee: true,
      customer: false,
      created_via: row.created_via || 'nk3_ctv_integrity_repair',
    },
    reason: 'active_cosmetic_ctv_missing_dental_auth',
  };
}

function computeCtvRepairPlan({ dentalRows = [], cosmeticRows = [] } = {}) {
  const dentalById = mapById(dentalRows);
  const cosmeticById = mapById(cosmeticRows);
  const plan = {
    dentalUpdates: [],
    cosmeticUpdates: [],
    dentalInserts: [],
    unresolved: [],
  };

  for (const dentalRow of dentalRows) {
    const cosmeticRow = cosmeticById.get(dentalRow.id);
    const dentalUpdate = buildDentalUpdate(dentalRow, !!cosmeticRow, cosmeticRow);
    if (dentalUpdate) plan.dentalUpdates.push(dentalUpdate);
    if (cosmeticRow) {
      const cosmeticUpdate = buildCosmeticUpdate(dentalRow, cosmeticRow);
      if (cosmeticUpdate) plan.cosmeticUpdates.push(cosmeticUpdate);
    } else if (normalizeScope(dentalRow.lob_scope).includes('cosmetic')) {
      plan.unresolved.push({
        id: dentalRow.id,
        reason: 'dental_cosmetic_scope_missing_cosmetic_mirror',
      });
    }
  }

  for (const cosmeticRow of cosmeticRows) {
    if (dentalById.has(cosmeticRow.id)) continue;
    if (toBool(cosmeticRow.isdeleted)) continue;
    if (!toBool(cosmeticRow.active)) {
      if (normalizeScope(cosmeticRow.lob_scope).length === 0) {
        plan.cosmeticUpdates.push({
          id: cosmeticRow.id,
          next: { lob_scope: ['dental', 'cosmetic'], employee: true, customer: false },
          reasons: ['inactive_cosmetic_ctv_scope_empty'],
        });
      }
      continue;
    }
    if (cosmeticRow.password_hash) {
      plan.dentalInserts.push(dentalInsertFromCosmetic(cosmeticRow));
    } else {
      plan.unresolved.push({
        id: cosmeticRow.id,
        reason: 'active_cosmetic_ctv_missing_dental_auth_and_password',
      });
    }
  }

  return plan;
}

function classifyServiceCardGap(row) {
  if (!row) return { action: 'skip', reason: 'missing_row' };
  if (row.order_partner_missing || row.product_missing) {
    return { action: 'soft_cancel_invalid_service', reason: 'missing_customer_or_product' };
  }
  if (!row.ctv_id || !(parseFloat(row.price || 0) > 0)) {
    return { action: 'skip', reason: 'missing_ctv_or_price' };
  }
  return {
    action: 'backfill_service_card_earning',
    reason: 'valid_ctv_service_without_paymentless_earning',
  };
}

function migrationLedgerTargets(lob) {
  if (lob === 'dental') return [...DENTAL_LEDGER_TARGETS];
  if (lob === 'cosmetic') return [...COSMETIC_LEDGER_TARGETS];
  throw new Error(`Invalid LOB: ${lob}`);
}

module.exports = {
  computeCtvRepairPlan,
  classifyServiceCardGap,
  migrationLedgerTargets,
  normalizeScope,
  toBool,
};
