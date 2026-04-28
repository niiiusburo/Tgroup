const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  booleanOrNull,
  clean,
  isDeleted,
  normalizeUuid,
  numberOrZero,
  readCsv,
  uuidOrNull,
} = require('./utils');
const {
  chooseCanonicalEmployee,
  normalizeAliasName,
  normalizeMatchName,
  sourceEmployeeCandidate,
} = require('./staff-identity');

const APP_SCOPE_TABLE_FILES = {
  companies: 'dbo.Companies.csv',
  productcategories: 'dbo.ProductCategories.csv',
  products: 'dbo.Products.csv',
  partners: 'dbo.Partners.csv',
  employees: 'dbo.Employees.csv',
  customersources: 'dbo.PartnerSources.csv',
  appointments: 'dbo.Appointments.csv',
  saleorders: 'dbo.SaleOrders.csv',
  saleorderlines: 'dbo.SaleOrderLines.csv',
  accountpayments: 'dbo.AccountPayments.csv',
  saleorderpayments: 'dbo.SaleOrderPayments.csv',
  saleorderpaymentaccountpaymentrels: 'dbo.SaleOrderPaymentAccountPaymentRels.csv',
  partneradvances: 'dbo.PartnerAdvances.csv',
  accountjournals: 'dbo.AccountJournals.csv',
};

const EXCLUDED_TARGETS = [
  'dotkhams',
  'dotkhamsteps',
  'dotkham_internal_lines',
  'quotations',
  'customerreceipt_internals',
  'tooth_diagnosis_tables',
];

function sourceId(row) {
  return normalizeUuid(row.Id || row.id);
}

function getSourceCompanyId(row) {
  return uuidOrNull(row.CompanyId || row.companyid);
}

function toSet(value) {
  if (value instanceof Set) return value;
  return new Set((value || []).map((item) => normalizeUuid(item)).filter(Boolean));
}

function indexBy(rows, keyFn) {
  const index = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }
  return index;
}

function planStaffMatches(sourceEmployees, local) {
  const employees = local.employees || [];
  const byId = new Map();
  for (const employee of employees) {
    byId.set(normalizeUuid(employee.id), employee);
  }
  const byName = indexBy(employees, (employee) => normalizeMatchName(employee.name));
  const byAlias = indexBy(employees, (employee) => normalizeAliasName(employee.name));
  const localCanonicalByName = new Map(
    [...byName.entries()].map(([key, rows]) => [key, chooseCanonicalEmployee(rows)]),
  );
  const localCanonicalByAlias = new Map(
    [...byAlias.entries()].map(([key, rows]) => [key, chooseCanonicalEmployee(rows)]),
  );
  const sourceCandidatesByAlias = indexBy(
    sourceEmployees
      .map((row) => {
        const id = sourceId(row);
        const aliasKey = normalizeAliasName(row.Name || row.DisplayName);
        return id && aliasKey ? { row, aliasKey, candidate: sourceEmployeeCandidate(row, id) } : null;
      })
      .filter(Boolean),
    (item) => item.aliasKey,
  );
  const sourceCanonicalByAlias = new Map(
    [...sourceCandidatesByAlias.entries()].map(([key, rows]) => [
      key,
      chooseCanonicalEmployee(rows.map((item) => item.candidate)),
    ]),
  );
  const anomalies = [];
  const matches = [];
  const summary = {
    sourceCount: sourceEmployees.length,
    exactMatches: 0,
    nameMatches: 0,
    aliasNameMatches: 0,
    sourceDuplicateMatches: 0,
    creates: 0,
    locationScopeAdds: 0,
    ambiguousNameMatches: 0,
    ambiguousAliasMatches: 0,
  };

  for (const row of sourceEmployees) {
    const id = sourceId(row);
    const partnerId = normalizeUuid(row.PartnerId);
    const name = clean(row.Name || row.DisplayName);
    const nameKey = normalizeMatchName(name);
    const aliasKey = normalizeAliasName(name);
    const sourceCompanyId = getSourceCompanyId(row);
    const exact = byId.get(id) || byId.get(partnerId);
    const nameMatches = nameKey ? byName.get(nameKey) || [] : [];
    const aliasMatches = aliasKey ? byAlias.get(aliasKey) || [] : [];
    let target = exact || null;
    let action = exact ? 'exact_match' : 'create';

    if (!target && nameMatches.length > 0) {
      target = localCanonicalByName.get(nameKey);
      action = 'name_match';
      summary.nameMatches += 1;
      if (nameMatches.length > 1) {
        summary.ambiguousNameMatches += 1;
        anomalies.push({
          severity: 'warning',
          code: 'duplicate_local_employee_name',
          sourceTable: 'Employees',
          sourceId: id,
          targetId: target.id,
          message: `Matched staff "${name}" to one existing employee, but ${nameMatches.length} local employees share that name.`,
          details: { localEmployeeIds: nameMatches.map((employee) => employee.id) },
        });
      }
    } else if (!target && aliasMatches.length > 0) {
      target = localCanonicalByAlias.get(aliasKey);
      action = 'alias_name_match';
      summary.aliasNameMatches += 1;
      if (aliasMatches.length > 1) {
        summary.ambiguousAliasMatches += 1;
        anomalies.push({
          severity: 'warning',
          code: 'duplicate_local_employee_alias',
          sourceTable: 'Employees',
          sourceId: id,
          targetId: target.id,
          message: `Matched staff "${name}" to one existing employee by alias, but ${aliasMatches.length} local employees share that alias.`,
          details: { localEmployeeIds: aliasMatches.map((employee) => employee.id) },
        });
      }
    } else if (target) {
      summary.exactMatches += 1;
    } else {
      target = sourceCanonicalByAlias.get(aliasKey) || { id, name, loc_scope: 'assigned', location_ids: [] };
      if (target.id === id) {
        action = 'create';
        summary.creates += 1;
      } else {
        action = 'source_alias_match';
        summary.sourceDuplicateMatches += 1;
      }
    }

    const locationIds = new Set((target?.location_ids || []).map(normalizeUuid).filter(Boolean));
    const needsLocationScope = Boolean(
      target &&
      sourceCompanyId &&
      clean(target.loc_scope).toLowerCase() !== 'all' &&
      !locationIds.has(sourceCompanyId),
    );

    if (needsLocationScope) {
      summary.locationScopeAdds += 1;
      anomalies.push({
        severity: 'info',
        code: 'staff_location_scope_add',
        sourceTable: 'Employees',
        sourceId: id,
        targetId: target.id,
        message: `Would add ${name} to ${local.companiesById?.get(sourceCompanyId)?.name || sourceCompanyId} location scope.`,
        details: { sourceCompanyId },
      });
    }

    matches.push({
      sourceId: id,
      sourceName: name,
      sourceCompanyId,
      action,
      targetId: target?.id || null,
      targetName: target?.name || null,
      needsLocationScope,
    });
  }

  return { summary, matches, anomalies };
}

