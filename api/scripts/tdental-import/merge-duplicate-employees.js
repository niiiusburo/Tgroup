#!/usr/bin/env node

const { Client } = require('pg');
const { DEFAULT_DB, clean, normalizeUuid, uuidOrNull } = require('./utils');
const { chooseCanonicalEmployee, normalizeAliasName } = require('./staff-identity');

const UUID_REFERENCE_COLUMNS = [
  ['appointments', 'doctorid'],
  ['appointments', 'assistantid'],
  ['appointments', 'dentalaideid'],
  ['saleorders', 'doctorid'],
  ['saleorders', 'assistantid'],
  ['saleorders', 'dentalaideid'],
  ['saleorderlines', 'employeeid'],
  ['saleorderlines', 'assistantid'],
  ['saleorderlines', 'counselorid'],
  ['dotkhams', 'doctorid'],
  ['dotkhams', 'assistantid'],
  ['partners', 'salestaffid'],
  ['partners', 'cskhid'],
  ['feedback_threads', 'employee_id'],
  ['feedback_messages', 'author_id'],
];

const TEXT_REFERENCE_COLUMNS = [
  ['partners', 'marketingstaffid'],
  ['partners', 'referraluserid'],
];

const PERMISSION_OVERRIDE_COLUMNS = [['permission_overrides', 'employee_id']];

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

