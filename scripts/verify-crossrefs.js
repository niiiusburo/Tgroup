#!/usr/bin/env node
'use strict';

/**
 * NK3 site-wide cross-reference breadcrumb verifier.
 *
 * A valid breadcrumb has the three markers used by the CTV SSOT pattern:
 *   @crossref:domain[...]
 *   @crossref:used-in[...]
 *   @crossref:uses[...]
 *
 * Use --apply to add a conservative file-level breadcrumb to missing targets.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const GENERATED_BREADCRUMB_RE = /^\/\*\*\n \* @crossref:domain\[[^\]]+\]\n \* @crossref:used-in\[[^\]]+\]\n \* @crossref:uses\[[^\]]+\]\n \*\/\n+/;

const TARGET_ROOTS = [
  { dir: 'website/src/pages', surface: 'NK3 SPA page route' },
  { dir: 'website/src/components/modules', surface: 'NK3 dashboard/workspace module' },
  { dir: 'website/src/components/commission', surface: 'NK3 commission and CTV admin surface' },
  { dir: 'website/src/components/ctv', surface: 'NK3 CTV portal and referral surface' },
  { dir: 'website/src/lib/api', surface: 'NK3 frontend API client' },
  { dir: 'api/src/routes', surface: 'NK3 Express API route' },
  { dir: 'api/src/services', surface: 'NK3 backend service function' },
  { dir: 'api/src/middleware', surface: 'NK3 API middleware' },
  { dir: 'api/migrations', surface: 'NK3 schema migration' },
];

const TARGET_FILES = [
  { file: 'website/src/App.tsx', surface: 'NK3 route graph root' },
  { file: 'website/src/components/Layout.tsx', surface: 'NK3 app shell and navigation root' },
  { file: 'website/src/components/shared/Breadcrumbs.tsx', surface: 'NK3 visual breadcrumb component' },
  { file: 'website/src/constants/index.ts', surface: 'NK3 route and navigation constants' },
];

const STRICT_MARKER_FILES = [
  'website/src/App.tsx',
  'api/src/routes/ctv.js',
  'api/src/routes/earnings.js',
  'api/src/routes/payments.js',
  'api/src/routes/payouts.js',
  'api/src/routes/saleOrders/createSaleOrder.js',
  'api/src/routes/saleOrders/updateSaleOrder.js',
  'api/src/services/commissionEngine.js',
  'api/src/services/ctvBookingCompany.js',
  'api/src/services/ctvNetwork.js',
  'api/src/services/ctvSelfProfile.js',
  'api/src/services/legacyCtvPassword.js',
  'api/src/services/nk3CtvIntegrityRepair.js',
  'api/src/services/referralClaim.js',
  'api/src/services/serviceReversal.js',
];

const DOMAIN_RULES = [
  { domain: 'ctv', terms: ['ctv', 'referral', 'newclients'] },
  { domain: 'earnings-commissions', terms: ['commission', 'earning', 'payout'] },
  { domain: 'appointments-calendar', terms: ['appointment', 'calendar', 'schedule', 'checkin', 'check-in'] },
  { domain: 'customers-partners', terms: ['customer', 'partner', 'patient'] },
  { domain: 'payments-deposits', terms: ['payment', 'deposit', 'receipt', 'cashbook', 'monthlyplan', 'accountpayment'] },
  { domain: 'reports-analytics', terms: ['report', 'export', 'dashboard', 'revenue', 'analytics'] },
  { domain: 'services-catalog', terms: ['service', 'product', 'saleorder', 'sale-order', 'catalog'] },
  { domain: 'employees-hr', terms: ['employee', 'hr', 'payslip'] },
  { domain: 'auth', terms: ['auth', 'login', 'permission', 'session', 'role'] },
  { domain: 'business-unit', terms: ['lob', 'location', 'company', 'businessunit'] },
  { domain: 'settings-system', terms: ['setting', 'system', 'config', 'ipaccess', 'version', 'timezone', 'notification'] },
  { domain: 'feedback-cms', terms: ['feedback', 'cms', 'websitepages', 'pageeditor', 'pagelist', 'seo'] },
  { domain: 'integrations', terms: ['face', 'externalcheckup', 'hosoonline', 'telemetry', 'place'] },
];

function rel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function assertRepoRelative(candidate, label) {
  if (typeof candidate !== 'string' || candidate.includes('\0')) {
    throw new Error(`Unsafe ${label}: ${String(candidate)}`);
  }
  if (path.isAbsolute(candidate) || candidate.split(/[\\/]+/).includes('..')) {
    throw new Error(`Unsafe ${label}: ${candidate}`);
  }
  return candidate;
}

function repoPath(repoRelativePath) {
  const safePath = assertRepoRelative(repoRelativePath, 'repo-relative path');
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const resolved = path.resolve(ROOT, safePath);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`Path escaped repository root: ${repoRelativePath}`);
  }
  return resolved;
}

function childPath(parentAbsPath, childName) {
  const safeName = assertRepoRelative(childName, 'directory entry');
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const resolved = path.resolve(parentAbsPath, safeName);
  if (!resolved.startsWith(`${parentAbsPath}${path.sep}`)) {
    throw new Error(`Path escaped parent directory: ${childName}`);
  }
  return resolved;
}

function walk(dir) {
  const absDir = repoPath(dir);
  if (!fs.existsSync(absDir)) return [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = childPath(absDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      files.push(...walk(rel(abs)));
    } else {
      files.push(abs);
    }
  }
  return files;
}

function isTargetFile(absPath) {
  const file = rel(absPath);
  if (!/\.(js|jsx|ts|tsx|sql)$/.test(file)) return false;
  if (/(\.|\/)(test|spec)\.[jt]sx?$/.test(file)) return false;
  if (file.endsWith('.d.ts')) return false;
  if (file.endsWith('.map')) return false;
  if (file.includes('/__tests__/')) return false;
  return true;
}

function domainFor(file) {
  const semanticPath = file
    .replace(/^website\/src\//, '')
    .replace(/^api\/src\//, '')
    .replace(/\.(js|jsx|ts|tsx)$/, '');
  const haystack = semanticPath.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  for (const rule of DOMAIN_RULES) {
    if (rule.terms.some((term) => haystack.includes(term.toLowerCase().replace(/[^a-z0-9]+/g, ' ')))) {
      return rule.domain;
    }
  }
  return 'settings-system';
}

function targetSurface(file) {
  const fileTarget = TARGET_FILES.find((item) => item.file === file);
  if (fileTarget) return fileTarget.surface;
  const target = TARGET_ROOTS.find((item) => file.startsWith(`${item.dir}/`));
  return target ? target.surface : 'NK3 code surface';
}

function hasCompleteCrossref(source) {
  return source.includes('@crossref:domain[')
    && source.includes('@crossref:used-in[')
    && source.includes('@crossref:uses[');
}

function hasStrictMarker(source) {
  return source.includes('@crossref:route[')
    || source.includes('@crossref:endpoint[')
    || source.includes('@crossref:function[');
}

function displayName(file) {
  return file.replace(/\.(tsx|ts|jsx|js|sql)$/, '');
}

function breadcrumbFor(file) {
  const domain = domainFor(file);
  if (file.endsWith('.sql')) {
    return [
      `-- @crossref:domain[${domain}]`,
      `-- @crossref:used-in[${targetSurface(file)}: ${displayName(file)}]`,
      `-- @crossref:uses[product-map/domains/${domain}.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]`,
      '',
    ].join('\n');
  }
  return [
    '/**',
    ` * @crossref:domain[${domain}]`,
    ` * @crossref:used-in[${targetSurface(file)}: ${displayName(file)}]`,
    ` * @crossref:uses[product-map/domains/${domain}.yaml, docs/TEST-MATRIX.md, testbright.md]`,
    ' */',
    '',
  ].join('\n');
}