function productScore(product) {
  return [
    clean(product.defaultcode) ? 2 : 0,
    Number.isFinite(Number(product.listprice)) ? 1 : 0,
    clean(product.categid) ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function chooseCanonicalProduct(matches) {
  return [...matches].sort((a, b) => productScore(b) - productScore(a) || clean(a.id).localeCompare(clean(b.id)))[0];
}

function planProductMatches(sourceProducts, local) {
  const products = local.products || [];
  const byId = new Map(products.map((product) => [normalizeUuid(product.id), product]));
  const byDefaultCode = indexBy(products, (product) => clean(product.defaultcode).toLowerCase());
  const byName = indexBy(products, (product) => normalizeMatchName(product.name));
  const anomalies = [];
  const matches = [];
  const summary = {
    sourceCount: sourceProducts.length,
    exactMatches: 0,
    defaultCodeMatches: 0,
    nameMatches: 0,
    ambiguousNameMatches: 0,
    creates: 0,
  };

  for (const row of sourceProducts) {
    const id = sourceId(row);
    const name = clean(row.Name);
    const defaultCode = clean(row.DefaultCode).toLowerCase();
    const nameKey = normalizeMatchName(name);
    const exact = byId.get(id);
    const codeMatches = defaultCode ? byDefaultCode.get(defaultCode) || [] : [];
    const nameMatches = nameKey ? byName.get(nameKey) || [] : [];
    let action = 'create';
    let target = null;

    if (exact) {
      action = 'exact_match';
      target = exact;
      summary.exactMatches += 1;
    } else if (codeMatches.length === 1) {
      action = 'default_code_match';
      target = codeMatches[0];
      summary.defaultCodeMatches += 1;
    } else if (nameMatches.length > 0) {
      action = 'name_match';
      target = chooseCanonicalProduct(nameMatches);
      summary.nameMatches += 1;
      if (nameMatches.length > 1) {
        summary.ambiguousNameMatches += 1;
        anomalies.push({
          severity: 'warning',
          code: 'duplicate_local_service_name',
          sourceTable: 'Products',
          sourceId: id,
          targetId: target.id,
          message: `Matched service "${name}" by name, but ${nameMatches.length} local services share that name.`,
          details: { localProductIds: nameMatches.map((product) => product.id) },
        });
      }
    } else {
      summary.creates += 1;
    }

    matches.push({
      sourceId: id,
      sourceName: name,
      action,
      targetId: target?.id || null,
      targetName: target?.name || null,
    });
  }

  return { summary, matches, anomalies };
}

function countCreatesUpdates(rows, existingIds, filter = () => true) {
  const ids = toSet(existingIds);
  let creates = 0;
  let updates = 0;
  for (const row of rows || []) {
    if (!filter(row)) continue;
    const id = sourceId(row);
    if (!id) continue;
    if (ids.has(id)) updates += 1;
    else creates += 1;
  }
  return { sourceCount: creates + updates, creates, updates };
}

function planPaymentAllocations(source) {
  const paymentsById = new Set((source.accountpayments || []).map(sourceId).filter(Boolean));
  const saleOrdersById = new Set((source.saleorders || []).map(sourceId).filter(Boolean));
  const saleOrderPaymentsById = new Map((source.saleorderpayments || []).map((row) => [sourceId(row), row]));
  const anomalies = [];
  const summary = {
    relationRows: (source.saleorderpaymentaccountpaymentrels || []).length,
    orderBacked: 0,
    missingAccountPayment: 0,
    missingSaleOrderPayment: 0,
    missingSaleOrder: 0,
    dotkhamOnlyIgnored: 0,
    unallocated: 0,
  };

  for (const row of source.saleorderpaymentaccountpaymentrels || []) {
    const paymentId = normalizeUuid(row.AccountPaymentId || row.PaymentId);
    const saleOrderPaymentId = normalizeUuid(row.SaleOrderPaymentId);
    const saleOrderPayment = saleOrderPaymentsById.get(saleOrderPaymentId);

    if (!paymentsById.has(paymentId)) {
      summary.missingAccountPayment += 1;
      anomalies.push({ severity: 'warning', code: 'allocation_missing_account_payment', sourceTable: 'SaleOrderPaymentAccountPaymentRels', sourceId: paymentId, message: 'Allocation relation points to a missing account payment.' });
    }
    if (!saleOrderPayment) {
      summary.missingSaleOrderPayment += 1;
      anomalies.push({ severity: 'warning', code: 'allocation_missing_sale_order_payment', sourceTable: 'SaleOrderPaymentAccountPaymentRels', sourceId: saleOrderPaymentId, message: 'Allocation relation points to a missing sale order payment row.' });
      continue;
    }

    const orderId = normalizeUuid(saleOrderPayment.OrderId);
    const dotkhamId = normalizeUuid(saleOrderPayment.DotKhamId);
    if (orderId) {
      if (saleOrdersById.has(orderId)) summary.orderBacked += 1;
      else {
        summary.missingSaleOrder += 1;
        anomalies.push({ severity: 'warning', code: 'allocation_missing_sale_order', sourceTable: 'SaleOrderPayments', sourceId: saleOrderPaymentId, message: 'Sale order payment points to a missing sale order.', details: { orderId } });
      }
    } else if (dotkhamId) {
      summary.dotkhamOnlyIgnored += 1;
      anomalies.push({ severity: 'info', code: 'allocation_dotkham_only_ignored', sourceTable: 'SaleOrderPayments', sourceId: saleOrderPaymentId, message: 'Payment allocation only points to dotkham, which is outside the approved import scope.', details: { dotkhamId } });
    } else {
      summary.unallocated += 1;
      anomalies.push({ severity: 'warning', code: 'allocation_without_order_target', sourceTable: 'SaleOrderPayments', sourceId: saleOrderPaymentId, message: 'Sale order payment has no visible order target.' });
    }
  }

  return { summary, anomalies };
}

function buildDryRunSummary({ source, local, sourceWarnings = [] }) {
  const staffPlan = planStaffMatches(source.employees || [], local);
  const productPlan = planProductMatches(source.products || [], local);
  const allocationPlan = planPaymentAllocations(source);
  const customerFilter = (row) => booleanOrNull(row.Customer) === true && !isDeleted(row);
  const postedPaymentFilter = (row) => clean(row.State).toLowerCase() === 'posted';
  const voidedPaymentFilter = (row) => clean(row.State).toLowerCase() !== 'posted';
  const anomalies = [
    ...sourceWarnings.map((warning) => ({ severity: 'warning', code: 'source_file_missing', message: warning })),
    ...staffPlan.anomalies,
    ...productPlan.anomalies,
    ...allocationPlan.anomalies,
  ];

  return {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    scope: {
      includedTargets: ['partners', 'employees', 'employee_location_scope', 'companies', 'products', 'productcategories', 'appointments', 'saleorders', 'saleorderlines', 'payments', 'payment_allocations', 'customersources'],
      excludedTargets: EXCLUDED_TARGETS,
    },
    sourceCounts: Object.fromEntries(Object.keys(APP_SCOPE_TABLE_FILES).map((key) => [key, (source[key] || []).length])),
    entities: {
      customers: countCreatesUpdates(source.partners || [], local.partners, customerFilter),
      appointments: countCreatesUpdates(source.appointments || [], local.appointments),
      saleOrders: countCreatesUpdates(source.saleorders || [], local.saleorders, (row) => !isDeleted(row)),
      saleOrderLines: countCreatesUpdates(source.saleorderlines || [], local.saleorderlines, (row) => !isDeleted(row)),
      payments: {
        ...countCreatesUpdates(source.accountpayments || [], local.payments),
        postedSourceCount: (source.accountpayments || []).filter(postedPaymentFilter).length,
        voidedSourceCount: (source.accountpayments || []).filter(voidedPaymentFilter).length,
        postedSourceTotal: (source.accountpayments || []).filter(postedPaymentFilter).reduce((sum, row) => sum + numberOrZero(row.Amount), 0),
      },
      staff: staffPlan.summary,
      services: productPlan.summary,
      paymentAllocations: allocationPlan.summary,
    },
    anomalies,
    anomalyCounts: anomalies.reduce((acc, anomaly) => {
      acc[anomaly.code] = (acc[anomaly.code] || 0) + 1;
      return acc;
    }, {}),
  };
}

function readCsvIfExists(file) {
  if (!fs.existsSync(file)) return { rows: [], warning: `Missing export file: ${file}` };
  return { rows: readCsv(file), warning: null };
}

function loadAppScopeSourceFromDir(exportDir) {
  const source = {};
  const warnings = [];
  for (const [key, file] of Object.entries(APP_SCOPE_TABLE_FILES)) {
    const result = readCsvIfExists(path.join(exportDir, file));
    source[key] = result.rows;
    if (result.warning) warnings.push(result.warning);
  }
  return { source, warnings };
}

function loadAppScopeSourceFromArchive(archivePath) {
  const members = execFileSync('bsdtar', ['-tf', archivePath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter(Boolean);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdental-dry-run-'));
  const source = {};
  const warnings = [];

  for (const [key, file] of Object.entries(APP_SCOPE_TABLE_FILES)) {
    const member = members.find((entry) => path.basename(entry) === file);
    if (!member) {
      source[key] = [];
      warnings.push(`Missing archive member: ${file}`);
      continue;
    }
    const content = execFileSync('bsdtar', ['-xOf', archivePath, member], { maxBuffer: 1024 * 1024 * 1024 });
    const extracted = path.join(tempDir, file);
    fs.writeFileSync(extracted, content);
    source[key] = readCsv(extracted);
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  return { source, warnings };
}

async function readLocalSnapshot(client) {
  const employees = await client.query(`
      SELECT e.id::text, e.name, e.ref, e.phone, e.email, e.companyid::text, ep.loc_scope,
             e.active, e.isdoctor, e.isassistant, e.isreceptionist,
             COALESCE(ARRAY_AGG(els.company_id::text) FILTER (WHERE els.company_id IS NOT NULL), '{}'::text[]) AS location_ids
      FROM employees e
      LEFT JOIN employee_permissions ep ON ep.employee_id = e.id
      LEFT JOIN employee_location_scope els ON els.employee_id = e.id
      GROUP BY e.id, e.name, e.ref, e.phone, e.email, e.companyid, ep.loc_scope,
               e.active, e.isdoctor, e.isassistant, e.isreceptionist
    `);
  const products = await client.query('SELECT id::text, name, defaultcode, categid::text, listprice, saleprice, companyid::text FROM products');
  const companies = await client.query('SELECT id::text, name FROM companies');
  const ids = await client.query(`
      SELECT 'partners' AS kind, id::text FROM partners
      UNION ALL SELECT 'appointments', id::text FROM appointments
      UNION ALL SELECT 'saleorders', id::text FROM saleorders
      UNION ALL SELECT 'saleorderlines', id::text FROM saleorderlines
      UNION ALL SELECT 'payments', id::text FROM payments
    `);

  const byKind = ids.rows.reduce((acc, row) => {
    if (!acc[row.kind]) acc[row.kind] = new Set();
    acc[row.kind].add(normalizeUuid(row.id));
    return acc;
  }, {});

  return {
    partners: byKind.partners || new Set(),
    appointments: byKind.appointments || new Set(),
    saleorders: byKind.saleorders || new Set(),
    saleorderlines: byKind.saleorderlines || new Set(),
    payments: byKind.payments || new Set(),
    employees: employees.rows,
    products: products.rows,
    companiesById: new Map(companies.rows.map((row) => [normalizeUuid(row.id), row])),
  };
}

module.exports = {
  APP_SCOPE_TABLE_FILES,
  EXCLUDED_TARGETS,
  buildDryRunSummary,
  loadAppScopeSourceFromArchive,
  loadAppScopeSourceFromDir,
  normalizeAliasName,
  normalizeMatchName,
  planPaymentAllocations,
  planProductMatches,
  planStaffMatches,
  readLocalSnapshot,
};
