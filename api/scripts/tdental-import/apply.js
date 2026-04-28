const crypto = require('crypto');
const {
  mapCompanyRow,
  mapCustomerSourceRow,
  mapEmployeeRow,
  mapPartnerRow,
  mapProductCategoryRow,
  mapProductRow,
} = require('./entity-mappers');
const {
  mapAppointmentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  mapSaleOrderRow,
} = require('./transaction-mappers');
const { buildDryRunSummary, planProductMatches, planStaffMatches, readLocalSnapshot } = require('./dry-run');
const {
  booleanOrNull,
  clean,
  isDeleted,
  normalizeUuid,
  numberOrZero,
  parseCsvTimestamp,
  uuidOrNull,
} = require('./utils');

const DEFAULT_EMPLOYEE_GROUP_ID = '11111111-0000-0000-0000-000000000005';

function deterministicUuid(...parts) {
  const hex = crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function validSourceId(row) {
  return uuidOrNull(row.Id || row.id);
}

function rowsById(rows) {
  return new Map((rows || []).map((row) => [validSourceId(row), row]).filter(([id]) => Boolean(id)));
}

function buildReferenceMaps(source, local) {
  const staffPlan = planStaffMatches(source.employees || [], local);
  const productPlan = planProductMatches(source.products || [], local);
  const staffIdMap = new Map();
  const productIdMap = new Map();
  for (const match of staffPlan.matches) {
    const sourceRow = (source.employees || []).find((row) => validSourceId(row) === match.sourceId);
    const targetId = normalizeUuid(match.targetId || match.sourceId);
    if (match.sourceId && targetId) staffIdMap.set(match.sourceId, targetId);
    const partnerId = uuidOrNull(sourceRow?.PartnerId);
    if (partnerId && targetId) staffIdMap.set(partnerId, targetId);
  }
  for (const match of productPlan.matches) {
    const targetId = normalizeUuid(match.targetId || match.sourceId);
    if (match.sourceId && targetId) productIdMap.set(match.sourceId, targetId);
  }
  return { productIdMap, productPlan, staffIdMap, staffPlan };
}

function remapUuid(value, map) {
  const id = uuidOrNull(value);
  if (!id) return null;
  return map.get(id) || id;
}

function appScopedAnomaly(code, message, row, severity = 'warning', details = {}) {
  return { severity, code, sourceId: normalizeUuid(row?.Id || row?.id), message, details };
}

function sanitizeUuidColumns(row, columns) {
  const next = { ...row };
  for (const column of columns) next[column] = uuidOrNull(next[column]);
  return next;
}

async function batchUpsert(client, table, rows, options = {}) {
  const filtered = rows.filter(Boolean);
  if (filtered.length === 0) return 0;
  const conflict = options.conflict || ['id'];
  const batchSize = options.batchSize || 350;
  let count = 0;
  for (let start = 0; start < filtered.length; start += batchSize) {
    const batch = filtered.slice(start, start + batchSize);
    const columns = Object.keys(batch[0]).filter((column) => batch.some((row) => row[column] !== undefined));
    const values = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(',')})`;
    });
    const updates = columns
      .filter((column) => !conflict.includes(column))
      .map((column) => `${column}=EXCLUDED.${column}`);
    const updateSql = updates.length > 0 ? `DO UPDATE SET ${updates.join(',')}` : 'DO NOTHING';
    await client.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${tuples.join(',')}
       ON CONFLICT (${conflict.join(',')}) ${updateSql}`,
      values,
    );
    count += batch.length;
  }
  return count;
}

function mapProductsForApply(source, refs, targetCompanyIds = new Set()) {
  const actions = new Map(refs.productPlan.matches.map((match) => [match.sourceId, match.action]));
  return (source.products || [])
    .filter((row) => ['exact_match', 'create'].includes(actions.get(validSourceId(row))))
    .map(mapProductRow)
    .map((row) => sanitizeUuidColumns(row, ['categid', 'uomid', 'companyid']))
    .map((row) => ({ ...row, companyid: row.companyid && targetCompanyIds.has(row.companyid) ? row.companyid : null }))
    .filter((row) => uuidOrNull(row.id) && row.name);
}

function mapEmployeesForApply(source, refs) {
  return (source.employees || [])
    .filter((row) => {
      const sourceId = validSourceId(row);
      const targetId = refs.staffIdMap.get(sourceId);
      return sourceId && (!targetId || targetId === sourceId);
    })
    .map(mapEmployeeRow)
    .map((row) => sanitizeUuidColumns(row, ['companyid', 'hrjobid']))
    .filter((row) => uuidOrNull(row.id) && row.name);
}

function mapCustomersForApply(source) {
  return (source.partners || [])
    .filter((row) => booleanOrNull(row.Customer) === true && !isDeleted(row))
    .map(mapPartnerRow)
    .map((row) => sanitizeUuidColumns(row, ['companyid', 'sourceid', 'marketingteamid', 'saleteamid']))
    .filter((row) => uuidOrNull(row.id) && row.name);
}

