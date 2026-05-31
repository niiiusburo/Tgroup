#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DEFAULT_ARTIFACT_DIR = path.join(ROOT_DIR, 'artifacts/ctv-import/20260528-legacy-source');
const DEFAULT_SOURCE = path.join(DEFAULT_ARTIFACT_DIR, 'source-active-ctv.json');
const DEFAULT_DENTAL = path.join(DEFAULT_ARTIFACT_DIR, 'target-dental-partners.json');
const DEFAULT_COSMETIC = path.join(DEFAULT_ARTIFACT_DIR, 'target-cosmetic-partners.json');
const IMPORT_MARKER = 'legacy_ctv_import_20260528';
const CONFIRM_TEXT = 'IMPORT_LEGACY_CTVS_TO_DENTAL_AND_COSMETIC';
const LOB_SCOPE = ['dental', 'cosmetic'];

function usage() {
  console.log(`
Usage:
  node api/scripts/import-legacy-ctvs.js --dry-run
  DATABASE_URL=... COSMETIC_DATABASE_URL=... node api/scripts/import-legacy-ctvs.js --apply --confirm ${CONFIRM_TEXT}

Options:
  --source <file>            Legacy active CTV JSON export. Default: ${path.relative(ROOT_DIR, DEFAULT_SOURCE)}
  --dental-target <file>     Dental partners snapshot for dry-run planning.
  --cosmetic-target <file>   Cosmetic partners snapshot for dry-run planning.
  --out <file>               Write full audit plan JSON.
  --apply                    Write to both configured databases. Requires --confirm.
  --plan-from-db             Build the plan from live DATABASE_URL/COSMETIC_DATABASE_URL without writing.
  --confirm <text>           Required exact text for --apply: ${CONFIRM_TEXT}
  --overwrite-existing-passwords
                             Replace matched existing non-legacy passwords with the legacy hash. Default preserves them.
`);
}

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    dentalTarget: DEFAULT_DENTAL,
    cosmeticTarget: DEFAULT_COSMETIC,
    dryRun: true,
    apply: false,
    planFromDb: false,
    overwriteExistingPasswords: false,
    out: null,
    confirm: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--apply') {
      args.apply = true;
      args.dryRun = false;
      args.planFromDb = true;
    } else if (arg === '--plan-from-db') {
      args.planFromDb = true;
    } else if (arg === '--overwrite-existing-passwords') {
      args.overwriteExistingPasswords = true;
    } else if (arg === '--source') {
      args.source = resolveRepoPath(argv[++i], '--source');
    } else if (arg === '--dental-target') {
      args.dentalTarget = resolveRepoPath(argv[++i], '--dental-target');
    } else if (arg === '--cosmetic-target') {
      args.cosmeticTarget = resolveRepoPath(argv[++i], '--cosmetic-target');
    } else if (arg === '--out') {
      args.out = resolveRepoPath(argv[++i], '--out');
    } else if (arg === '--confirm') {
      args.confirm = argv[++i];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveRepoPath(input, label) {
  const raw = String(input || '');
  if (!raw) throw new Error(`${label} path is required.`);
  // CLI paths are normalized once, then rejected unless they stay under ROOT_DIR.
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const resolved = path.resolve(process.cwd(), raw);
  const relative = path.relative(ROOT_DIR, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside the project root: ${ROOT_DIR}`);
  }
  return resolved;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCode(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function phoneKeys(value) {
  const digits = normalizeText(value).replace(/\D/g, '');
  const keys = new Set();
  if (!digits) return keys;
  keys.add(digits);
  if (digits.startsWith('84') && digits.length >= 10) {
    keys.add(`0${digits.slice(2)}`);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    keys.add(`84${digits.slice(1)}`);
  }
  return keys;
}

function deterministicUuid(seed) {
  const bytes = crypto.createHash('sha256').update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function addIndex(index, key, id) {
  if (!key) return;
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(id);
}

function addCandidateIds(targetSet, sourceSet) {
  if (!sourceSet) return;
  for (const id of sourceSet) targetSet.add(id);
}

function buildTargetIndexes(dentalRows, cosmeticRows) {
  const byId = new Map();
  const dentalById = new Map();
  const cosmeticById = new Map();
  const byRef = new Map();
  const byEmail = new Map();
  const byPhone = new Map();

  function addRow(row, lob) {
    if (!row.id) return;
    const normalized = { ...row, lob };
    byId.set(row.id, { ...(byId.get(row.id) || {}), ...normalized });
    if (lob === 'dental') dentalById.set(row.id, normalized);
    if (lob === 'cosmetic') cosmeticById.set(row.id, normalized);
    addIndex(byRef, normalizeCode(row.ref), row.id);
    addIndex(byEmail, normalizeEmail(row.email), row.id);
    for (const key of phoneKeys(row.phone)) addIndex(byPhone, key, row.id);
  }

  dentalRows.forEach((row) => addRow(row, 'dental'));
  cosmeticRows.forEach((row) => addRow(row, 'cosmetic'));
  return { byId, dentalById, cosmeticById, byRef, byEmail, byPhone };
}

function collectMatches(source, indexes) {
  const candidates = new Set();
  addCandidateIds(candidates, indexes.byRef.get(normalizeCode(source.ma_ctv)));
  addCandidateIds(candidates, indexes.byEmail.get(normalizeEmail(source.email)));
  for (const key of phoneKeys(source.sdt)) addCandidateIds(candidates, indexes.byPhone.get(key));
  return candidates;
}

function summarizeExistingPassword(indexes, id) {
  const dental = indexes.dentalById.get(id);
  const cosmetic = indexes.cosmeticById.get(id);
  return Boolean(dental?.has_password || cosmetic?.has_password);
}

function planImport(sourceRows, dentalRows, cosmeticRows, options) {
  const indexes = buildTargetIndexes(dentalRows, cosmeticRows);
  const skipped = [];
  const planned = [];

  for (const row of sourceRows) {
    const legacyCode = normalizeCode(row.ma_ctv);
    if (!legacyCode) {
      skipped.push({ reason: 'missing_legacy_code', legacy_code: null });
      continue;
    }

    const matches = collectMatches(row, indexes);
    if (matches.size > 1) {
      skipped.push({ reason: 'ambiguous_target_match', legacy_code: legacyCode, candidate_ids: Array.from(matches).sort() });
      continue;
    }

    const matchedId = matches.size === 1 ? Array.from(matches)[0] : null;
    const id = matchedId || deterministicUuid(`legacy-ctv:${legacyCode}`);
    if (!matchedId && indexes.byId.has(id)) {
      skipped.push({ reason: 'deterministic_id_collision', legacy_code: legacyCode, candidate_ids: [id] });
      continue;
    }

    planned.push({
      id,
      legacy_code: legacyCode,
      name: normalizeText(row.ten) || legacyCode,
      phone: normalizeText(row.sdt) || null,
      email: normalizeEmail(row.email) || null,
      password_hash: normalizeText(row.password_hash) || null,
      signature_image: normalizeText(row.signature_image) || null,
      legacy_upline_code: normalizeCode(row.nguoi_gioi_thieu) || null,
      matched_existing_id: matchedId,
      existing_password_present: matchedId ? summarizeExistingPassword(indexes, matchedId) : false,
      dental_operation: indexes.dentalById.has(id) ? 'update' : 'insert',
      cosmetic_operation: indexes.cosmeticById.has(id) ? 'update' : 'insert',
    });
  }

  const plannedByCode = new Map(planned.map((record) => [record.legacy_code, record]));
  for (const record of planned) {
    const upline = record.legacy_upline_code ? plannedByCode.get(record.legacy_upline_code) : null;
    record.referred_by_ctv_id = upline && upline.id !== record.id ? upline.id : null;
    record.upline_status = record.legacy_upline_code
      ? (record.referred_by_ctv_id ? 'mapped' : 'unresolved')
      : 'none';
    record.password_write_policy = record.matched_existing_id && record.existing_password_present && !options.overwriteExistingPasswords
      ? 'preserve_existing_nonlegacy_password'
      : 'write_legacy_hash';
  }

  const summary = {
    source_rows: sourceRows.length,
    planned_rows: planned.length,
    skipped_rows: skipped.length,
    new_canonical_rows: planned.filter((record) => !record.matched_existing_id).length,
    matched_existing_rows: planned.filter((record) => record.matched_existing_id).length,
    dental_inserts: planned.filter((record) => record.dental_operation === 'insert').length,
    dental_updates: planned.filter((record) => record.dental_operation === 'update').length,
    cosmetic_inserts: planned.filter((record) => record.cosmetic_operation === 'insert').length,
    cosmetic_updates: planned.filter((record) => record.cosmetic_operation === 'update').length,
    mapped_uplines: planned.filter((record) => record.upline_status === 'mapped').length,
    unresolved_uplines: planned.filter((record) => record.upline_status === 'unresolved').length,
    legacy_hash_writes: planned.filter((record) => record.password_write_policy === 'write_legacy_hash').length,
    preserved_existing_passwords: planned.filter((record) => record.password_write_policy === 'preserve_existing_nonlegacy_password').length,
    import_marker: IMPORT_MARKER,
    overwrite_existing_passwords: options.overwriteExistingPasswords,
  };

  return { summary, planned, skipped };
}

function printSummary(plan) {
  console.log(JSON.stringify(plan.summary, null, 2));
  if (plan.skipped.length > 0) {
    console.log(`Skipped ${plan.skipped.length} legacy CTV row(s). Review the audit JSON before widening the import.`);
  }
}

function writeAudit(filePath, plan) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Audit written: ${filePath}`);
}

async function loadTargetsFromDb() {
  const dentalUrl = process.env.DATABASE_URL;
  const cosmeticUrl = process.env.COSMETIC_DATABASE_URL;
  if (!dentalUrl || !cosmeticUrl) {
    throw new Error('DATABASE_URL and COSMETIC_DATABASE_URL are required for --plan-from-db or --apply.');
  }

  const dentalPool = new Pool({ connectionString: dentalUrl, options: '-c search_path=dbo' });
  const cosmeticPool = new Pool({ connectionString: cosmeticUrl, options: '-c search_path=dbo' });
  const selectSql = `
    SELECT id, name, phone, email, ref, created_via, customer, active, employee,
           is_ctv, isdeleted, lob_scope, referred_by_ctv_id,
           password_hash IS NOT NULL AS has_password
      FROM dbo.partners
  `;

  try {
    const [dental, cosmetic] = await Promise.all([
      dentalPool.query(selectSql),
      cosmeticPool.query(selectSql),
    ]);
    return { dentalRows: dental.rows, cosmeticRows: cosmetic.rows };
  } finally {
    await Promise.all([dentalPool.end(), cosmeticPool.end()]);
  }
}

function upsertSql() {
  return `
    INSERT INTO dbo.partners (
      id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
      ref, created_via, signature_image, active, employee, customer, supplier, isagent,
      isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated
    ) VALUES (
      $1, $2, $3, $4, $5, true, $6, $7,
      $8, $9, $10, true, true, false, false, false,
      false, false, false, false, false, $11, $11
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(NULLIF(EXCLUDED.name, ''), partners.name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), partners.phone),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), partners.email),
      password_hash = CASE
        WHEN $12::boolean THEN EXCLUDED.password_hash
        WHEN partners.password_hash IS NULL THEN EXCLUDED.password_hash
        WHEN partners.created_via LIKE 'legacy_ctv_import%' THEN EXCLUDED.password_hash
        ELSE partners.password_hash
      END,
      is_ctv = true,
      lob_scope = ARRAY(
        SELECT DISTINCT scope
          FROM unnest(COALESCE(partners.lob_scope, ARRAY[]::text[]) || EXCLUDED.lob_scope) AS scopes(scope)
      ),
      referred_by_ctv_id = COALESCE(EXCLUDED.referred_by_ctv_id, partners.referred_by_ctv_id),
      ref = COALESCE(NULLIF(EXCLUDED.ref, ''), partners.ref),
      created_via = EXCLUDED.created_via,
      signature_image = COALESCE(NULLIF(EXCLUDED.signature_image, ''), partners.signature_image),
      active = true,
      employee = true,
      customer = COALESCE(partners.customer, false),
      isdeleted = false,
      lastupdated = EXCLUDED.lastupdated
  `;
}

async function applyPlan(plan, options) {
  if (options.confirm !== CONFIRM_TEXT) {
    throw new Error(`--apply requires --confirm ${CONFIRM_TEXT}`);
  }

  const dentalPool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c search_path=dbo' });
  const cosmeticPool = new Pool({ connectionString: process.env.COSMETIC_DATABASE_URL, options: '-c search_path=dbo' });
  const dentalClient = await dentalPool.connect();
  const cosmeticClient = await cosmeticPool.connect();
  const sql = upsertSql();

  try {
    await dentalClient.query('BEGIN');
    await cosmeticClient.query('BEGIN');

    for (const record of plan.planned) {
      const params = [
        record.id,
        record.name,
        record.phone,
        record.email,
        record.password_hash,
        LOB_SCOPE,
        record.referred_by_ctv_id,
        record.legacy_code,
        IMPORT_MARKER,
        record.signature_image,
        new Date().toISOString(),
        options.overwriteExistingPasswords,
      ];
      await dentalClient.query(sql, params);
      await cosmeticClient.query(sql, params);
    }

    await dentalClient.query('COMMIT');
    await cosmeticClient.query('COMMIT');
  } catch (error) {
    await Promise.allSettled([
      dentalClient.query('ROLLBACK'),
      cosmeticClient.query('ROLLBACK'),
    ]);
    throw error;
  } finally {
    dentalClient.release();
    cosmeticClient.release();
    await Promise.all([dentalPool.end(), cosmeticPool.end()]);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceRows = readJson(args.source);
  const targets = args.planFromDb
    ? await loadTargetsFromDb()
    : {
      dentalRows: readJson(args.dentalTarget),
      cosmeticRows: readJson(args.cosmeticTarget),
    };

  const plan = planImport(sourceRows, targets.dentalRows, targets.cosmeticRows, args);
  printSummary(plan);
  writeAudit(args.out, plan);

  if (args.apply) {
    await applyPlan(plan, args);
    console.log(`Applied ${plan.summary.planned_rows} legacy CTV row(s) to Dental and Cosmetic.`);
  } else {
    console.log('Dry run only. No database writes were executed.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
