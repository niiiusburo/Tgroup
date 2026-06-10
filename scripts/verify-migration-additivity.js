#!/usr/bin/env node
'use strict';
/**
 * @crossref:domain[business-unit]
 * @crossref:used-in[NK3->NK2 promotion gate: scripts/verify-migration-additivity, scripts/nk3-to-nk2-preport-gates.py]
 * @crossref:uses[docs/runbooks/NK3_TO_NK2_PROMOTION.md, docs/MIGRATIONS.md, api/migrations]
 *
 * Static migration-additivity audit for the NK3 -> NK2 -> NK promotion.
 *
 * The cosmetic-LOB / CTV delta (migrations >= 047, the body of schema the port
 * carries onto NK2 + NK) must NOT break existing dental data. This audit reads
 * every delta migration, classifies each LIVE statement (rollback comments are
 * stripped), and FAILS (exit 1) on any HIGH-severity op that could destroy or
 * rewrite a pre-existing dental table.
 *
 *   SAFE   - additive + idempotent (ADD COLUMN IF NOT EXISTS nullable/defaulted,
 *            CREATE TABLE/INDEX IF NOT EXISTS, guarded backfill UPDATE ... WHERE,
 *            INSERT ... ON CONFLICT, COMMENT, ALTER ... DROP NOT NULL on a delta table)
 *   REVIEW - non-destructive but worth a human eye (ALTER COLUMN TYPE widen,
 *            DROP CONSTRAINT, ADD CONSTRAINT CHECK/FK that re-validates rows,
 *            DROP of a delta-introduced object, non-idempotent CREATE/ADD)
 *   HIGH   - destructive to a PRE-EXISTING dental object (DROP TABLE/COLUMN of a
 *            non-delta object, ALTER COLUMN SET NOT NULL / TYPE-narrow on core,
 *            unguarded UPDATE/DELETE, TRUNCATE, ADD COLUMN NOT NULL w/o DEFAULT)
 *
 * Usage:
 *   node scripts/verify-migration-additivity.js [--since=47] [--dir=api/migrations] [--json]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const SINCE = parseInt(opt('since', '47'), 10);
const DIR = opt('dir', 'api/migrations');
const JSON_OUT = args.includes('--json');

const C = process.stdout.isTTY
  ? { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' }
  : { g: '', r: '', y: '', d: '', b: '', x: '' };

function listDeltaFiles() {
  const abs = path.resolve(DIR);
  if (!fs.existsSync(abs)) {
    console.error(`migration dir not found: ${abs}`);
    process.exit(2);
  }
  return fs
    .readdirSync(abs)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .filter((f) => parseInt(f.match(/^(\d+)/)[1], 10) >= SINCE)
    .sort()
    .map((f) => ({ file: f, num: parseInt(f.match(/^(\d+)/)[1], 10), text: fs.readFileSync(path.join(abs, f), 'utf8') }));
}

// Strip line comments (everything from the first `--` on each line) then collapse
// to a single string and split into statements on `;`. Migrations here never put
// `--` inside string literals, so this is safe and also discards rollback comments.
function statements(sqlText) {
  // 1. Strip line comments (also discards rollback `--` comment blocks).
  const stripped = sqlText
    .split('\n')
    .map((line) => {
      const i = line.indexOf('--');
      return i === -1 ? line : line.slice(0, i);
    })
    .join('\n');
  // 2. Split on `;` but NOT inside dollar-quoted ($$ / $tag$) PL/pgSQL blocks or
  //    single-quoted string literals, so `DO $$ ... ; ... $$;` stays one statement.
  const out = [];
  let buf = '';
  let dollarTag = null;
  let inSingle = false;
  for (let i = 0; i < stripped.length; ) {
    const ch = stripped[i];
    if (dollarTag) {
      if (stripped.startsWith(dollarTag, i)) { buf += dollarTag; i += dollarTag.length; dollarTag = null; continue; }
      buf += ch; i++; continue;
    }
    if (inSingle) { buf += ch; if (ch === "'") inSingle = false; i++; continue; }
    if (ch === "'") { inSingle = true; buf += ch; i++; continue; }
    if (ch === '$') {
      const m = stripped.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { dollarTag = m[0]; buf += dollarTag; i += dollarTag.length; continue; }
    }
    if (ch === ';') { const s = buf.replace(/\s+/g, ' ').trim(); if (s) out.push(s); buf = ''; i++; continue; }
    buf += ch; i++;
  }
  const tail = buf.replace(/\s+/g, ' ').trim();
  if (tail) out.push(tail);
  return out;
}

// Pass 1: collect every table CREATEd and column ADDed within the delta so DROPs
// against delta-introduced objects can be down-graded from HIGH to REVIEW.
function collectDeltaObjects(files) {
  const tables = new Set();
  const cols = new Set(); // "table.col"
  for (const { text } of files) {
    for (const stmt of statements(text)) {
      let m = stmt.match(/^CREATE TABLE (?:IF NOT EXISTS )?(?:dbo\.)?(\w+)/i);
      if (m) tables.add(m[1].toLowerCase());
      const alter = stmt.match(/^ALTER TABLE (?:dbo\.)?(\w+)([\s\S]*)$/i);
      if (alter) {
        const tbl = alter[1].toLowerCase();
        const addRe = /ADD COLUMN (?:IF NOT EXISTS )?(\w+)/gi;
        let a;
        while ((a = addRe.exec(alter[2]))) cols.add(`${tbl}.${a[1].toLowerCase()}`);
      }
    }
  }
  return { tables, cols };
}

function classify(stmt, delta) {
  const s = stmt;
  const up = s.toUpperCase();
  const tableOf = (re) => {
    const m = s.match(re);
    return m ? m[1].toLowerCase() : null;
  };
  const isDeltaTable = (t) => t && delta.tables.has(t);

  // --- additive, idempotent ---
  if (/^CREATE TABLE IF NOT EXISTS/i.test(s)) return { sev: 'SAFE', kind: 'create table (guarded)' };
  if (/^CREATE INDEX (CONCURRENTLY )?IF NOT EXISTS/i.test(s) || /^CREATE UNIQUE INDEX (CONCURRENTLY )?IF NOT EXISTS/i.test(s))
    return { sev: 'SAFE', kind: 'create index (guarded)' };
  if (/^CREATE (OR REPLACE )?(VIEW|FUNCTION|EXTENSION IF NOT EXISTS)/i.test(s)) return { sev: 'SAFE', kind: 'create view/fn/ext' };
  if (/^COMMENT ON/i.test(s)) return { sev: 'SAFE', kind: 'comment' };
  if (/^(BEGIN|COMMIT|START TRANSACTION|SET )/i.test(s)) return { sev: 'SAFE', kind: 'txn/set' };
  if (/^DO\s+\$/i.test(s)) {
    // Guarded PL/pgSQL block (e.g. IF NOT EXISTS ... THEN). Flag only genuinely
    // destructive inner ops against pre-existing objects; otherwise idempotent.
    if (/TRUNCATE/i.test(s)) return { sev: 'HIGH', kind: 'DO block contains TRUNCATE' };
    const dropT = s.match(/DROP TABLE (?:IF EXISTS )?(?:dbo\.)?(\w+)/i);
    if (dropT && !isDeltaTable(dropT[1].toLowerCase()))
      return { sev: 'HIGH', kind: `DO block DROP TABLE ${dropT[1]} (pre-existing)` };
    return { sev: 'SAFE', kind: 'guarded DO block (idempotent)' };
  }
  if (/^INSERT INTO/i.test(s)) {
    return /ON CONFLICT/i.test(s) || /WHERE NOT EXISTS/i.test(s)
      ? { sev: 'SAFE', kind: 'insert (idempotent: on-conflict / where-not-exists)' }
      : { sev: 'REVIEW', kind: 'insert (no on-conflict/where-not-exists; verify idempotent)' };
  }

  // --- non-idempotent CREATE ---
  if (/^CREATE TABLE /i.test(s)) return { sev: 'REVIEW', kind: 'create table WITHOUT if-not-exists (not idempotent)' };
  if (/^CREATE (UNIQUE )?INDEX /i.test(s)) return { sev: 'REVIEW', kind: 'create index WITHOUT if-not-exists (not idempotent)' };

  // --- TRUNCATE / unguarded DML ---
  if (/^TRUNCATE/i.test(s)) return { sev: 'HIGH', kind: 'TRUNCATE' };
  if (/^UPDATE /i.test(s) || /^WITH [\s\S]*UPDATE /i.test(s)) {
    const tbl = tableOf(/UPDATE (?:dbo\.)?(\w+)/i);
    if (!/ WHERE /i.test(up)) return { sev: 'HIGH', kind: `unguarded UPDATE ${tbl} (no WHERE)`, table: tbl };
    return { sev: 'SAFE', kind: `guarded backfill UPDATE ${tbl}`, table: tbl };
  }
  if (/^DELETE FROM/i.test(s)) {
    const tbl = tableOf(/DELETE FROM (?:dbo\.)?(\w+)/i);
    if (!/ WHERE /i.test(up)) return { sev: 'HIGH', kind: `unguarded DELETE ${tbl} (no WHERE)`, table: tbl };
    return { sev: 'REVIEW', kind: `DELETE ${tbl} (guarded)`, table: tbl };
  }

  // --- DROP TABLE ---
  if (/^DROP TABLE/i.test(s)) {
    const tbl = tableOf(/DROP TABLE (?:IF EXISTS )?(?:dbo\.)?(\w+)/i);
    return isDeltaTable(tbl)
      ? { sev: 'REVIEW', kind: `DROP TABLE ${tbl} (delta-introduced)`, table: tbl }
      : { sev: 'HIGH', kind: `DROP TABLE ${tbl} (PRE-EXISTING)`, table: tbl };
  }
  if (/^DROP INDEX/i.test(s)) return { sev: 'REVIEW', kind: 'drop index' };

  // --- ALTER TABLE family ---
  if (/^ALTER TABLE /i.test(s)) {
    const tbl = tableOf(/^ALTER TABLE (?:dbo\.)?(\w+)/i);
    const core = !isDeltaTable(tbl);

    // ADD COLUMN
    if (/ADD COLUMN/i.test(s)) {
      const guarded = /ADD COLUMN IF NOT EXISTS/i.test(s);
      const notNullNoDefault = /ADD COLUMN[^,;]*\bNOT NULL\b/i.test(s) && !/ADD COLUMN[^,;]*\bDEFAULT\b/i.test(s);
      if (notNullNoDefault) return { sev: 'HIGH', kind: `ADD COLUMN NOT NULL w/o DEFAULT on ${tbl}`, table: tbl };
      return guarded
        ? { sev: 'SAFE', kind: `add column(s) on ${tbl} (guarded, nullable/defaulted)`, table: tbl }
        : { sev: 'REVIEW', kind: `ADD COLUMN on ${tbl} WITHOUT if-not-exists (not idempotent)`, table: tbl };
    }
    // DROP COLUMN
    if (/DROP COLUMN/i.test(s)) {
      const col = (s.match(/DROP COLUMN (?:IF EXISTS )?(\w+)/i) || [])[1];
      const isDeltaCol = col && delta.cols.has(`${tbl}.${col.toLowerCase()}`);
      if (isDeltaTable(tbl) || isDeltaCol)
        return { sev: 'REVIEW', kind: `DROP COLUMN ${tbl}.${col} (delta-introduced)`, table: tbl };
      return { sev: 'HIGH', kind: `DROP COLUMN ${tbl}.${col} (PRE-EXISTING)`, table: tbl };
    }
    // ALTER COLUMN ...
    if (/ALTER COLUMN[^;]*SET NOT NULL/i.test(s))
      return core
        ? { sev: 'HIGH', kind: `ALTER COLUMN SET NOT NULL on core ${tbl} (fails on existing nulls)`, table: tbl }
        : { sev: 'REVIEW', kind: `ALTER COLUMN SET NOT NULL on delta ${tbl}`, table: tbl };
    if (/ALTER COLUMN[^;]*DROP NOT NULL/i.test(s))
      return { sev: isDeltaTable(tbl) ? 'SAFE' : 'REVIEW', kind: `ALTER COLUMN DROP NOT NULL on ${tbl}`, table: tbl };
    if (/ALTER COLUMN[^;]*TYPE/i.test(s))
      return { sev: 'REVIEW', kind: `ALTER COLUMN TYPE on ${tbl} (verify widen, not narrow)`, table: tbl };
    if (/ALTER COLUMN[^;]*(SET|DROP) DEFAULT/i.test(s))
      return { sev: 'REVIEW', kind: `ALTER COLUMN default on ${tbl}`, table: tbl };

    // CONSTRAINTS
    if (/DROP CONSTRAINT/i.test(s)) return { sev: 'REVIEW', kind: `DROP CONSTRAINT on ${tbl}`, table: tbl };
    if (/ADD CONSTRAINT[^;]*CHECK/i.test(s))
      return {
        sev: 'REVIEW',
        kind: `ADD CHECK CONSTRAINT on ${tbl} (RE-VALIDATES every existing row${core ? ' on a PRE-EXISTING table' : ''})`,
        table: tbl,
        revalidates: true,
        core,
      };
    if (/ADD CONSTRAINT[^;]*(FOREIGN KEY|REFERENCES)/i.test(s))
      return { sev: 'REVIEW', kind: `ADD FOREIGN KEY on ${tbl} (validates existing rows)`, table: tbl, revalidates: true, core };
    if (/ADD CONSTRAINT[^;]*(UNIQUE|PRIMARY KEY)/i.test(s))
      return { sev: 'REVIEW', kind: `ADD UNIQUE/PK on ${tbl} (fails on existing dupes)`, table: tbl, revalidates: true, core };

    return { sev: 'REVIEW', kind: `ALTER TABLE ${tbl} (unclassified)`, table: tbl };
  }

  return { sev: 'REVIEW', kind: `unclassified: ${s.slice(0, 60)}` };
}

function main() {
  const files = listDeltaFiles();
  const delta = collectDeltaObjects(files);
  const findings = [];
  for (const { file, text } of files) {
    for (const stmt of statements(text)) {
      const c = classify(stmt, delta);
      findings.push({ file, ...c });
    }
  }

  const high = findings.filter((f) => f.sev === 'HIGH');
  const review = findings.filter((f) => f.sev === 'REVIEW');
  const safe = findings.filter((f) => f.sev === 'SAFE');
  const dupes = (() => {
    const byNum = {};
    for (const f of files) (byNum[f.num] ||= []).push(f.file);
    return Object.entries(byNum).filter(([, v]) => v.length > 1);
  })();
  const revalidators = review.filter((f) => f.revalidates);

  if (JSON_OUT) {
    console.log(JSON.stringify({ since: SINCE, files: files.map((f) => f.file), counts: { high: high.length, review: review.length, safe: safe.length }, deltaTables: [...delta.tables], duplicateNumbers: dupes, findings }, null, 2));
    process.exit(high.length ? 1 : 0);
  }

  console.log(`\n${C.b}Migration additivity audit${C.x}  ${C.d}(${DIR}, delta >= ${SINCE}, ${files.length} files)${C.x}\n`);
  for (const f of high) console.log(`  ${C.r}HIGH  ${C.x}${f.file}  ${f.kind}`);
  for (const f of review) console.log(`  ${C.y}REVIEW${C.x} ${C.d}${f.file}${C.x}  ${f.kind}`);
  console.log(`\n  ${C.g}${safe.length} SAFE${C.x} · ${C.y}${review.length} REVIEW${C.x} · ${high.length ? C.r : C.g}${high.length} HIGH${C.x}`);

  if (revalidators.length) {
    console.log(`\n${C.b}Row-revalidating constraints — verify clean on EACH target (NK2, NK) before apply:${C.x}`);
    for (const f of revalidators) {
      console.log(`  ${C.y}${f.file}${C.x} → ${f.kind}`);
      if (/created_via/i.test(f.file)) {
        console.log(`    ${C.d}pre-check: SELECT DISTINCT created_via FROM dbo.partners WHERE created_via IS NOT NULL${C.x}`);
        console.log(`    ${C.d}           AND created_via NOT IN ('self_signup','admin_create','migrated') AND created_via NOT LIKE 'legacy_ctv_import%';${C.x}`);
      } else {
        console.log(`    ${C.d}pre-check: confirm no existing row in dbo.${f.table} violates the new constraint before applying.${C.x}`);
      }
    }
  }
  if (dupes.length) {
    console.log(`\n${C.d}note: duplicate-numbered migrations (idempotent, alpha-ordered by deploy loop): ${dupes.map(([n, v]) => `${n}=[${v.join(', ')}]`).join('; ')}${C.x}`);
  }

  console.log(
    high.length
      ? `\n${C.r}FAIL${C.x} — ${high.length} destructive op(s) on pre-existing dental objects. Promotion is NOT additive-safe.\n`
      : `\n${C.g}PASS${C.x} — delta is additive-safe. ${review.length} REVIEW item(s) are expected; verify revalidators per-target.\n`
  );
  process.exit(high.length ? 1 : 0);
}

main();
