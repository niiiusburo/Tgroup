const { clean, isDeleted, normalizeUuid, numberOrZero } = require('./utils');
const {
  classifyProductReference,
  getTopAssistantId,
  resolvePartnerIdentity,
  validateOrderTotals,
} = require('./mapping-rules');

function selectClientRows(source, partnerId) {
  const pid = normalizeUuid(partnerId);
  const identity = resolvePartnerIdentity(source.partners || [], pid);
  if (!identity.ok) throw new Error(`Partner not found in export: ${partnerId}`);
  const { partner, duplicateRefPartners, duplicatePhonePartners } = identity;

  const orders = (source.saleorders || []).filter((row) => normalizeUuid(row.PartnerId) === pid && !isDeleted(row));
  const appointments = (source.appointments || []).filter((row) => normalizeUuid(row.PartnerId) === pid);
  const orderIds = new Set(orders.map((row) => normalizeUuid(row.Id)));
  const lines = (source.saleorderlines || []).filter(
    (row) =>
      !isDeleted(row) &&
      (normalizeUuid(row.OrderPartnerId) === pid || orderIds.has(normalizeUuid(row.OrderId))),
  );
  const payments = (source.accountpayments || []).filter((row) => normalizeUuid(row.PartnerId) === pid);
  const productIds = new Set(lines.map((row) => normalizeUuid(row.ProductId)).filter(Boolean));
  const products = (source.products || []).filter((row) => productIds.has(normalizeUuid(row.Id)));
  const localProductIds = new Set((source.products || []).map((row) => normalizeUuid(row.Id)).filter(Boolean));
  const categoryIds = new Set(products.map((row) => normalizeUuid(row.CategId)).filter(Boolean));
  const productcategories = (source.productcategories || []).filter((row) => categoryIds.has(normalizeUuid(row.Id)));
  const companyIds = new Set([
    normalizeUuid(partner.CompanyId),
    ...orders.map((row) => normalizeUuid(row.CompanyId)),
    ...lines.map((row) => normalizeUuid(row.CompanyId)),
    ...payments.map((row) => normalizeUuid(row.CompanyId)),
    ...products.map((row) => normalizeUuid(row.CompanyId)),
  ].filter(Boolean));
  const companies = (source.companies || []).filter((row) => companyIds.has(normalizeUuid(row.Id)));
  const employeeIds = new Set([
    ...lines.flatMap((row) => [row.EmployeeId, row.AssistantId, row.CounselorId]),
    ...orders.map((row) => row.DoctorId),
    ...appointments.map((row) => row.DoctorId),
  ].map(normalizeUuid).filter(Boolean));
  const staffEmployees = (source.employees || []).filter((row) => employeeIds.has(normalizeUuid(row.Id)));
  const salesStaff = getTopAssistantId(lines);
  const productActions = lines.map((line) => classifyProductReference(line, localProductIds));
  const orderTotalChecks = orders.map((order) => validateOrderTotals(
    order,
    lines.filter((line) => normalizeUuid(line.OrderId) === normalizeUuid(order.Id)),
  ));

  return {
    partner,
    duplicateRefPartners,
    duplicatePhonePartners,
    companies,
    productcategories,
    products,
    staffEmployees,
    orders,
    lines,
    appointments,
    payments,
    mapping: {
      salesStaff,
      productActions,
      orderTotalChecks,
    },
  };
}

function sumRows(rows, field) {
  return rows.reduce((sum, row) => sum + numberOrZero(row[field]), 0);
}

function buildClientImportPlan(source, local, partnerId) {
  const rows = selectClientRows(source, partnerId);
  const sourceLineIds = new Set(rows.lines.map((row) => normalizeUuid(row.Id)));
  const missingLines = rows.lines.filter((row) => !local.lineIds.has(normalizeUuid(row.Id)));
  const posted = rows.payments.filter((row) => clean(row.State).toLowerCase() === 'posted');
  const voided = rows.payments.filter((row) => clean(row.State).toLowerCase() !== 'posted');

  return {
    partner: rows.partner,
    duplicateRefPartners: rows.duplicateRefPartners,
    duplicatePhonePartners: rows.duplicatePhonePartners,
    rows,
    mapping: rows.mapping,
    source: {
      lineCount: rows.lines.length,
      lineTotal: sumRows(rows.lines, 'PriceTotal'),
      lineIds: sourceLineIds,
    },
    local: {
      lineCount: local.lineCount,
      lineTotal: local.lineTotal,
    },
    missing: {
      lines: missingLines,
      lineCount: missingLines.length,
      lineTotal: sumRows(missingLines, 'PriceTotal'),
      orderIds: new Set(missingLines.map((row) => normalizeUuid(row.OrderId))),
    },
    payments: {
      postedCount: posted.length,
      postedTotal: sumRows(posted, 'Amount'),
      voidedCount: voided.length,
      voidedTotal: sumRows(voided, 'Amount'),
    },
  };
}

module.exports = { buildClientImportPlan, selectClientRows };