async function applyLocationScopes(client, staffPlan) {
  let count = 0;
  for (const match of staffPlan.matches.filter((item) => item.needsLocationScope)) {
    await client.query(
      `INSERT INTO employee_location_scope (employee_id, company_id)
       VALUES ($1, $2)
       ON CONFLICT (employee_id, company_id) DO NOTHING`,
      [match.targetId, match.sourceCompanyId],
    );
    await client.query(
      `INSERT INTO employee_permissions (employee_id, group_id, loc_scope)
       SELECT p.id, COALESCE(p.tier_id, $2::uuid), 'assigned'
       FROM partners p
       WHERE p.id = $1
       ON CONFLICT (employee_id) DO UPDATE SET loc_scope = 'assigned'`,
      [match.targetId, DEFAULT_EMPLOYEE_GROUP_ID],
    );
    count += 1;
  }
  return count;
}

function mapAppointmentsForApply(source, refs, targetIds, anomalies) {
  return (source.appointments || []).map((row) => {
    const mapped = mapAppointmentRow(row);
    mapped.doctorid = remapUuid(row.DoctorId, refs.staffIdMap);
    mapped.assistantid = remapUuid(row.AssistantId, refs.staffIdMap);
    mapped.dentalaideid = remapUuid(row.DentalAideId || row.DentalaideId, refs.staffIdMap);
    mapped.productid = remapUuid(row.ProductId, refs.productIdMap);
    if (!uuidOrNull(mapped.id)) return null;
    if (!mapped.partnerid || !targetIds.partners.has(mapped.partnerid)) {
      anomalies.push(appScopedAnomaly('appointment_missing_customer', 'Skipped appointment with missing customer target.', row));
      return null;
    }
    if (!mapped.companyid || !targetIds.companies.has(mapped.companyid)) {
      anomalies.push(appScopedAnomaly('appointment_missing_company', 'Skipped appointment with missing company target.', row));
      return null;
    }
    if (!mapped.date) {
      anomalies.push(appScopedAnomaly('appointment_missing_date', 'Skipped appointment with missing date.', row));
      return null;
    }
    return mapped;
  }).filter(Boolean);
}

function mapSaleOrdersForApply(source, refs, anomalies) {
  const seenCodes = new Map();
  return (source.saleorders || [])
    .filter((row) => !isDeleted(row))
    .map((row) => {
      const mapped = {
        ...mapSaleOrderRow(row),
        doctorid: remapUuid(row.DoctorId, refs.staffIdMap),
        assistantid: remapUuid(row.AssistantId, refs.staffIdMap),
        dentalaideid: remapUuid(row.DentalAideId || row.DentalaideId, refs.staffIdMap),
      };
      const codeKey = clean(mapped.code).toLowerCase();
      if (codeKey && seenCodes.has(codeKey) && seenCodes.get(codeKey) !== mapped.id) {
        mapped.code = `${mapped.code}-${mapped.id.slice(0, 8)}`;
        anomalies.push(appScopedAnomaly('duplicate_saleorder_code_suffixed', 'Sale order display code was duplicated, so local unique code was suffixed while name stayed unchanged.', row, 'warning', { originalCode: clean(row.Name), localCode: mapped.code }));
      } else if (codeKey) {
        seenCodes.set(codeKey, mapped.id);
      }
      return mapped;
    })
    .filter((row) => uuidOrNull(row.id));
}

function mapSaleOrderLinesForApply(source, refs, targetOrderIds, anomalies) {
  return (source.saleorderlines || []).map((row) => {
    if (isDeleted(row)) return null;
    const mapped = {
      ...mapSaleOrderLineRow(row),
      productid: remapUuid(row.ProductId, refs.productIdMap),
      employeeid: remapUuid(row.EmployeeId, refs.staffIdMap),
      assistantid: remapUuid(row.AssistantId, refs.staffIdMap),
      counselorid: remapUuid(row.CounselorId, refs.staffIdMap),
    };
    Object.assign(mapped, sanitizeUuidColumns(mapped, [
      'orderid',
      'productid',
      'employeeid',
      'assistantid',
      'orderpartnerid',
      'companyid',
      'counselorid',
      'taxid',
      'productuomid',
      'toothcategoryid',
      'promotionprogramid',
      'promotionid',
      'couponid',
      'insuranceid',
      'advisoryid',
      'agentid',
      'giftcardid',
      'quotationlineid',
    ]));
    if (!uuidOrNull(mapped.id)) {
      anomalies.push(appScopedAnomaly('saleorderline_invalid_id', 'Skipped service line with invalid source UUID.', row));
      return null;
    }
    if (!mapped.orderid || !targetOrderIds.has(mapped.orderid)) {
      anomalies.push(appScopedAnomaly('saleorderline_missing_order', 'Skipped service line with missing order target.', row));
      return null;
    }
    return mapped;
  }).filter(Boolean);
}