function insertBreadcrumb(source, file) {
  const block = breadcrumbFor(file);
  if (file.endsWith('.sql')) return `${block}${source}`;
  if (source.startsWith('#!')) {
    const newline = source.indexOf('\n');
    return `${source.slice(0, newline + 1)}${block}${source.slice(newline + 1)}`;
  }
  const useStrict = /^(['"])use strict\1;\s*\n/.exec(source);
  if (useStrict) {
    return `${useStrict[0]}${block}${source.slice(useStrict[0].length)}`;
  }
  return `${block}${source}`;
}

function collectTargets() {
  const walked = TARGET_ROOTS
    .flatMap((target) => walk(target.dir))
    .filter(isTargetFile);
  const explicit = TARGET_FILES
    .map((target) => repoPath(target.file))
    .filter((file) => fs.existsSync(file))
    .filter(isTargetFile);
  return [...walked, ...explicit]
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort((a, b) => rel(a).localeCompare(rel(b)));
}

function main() {
  const missing = [];
  const missingStrict = [];
  const targets = collectTargets();

  for (const absPath of targets) {
    const file = rel(absPath);
    const source = fs.readFileSync(absPath, 'utf8');
    const generated = file.endsWith('.sql') ? null : GENERATED_BREADCRUMB_RE.exec(source);
    const expected = breadcrumbFor(file);

    if (generated && generated[0] !== expected) {
      missing.push(file);
      if (APPLY) {
        fs.writeFileSync(absPath, source.replace(GENERATED_BREADCRUMB_RE, expected));
      }
      continue;
    }

    if (hasCompleteCrossref(source)) continue;
    missing.push(file);
    if (APPLY) {
      fs.writeFileSync(absPath, insertBreadcrumb(source, file));
    }
  }

  for (const file of STRICT_MARKER_FILES) {
    const absPath = repoPath(file);
    if (!fs.existsSync(absPath)) {
      missingStrict.push(`${file} (missing file)`);
      continue;
    }
    const source = fs.readFileSync(absPath, 'utf8');
    if (!hasStrictMarker(source)) missingStrict.push(file);
  }

  if (missing.length === 0) {
    if (missingStrict.length === 0) {
      console.log(`crossref breadcrumbs ok (${targets.length} files checked; ${STRICT_MARKER_FILES.length} strict files checked)`);
      return;
    }
    console.error(`crossref strict endpoint/function markers missing in ${missingStrict.length} files:`);
    for (const file of missingStrict) console.error(`  - ${file}`);
    process.exit(1);
    return;
  }

  if (APPLY) {
    console.log(`crossref breadcrumbs added to ${missing.length} of ${targets.length} files`);
    return;
  }

  console.error(`crossref breadcrumbs missing in ${missing.length} of ${targets.length} files:`);
  for (const file of missing.slice(0, 80)) console.error(`  - ${file}`);
  if (missing.length > 80) console.error(`  ... ${missing.length - 80} more`);
  console.error('Run: node scripts/verify-crossrefs.js --apply');
  process.exit(1);
}

main();