function refTotal(row) {
  return Object.values(row.refCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function locationScopeRows(group, canonical, companiesById) {
  const existing = new Set((canonical.location_ids || []).map(normalizeUuid).filter(Boolean));
  const wanted = new Set();
  for (const row of group) {
    if (uuidOrNull(row.companyid)) wanted.add(normalizeUuid(row.companyid));
    for (const companyId of row.location_ids || []) {
      if (uuidOrNull(companyId)) wanted.add(normalizeUuid(companyId));
    }
  }
  return [...wanted]
    .filter((companyId) => !existing.has(companyId))
    .sort()
    .map((companyId) => ({
      companyId,
      companyName: companiesById.get(companyId)?.name || companyId,
    }));
}

function buildEmployeeMergePlan({ employees, companiesById = new Map() }) {
  const groupsByAlias = indexBy(
    (employees || []).filter((row) => uuidOrNull(row.id) && normalizeAliasName(row.name)),
    (row) => normalizeAliasName(row.name),
  );
  const groups = [];

  for (const [aliasKey, rows] of groupsByAlias.entries()) {
    if (rows.length < 2) continue;
    const canonical = chooseCanonicalEmployee(rows);
    const duplicates = rows
      .filter((row) => normalizeUuid(row.id) !== normalizeUuid(canonical.id))
      .sort((a, b) => clean(a.name).localeCompare(clean(b.name)) || clean(a.id).localeCompare(clean(b.id)));
    if (duplicates.length === 0) continue;
    const totalRefsToMove = duplicates.reduce((sum, row) => sum + refTotal(row), 0);
    groups.push({
      aliasKey,
      exactNames: [...new Set(rows.map((row) => clean(row.name)).filter(Boolean))].sort(),
      canonicalId: normalizeUuid(canonical.id),
      canonicalName: clean(canonical.name),
      canonicalCompanyId: normalizeUuid(canonical.companyid),
      canonicalCompanyName: companiesById.get(normalizeUuid(canonical.companyid))?.name || null,
      duplicateIds: duplicates.map((row) => normalizeUuid(row.id)),
      duplicateRows: duplicates.map((row) => ({
        id: normalizeUuid(row.id),
        name: clean(row.name),
        companyId: normalizeUuid(row.companyid),
        companyName: companiesById.get(normalizeUuid(row.companyid))?.name || null,
        active: row.active,
        refCount: refTotal(row),
        refCounts: row.refCounts || {},
      })),
      locationScopesToAdd: locationScopeRows(rows, canonical, companiesById),
      totalRefsToMove,
    });
  }

  groups.sort((a, b) => b.totalRefsToMove - a.totalRefsToMove || a.aliasKey.localeCompare(b.aliasKey));
  return {
    generatedAt: new Date().toISOString(),
    groupCount: groups.length,
    duplicateRowsToRetire: groups.reduce((sum, group) => sum + group.duplicateIds.length, 0),
    totalRefsToMove: groups.reduce((sum, group) => sum + group.totalRefsToMove, 0),
    groups,
  };
}

async function countReferences(client, table, column, ids, type = 'uuid') {
  if (ids.length === 0) return new Map();
  const cast = type === 'uuid' ? 'uuid[]' : 'text[]';
  const res = await client.query(
    `SELECT ${column}::text AS id, COUNT(*)::int AS count
     FROM ${table}
     WHERE ${column} = ANY($1::${cast})
     GROUP BY ${column}`,
    [ids],
  );
  return new Map(res.rows.map((row) => [normalizeUuid(row.id), Number(row.count)]));
}

async function readReferenceCounts(client, ids) {
  const refCounts = new Map(ids.map((id) => [normalizeUuid(id), {}]));
  for (const [table, column] of UUID_REFERENCE_COLUMNS) {
    const counts = await countReferences(client, table, column, ids, 'uuid');
    for (const [id, count] of counts.entries()) {
      refCounts.get(id)[`${table}.${column}`] = count;
    }
  }
  for (const [table, column] of TEXT_REFERENCE_COLUMNS) {
    const counts = await countReferences(client, table, column, ids, 'text');
    for (const [id, count] of counts.entries()) {
      refCounts.get(id)[`${table}.${column}`] = count;
    }
  }
  for (const [table, column] of PERMISSION_OVERRIDE_COLUMNS) {
    const counts = await countReferences(client, table, column, ids, 'uuid');
    for (const [id, count] of counts.entries()) {
      refCounts.get(id)[`${table}.${column}`] = count;
    }
  }
  return refCounts;
}

async function readEmployees(client) {
  const employees = await client.query(`
    SELECT p.id::text, p.name, p.ref, p.phone, p.email, p.companyid::text,
           p.active, p.isdoctor, p.isassistant, p.isreceptionist,
           COALESCE(ARRAY_AGG(els.company_id::text) FILTER (WHERE els.company_id IS NOT NULL), '{}'::text[]) AS location_ids
    FROM partners p
    LEFT JOIN employee_location_scope els ON els.employee_id = p.id
    WHERE p.employee = true
      AND COALESCE(p.isdeleted, false) = false
      AND BTRIM(COALESCE(p.name, '')) <> ''
    GROUP BY p.id, p.name, p.ref, p.phone, p.email, p.companyid,
             p.active, p.isdoctor, p.isassistant, p.isreceptionist
  `);
  const companies = await client.query('SELECT id::text, name FROM companies');
  const ids = employees.rows.map((row) => normalizeUuid(row.id)).filter(Boolean);
  const refCounts = await readReferenceCounts(client, ids);
  return {
    employees: employees.rows.map((row) => ({
      ...row,
      refCounts: refCounts.get(normalizeUuid(row.id)) || {},
    })),
    companiesById: new Map(companies.rows.map((row) => [normalizeUuid(row.id), row])),
  };
}

async function applyReferenceUpdates(client, canonicalId, duplicateIds) {
  let updated = 0;
  for (const [table, column] of UUID_REFERENCE_COLUMNS) {
    const res = await client.query(
      `UPDATE ${table} SET ${column} = $1 WHERE ${column} = ANY($2::uuid[])`,
      [canonicalId, duplicateIds],
    );
    updated += res.rowCount;
  }
  for (const [table, column] of TEXT_REFERENCE_COLUMNS) {
    const res = await client.query(
      `UPDATE ${table} SET ${column} = $1 WHERE ${column} = ANY($2::text[])`,
      [canonicalId, duplicateIds],
    );
    updated += res.rowCount;
  }
  return updated;
}

async function movePermissionOverrides(client, canonicalId, duplicateIds) {
  const inserted = await client.query(
    `INSERT INTO permission_overrides (employee_id, permission, override_type)
     SELECT $1, permission, override_type
     FROM permission_overrides
     WHERE employee_id = ANY($2::uuid[])
     ON CONFLICT (employee_id, permission)
     DO UPDATE SET override_type = EXCLUDED.override_type`,
    [canonicalId, duplicateIds],
  );
  const deleted = await client.query('DELETE FROM permission_overrides WHERE employee_id = ANY($1::uuid[])', [duplicateIds]);
  return inserted.rowCount + deleted.rowCount;
}

async function applyGroup(client, group) {
  const canonicalId = group.canonicalId;
  const duplicateIds = group.duplicateIds;
  let scopesAdded = 0;

  for (const scope of group.locationScopesToAdd) {
    const res = await client.query(
      `INSERT INTO employee_location_scope (employee_id, company_id)
       VALUES ($1, $2)
       ON CONFLICT (employee_id, company_id) DO NOTHING`,
      [canonicalId, scope.companyId],
    );
    scopesAdded += res.rowCount;
  }

  await client.query(
    `UPDATE partners canonical
     SET isdoctor = COALESCE(canonical.isdoctor, false) OR flags.isdoctor,
         isassistant = COALESCE(canonical.isassistant, false) OR flags.isassistant,
         isreceptionist = COALESCE(canonical.isreceptionist, false) OR flags.isreceptionist,
         lastupdated = NOW()
     FROM (
       SELECT COALESCE(BOOL_OR(isdoctor), false) AS isdoctor,
              COALESCE(BOOL_OR(isassistant), false) AS isassistant,
              COALESCE(BOOL_OR(isreceptionist), false) AS isreceptionist
       FROM partners
       WHERE id = ANY($2::uuid[])
     ) flags
     WHERE canonical.id = $1`,
    [canonicalId, duplicateIds],
  );

  const referencesUpdated = await applyReferenceUpdates(client, canonicalId, duplicateIds);
  const permissionOverridesMoved = await movePermissionOverrides(client, canonicalId, duplicateIds);

  await client.query('DELETE FROM employee_location_scope WHERE employee_id = ANY($1::uuid[])', [duplicateIds]);
  await client.query('DELETE FROM employee_permissions WHERE employee_id = ANY($1::uuid[])', [duplicateIds]);
  const retired = await client.query(
    `UPDATE partners
     SET active = false,
         isdeleted = true,
         comment = CONCAT_WS(' | ', NULLIF(comment, ''), $2::text),
         lastupdated = NOW()
     WHERE id = ANY($1::uuid[])`,
    [duplicateIds, `MERGED duplicate employee into ${canonicalId}`],
  );

  return { referencesUpdated: referencesUpdated + permissionOverridesMoved, scopesAdded, retired: retired.rowCount };
}

async function applyEmployeeMergePlan(client, plan) {
  const applied = { groups: 0, referencesUpdated: 0, scopesAdded: 0, retired: 0 };
  for (const group of plan.groups) {
    const result = await applyGroup(client, group);
    applied.groups += 1;
    applied.referencesUpdated += result.referencesUpdated;
    applied.scopesAdded += result.scopesAdded;
    applied.retired += result.retired;
  }
  return applied;
}

function parseArgs(argv) {
  const args = { apply: false, databaseUrl: process.env.DATABASE_URL || DEFAULT_DB };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--database-url') args.databaseUrl = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printPlan(plan, applied = null) {
  const previewGroups = plan.groups.slice(0, 25).map((group) => ({
    aliasKey: group.aliasKey,
    exactNames: group.exactNames,
    keep: `${group.canonicalName} [${group.canonicalId}]`,
    duplicates: group.duplicateRows.map((row) => `${row.name} [${row.id}] refs=${row.refCount}`),
    locationScopesToAdd: group.locationScopesToAdd.map((scope) => scope.companyName),
    totalRefsToMove: group.totalRefsToMove,
  }));
  console.log(JSON.stringify({
    mode: applied ? 'applied' : 'dry-run',
    summary: {
      groupCount: plan.groupCount,
      duplicateRowsToRetire: plan.duplicateRowsToRetire,
      totalRefsToMove: plan.totalRefsToMove,
    },
    applied,
    previewGroups,
  }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: args.databaseUrl, options: '-c search_path=dbo' });
  await client.connect();
  try {
    await client.query(args.apply ? 'BEGIN' : 'BEGIN READ ONLY');
    const snapshot = await readEmployees(client);
    const plan = buildEmployeeMergePlan(snapshot);
    if (!args.apply) {
      printPlan(plan);
      await client.query('ROLLBACK');
      return;
    }
    const applied = await applyEmployeeMergePlan(client, plan);
    await client.query('COMMIT');
    printPlan(plan, applied);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  applyEmployeeMergePlan,
  buildEmployeeMergePlan,
  parseArgs,
};