function mapPaymentsForApply(source, targetPartnerIds, anomalies) {
  return (source.accountpayments || []).map((row) => {
    const mapped = mapAccountPaymentToPayment(row);
    if (!uuidOrNull(mapped.id)) return null;
    if (!mapped.customer_id || !targetPartnerIds.has(mapped.customer_id)) {
      anomalies.push(appScopedAnomaly('payment_missing_customer', 'Skipped payment with missing customer target.', row));
      return null;
    }
    return mapped;
  }).filter(Boolean);
}

function mapPaymentAllocationsForApply(source, targetIds, anomalies) {
  const paymentsById = rowsById(source.accountpayments || []);
  const saleOrderPaymentsById = rowsById(source.saleorderpayments || []);
  return (source.saleorderpaymentaccountpaymentrels || []).map((row) => {
    const paymentId = uuidOrNull(row.AccountPaymentId || row.PaymentId);
    const saleOrderPaymentId = uuidOrNull(row.SaleOrderPaymentId);
    const accountPayment = paymentsById.get(paymentId);
    const saleOrderPayment = saleOrderPaymentsById.get(saleOrderPaymentId);
    const orderId = uuidOrNull(saleOrderPayment?.OrderId);
    const amount = numberOrZero(saleOrderPayment?.Amount);
    if (!paymentId || !accountPayment || clean(accountPayment.State).toLowerCase() !== 'posted') return null;
    if (targetIds.payments && !targetIds.payments.has(paymentId)) {
      anomalies.push(appScopedAnomaly('allocation_missing_payment_target', 'Skipped payment allocation because the payment was not imported.', row));
      return null;
    }
    if (!saleOrderPayment || !orderId || !targetIds.saleorders.has(orderId) || amount <= 0) {
      anomalies.push(appScopedAnomaly('allocation_missing_visible_target', 'Skipped payment allocation without visible sale order target.', row));
      return null;
    }
    return {
      id: deterministicUuid('tdental-allocation', paymentId, saleOrderPaymentId, orderId),
      payment_id: paymentId,
      invoice_id: orderId,
      dotkham_id: null,
      allocated_amount: amount,
      created_at: parseCsvTimestamp(saleOrderPayment.Date || accountPayment.DateCreated),
    };
  }).filter(Boolean);
}

async function applyAppScopeMigration(client, source) {
  const local = await readLocalSnapshot(client);
  const refs = buildReferenceMaps(source, local);
  const dryRunSummary = buildDryRunSummary({ source, local });
  const anomalies = [...dryRunSummary.anomalies];
  const companyRows = (source.companies || []).map(mapCompanyRow).map((row) => sanitizeUuidColumns(row, ['partnerid', 'parentid'])).filter((row) => uuidOrNull(row.id) && row.name && row.partnerid);
  const customerRows = mapCustomersForApply(source);
  const saleOrderRows = mapSaleOrdersForApply(source, refs, anomalies);
  const targetIds = {
    companies: new Set([...companyRows.map((row) => row.id), ...local.companiesById.keys()]),
    partners: new Set([...customerRows.map((row) => row.id), ...local.partners]),
    saleorders: new Set([...saleOrderRows.map((row) => row.id), ...local.saleorders]),
  };

  await client.query('BEGIN');
  try {
    const applied = {};
    applied.companies = await batchUpsert(client, 'companies', companyRows);
    applied.productcategories = await batchUpsert(client, 'productcategories', (source.productcategories || []).map(mapProductCategoryRow).map((row) => sanitizeUuidColumns(row, ['parentid'])).filter((row) => uuidOrNull(row.id) && row.name));
    applied.products = await batchUpsert(client, 'products', mapProductsForApply(source, refs, targetIds.companies));
    applied.customersources = await batchUpsert(client, 'customersources', (source.customersources || []).map(mapCustomerSourceRow).filter((row) => uuidOrNull(row.id) && row.name));
    applied.staff = await batchUpsert(client, 'partners', mapEmployeesForApply(source, refs));
    applied.staffLocationScopes = await applyLocationScopes(client, refs.staffPlan);
    applied.customers = await batchUpsert(client, 'partners', customerRows);
    applied.saleorders = await batchUpsert(client, 'saleorders', saleOrderRows);
    const orderIds = new Set([...targetIds.saleorders]);
    applied.saleorderlines = await batchUpsert(client, 'saleorderlines', mapSaleOrderLinesForApply(source, refs, orderIds, anomalies));
    applied.appointments = await batchUpsert(client, 'appointments', mapAppointmentsForApply(source, refs, targetIds, anomalies));
    const paymentRows = mapPaymentsForApply(source, targetIds.partners, anomalies);
    applied.payments = await batchUpsert(client, 'payments', paymentRows);
    const paymentIds = new Set(paymentRows.map((row) => row.id));
    applied.paymentAllocations = await batchUpsert(client, 'payment_allocations', mapPaymentAllocationsForApply(source, { ...targetIds, payments: paymentIds }, anomalies));
    await client.query('COMMIT');
    return { applied, anomalies, dryRunSummary };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  applyAppScopeMigration,
  batchUpsert,
  buildReferenceMaps,
  deterministicUuid,
  mapAppointmentsForApply,
  mapEmployeesForApply,
  mapPaymentAllocationsForApply,
  mapSaleOrderLinesForApply,
};
