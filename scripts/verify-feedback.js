#!/usr/bin/env node
'use strict';

/**
 * Feedback Thread Verification Script
 *
 * Usage:
 *   node scripts/verify-feedback.js [live|staging|local]
 *
 * This script:
 * 1. Authenticates as admin against the target environment
 * 2. Fetches all feedback threads via /api/Feedback/all
 * 3. Deduplicates auto-detected errors by (endpoint, status, category)
 * 4. Produces a clean, actionable report with verification checklist
 * 5. Cross-references against the last extracted snapshot
 */

const fs = require('fs');
const path = require('path');

// ── Configuration ────────────────────────────────────────────────────────────

const ENVIRONMENTS = {
  live: {
    baseUrl: 'https://nk.2checkin.com',
    directUrl: 'http://76.13.16.68:5175',
    email: process.env.LIVE_SITE_ADMIN_EMAIL,
    password: process.env.LIVE_SITE_ADMIN_PASSWORD,
  },
  staging: {
    baseUrl: 'https://nk2.2checkin.com',
    directUrl: 'http://76.13.16.68:5176',
    email: process.env.LIVE_SITE_ADMIN_EMAIL,
    password: process.env.LIVE_SITE_ADMIN_PASSWORD,
  },
  local: {
    baseUrl: 'http://localhost:5175',
    directUrl: 'http://localhost:5175',
    email: process.env.LOCAL_ADMIN_EMAIL || 't@clinic.vn',
    password: process.env.LOCAL_ADMIN_PASSWORD || '123123',
  },
};

// Load credentials from .agents/live-site.env if present
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}
loadEnvFile(path.join(__dirname, '..', '.agents', 'live-site.env'));

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function httpFetch(url, opts = {}) {
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, ok: res.ok, text, json };
}

async function login(baseUrl, email, password) {
  const res = await httpFetch(`${baseUrl}/api/Auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok || !res.json?.token) {
    console.error('Login failed:', res.status, res.text.slice(0, 200));
    process.exit(1);
  }
  return res.json.token;
}

async function fetchAllThreads(baseUrl, token, source) {
  const url = new URL(`${baseUrl}/api/Feedback/all`);
  if (source) url.searchParams.set('source', source);
  const res = await httpFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error('Failed to fetch threads:', res.status, res.text.slice(0, 200));
    process.exit(1);
  }
  return res.json.items || [];
}

async function fetchThreadDetail(baseUrl, token, threadId) {
  const res = await httpFetch(`${baseUrl}/api/Feedback/all/${threadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json;
}

// ── Analysis helpers ─────────────────────────────────────────────────────────

function extractApiEndpoint(message) {
  if (!message) return null;
  const m = message.match(/API\s+(?:GET|POST|PUT|PATCH|DELETE)\s+(\S+)/);
  return m ? m[1] : null;
}

function extractHttpStatus(message) {
  if (!message) return null;
  const m = message.match(/\((\d{3})\):/);
  return m ? parseInt(m[1], 10) : null;
}

function isAuthNoise(thread) {
  const status = extractHttpStatus(thread.firstMessage);
  return status === 401 || status === 403;
}

function isReactDomNoise(thread) {
  const msg = thread.firstMessage || '';
  return msg.includes('removeChild') || msg.includes('insertBefore') || msg.includes('NotFoundError');
}

function isChunkLoadNoise(thread) {
  const msg = thread.firstMessage || '';
  return msg.includes('Failed to fetch dynamically imported module');
}

function dedupKey(thread) {
  const endpoint = extractApiEndpoint(thread.firstMessage);
  const status = extractHttpStatus(thread.firstMessage);
  if (endpoint && status) {
    return `${thread.category || 'unknown'}|${endpoint}|${status}`;
  }
  if (isReactDomNoise(thread)) return 'react-dom-mutation';
  if (isChunkLoadNoise(thread)) return 'chunk-load-failure';
  return thread.id; // fallback to unique ID
}

// ── Report generation ────────────────────────────────────────────────────────

function generateReport(env, threads, snapshotThreads) {
  const manual = threads.filter(t => t.source === 'manual');
  const auto = threads.filter(t => t.source === 'auto');

  // Deduplicate auto errors
  const autoDedup = new Map();
  for (const t of auto) {
    const key = dedupKey(t);
    if (!autoDedup.has(key)) {
      autoDedup.set(key, { ...t, _count: 1, _ids: [t.id] });
    } else {
      const existing = autoDedup.get(key);
      existing._count++;
      existing._ids.push(t.id);
      if (new Date(t.updatedAt) > new Date(existing.updatedAt)) {
        existing.updatedAt = t.updatedAt;
      }
    }
  }

  // Classify
  const authNoise = [];
  const backendErrors = [];
  const frontendErrors = [];
  const otherAuto = [];

  for (const [, t] of autoDedup) {
    if (isAuthNoise(t)) authNoise.push(t);
    else if (isReactDomNoise(t)) frontendErrors.push(t);
    else if (isChunkLoadNoise(t)) frontendErrors.push(t);
    else if (extractHttpStatus(t.firstMessage) >= 500) backendErrors.push(t);
    else otherAuto.push(t);
  }

  // Cross-reference with snapshot
  const snapshotIds = new Set((snapshotThreads || []).map(t => t.id));
  const newThreads = threads.filter(t => !snapshotIds.has(t.id));
  const resolvedThreads = (snapshotThreads || []).filter(t =>
    !threads.find(ct => ct.id === t.id)
  );

  // Build markdown
  const now = new Date().toISOString();
  const lines = [];
  lines.push(`# Feedback Verification Report`);
  lines.push(`**Environment:** ${env}`);
  lines.push(`**Base URL:** ${ENVIRONMENTS[env].baseUrl}`);
  lines.push(`**Generated:** ${now}`);
  lines.push(`**Account:** ${ENVIRONMENTS[env].email}`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`- Total threads: **${threads.length}**`);
  lines.push(`  - Manual (staff reports): **${manual.length}**`);
  lines.push(`  - Auto-detected: **${auto.length}** → deduplicated to **${autoDedup.size}** clusters`);
  lines.push(`- Auth/permission noise (401/403): **${authNoise.length}** clusters`);
  lines.push(`- Backend errors (500+): **${backendErrors.length}** clusters`);
  lines.push(`- Frontend errors (DOM/chunk): **${frontendErrors.length}** clusters`);
  lines.push(`- Other auto errors: **${otherAuto.length}** clusters`);
  lines.push(`- New since last snapshot: **${newThreads.length}**`);
  lines.push(`- Resolved since last snapshot: **${resolvedThreads.length}**`);
  lines.push('');

  // Manual reports with verification checklist
  lines.push('## Manual Staff Reports (Action Required)');
  lines.push('');
  for (const t of manual) {
    const endpoint = extractApiEndpoint(t.firstMessage);
    lines.push(`### ${t.category || 'uncategorized'} | ${t.status} | ${t.pagePath}`);
    lines.push(`- **ID:** \`${t.id}\``);
    lines.push(`- **Reporter:** ${t.employeeName || 'unknown'}`);
    lines.push(`- **Created:** ${t.createdAt}`);
    lines.push(`- **Page:** ${t.pageUrl || t.pagePath}`);
    lines.push(`- **Message:** ${t.firstMessage?.replace(/\n/g, ' ') || '(empty)'}`);
    if (endpoint) lines.push(`- **API:** \`${endpoint}\``);
    lines.push(`- [ ] **Verified** — reproduce on ${env}`);
    lines.push(`- [ ] **Fixed** — code change applied`);
    lines.push(`- [ ] **Confirmed** — staff signed off or auto-error stopped`);
    lines.push('');
  }

  // Backend errors
  if (backendErrors.length > 0) {
    lines.push('## Backend Error Clusters (500+)');
    lines.push('');
    for (const t of backendErrors) {
      const endpoint = extractApiEndpoint(t.firstMessage);
      const status = extractHttpStatus(t.firstMessage);
      lines.push(`### ${t.category || 'unknown'} | HTTP ${status} | ${endpoint || 'N/A'}`);
      lines.push(`- **Occurrences:** ${t._count}`);
      lines.push(`- **Latest:** ${t.updatedAt}`);
      lines.push(`- **Sample IDs:** ${t._ids.slice(0, 3).join(', ')}${t._ids.length > 3 ? '...' : ''}`);
      lines.push(`- **First message:** ${t.firstMessage?.replace(/\n/g, ' ').slice(0, 200)}`);
      lines.push(`- [ ] **Investigate** — check server logs for ${endpoint}`);
      lines.push(`- [ ] **Fix** — resolve root cause`);
      lines.push(`- [ ] **Verify** — no new occurrences for 24h`);
      lines.push('');
    }
  }

  // Frontend errors
  if (frontendErrors.length > 0) {
    lines.push('## Frontend Error Clusters');
    lines.push('');
    for (const t of frontendErrors) {
      lines.push(`### ${isReactDomNoise(t) ? 'React DOM Mutation' : 'Chunk Load Failure'} | ${t.category || 'unknown'}`);
      lines.push(`- **Occurrences:** ${t._count}`);
      lines.push(`- **Latest:** ${t.updatedAt}`);
      lines.push(`- **Page:** ${t.pagePath}`);
      lines.push(`- [ ] **Investigate** — reproduce or check Sentry`);
      lines.push('');
    }
  }

  // Auth noise (informational)
  if (authNoise.length > 0) {
    lines.push('## Auth/Permission Noise (Likely False Positives)');
    lines.push(`> These are 401/403 errors, often from expired sessions or permission-bound pages. ` +
      `${authNoise.length} clusters, ${authNoise.reduce((s, t) => s + t._count, 0)} total occurrences.`);
    lines.push('');
    for (const t of authNoise.slice(0, 10)) {
      const endpoint = extractApiEndpoint(t.firstMessage);
      const status = extractHttpStatus(t.firstMessage);
      lines.push(`- \`${endpoint}\` → HTTP ${status} (${t._count}×)`);
    }
    if (authNoise.length > 10) lines.push(`- ... and ${authNoise.length - 10} more`);
    lines.push('');
  }

  // Delta
  lines.push('## Delta Since Last Snapshot');
  lines.push(`- Snapshot file: \`reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-threads.csv\``);
  lines.push(`- New threads: **${newThreads.length}**`);
  lines.push(`- Resolved threads: **${resolvedThreads.length}**`);
  if (newThreads.length > 0) {
    lines.push('### New Threads');
    for (const t of newThreads.slice(0, 20)) {
      lines.push(`- \`${t.id}\` | ${t.source} | ${t.category} | ${t.pagePath}`);
    }
    if (newThreads.length > 20) lines.push(`- ... and ${newThreads.length - 20} more`);
  }
  lines.push('');

  // Action items
  lines.push('## Recommended Action Order');
  lines.push('1. **Fix manual staff reports first** — these are confirmed user-facing bugs');
  lines.push('2. **Investigate backend 500 clusters** — these affect all users');
  lines.push('3. **Address frontend DOM/chunk errors** — degrade UX');
  lines.push('4. **Review auth noise** — may indicate permission gaps or session handling issues');
  lines.push('');

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = process.argv[2] || 'live';
  if (!ENVIRONMENTS[env]) {
    console.error(`Unknown environment: ${env}. Use: live, staging, local`);
    process.exit(1);
  }

  const cfg = ENVIRONMENTS[env];
  if (!cfg.email || !cfg.password) {
    console.error(`Missing credentials for ${env}. Set env vars or check .agents/live-site.env`);
    process.exit(1);
  }

  console.log(`🔐 Logging in to ${env} as ${cfg.email}...`);
  const token = await login(cfg.baseUrl, cfg.email, cfg.password);
  console.log('✅ Logged in');

  console.log('📥 Fetching all threads...');
  const allThreads = await fetchAllThreads(cfg.baseUrl, token, null);
  console.log(`✅ Fetched ${allThreads.length} threads`);

  // Load previous snapshot for delta
  let snapshotThreads = [];
  const snapshotPath = path.join(__dirname, '..', 'reports', 'feedback-extract', '2026-05-15T21-37-24-528Z-feedback-threads.csv');
  if (fs.existsSync(snapshotPath)) {
    const csv = fs.readFileSync(snapshotPath, 'utf8');
    const lines = csv.split('\n').slice(1); // skip header
    for (const line of lines) {
      const cols = line.split(',');
      if (cols[0]) snapshotThreads.push({ id: cols[0], source: cols[2], category: cols[3] });
    }
    console.log(`📂 Loaded ${snapshotThreads.length} threads from snapshot`);
  }

  // Generate report
  const report = generateReport(env, allThreads, snapshotThreads);
  const outDir = path.join(__dirname, '..', 'reports', 'feedback-extract');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-feedback-verification.md`);
  fs.writeFileSync(outFile, report);
  console.log(`📝 Report written to: ${outFile}`);

  // Also write JSON for programmatic use
  const jsonOut = {
    env,
    baseUrl: cfg.baseUrl,
    generatedAt: new Date().toISOString(),
    totalThreads: allThreads.length,
    manualCount: allThreads.filter(t => t.source === 'manual').length,
    autoCount: allThreads.filter(t => t.source === 'auto').length,
    threads: allThreads,
  };
  const jsonFile = outFile.replace('.md', '.json');
  fs.writeFileSync(jsonFile, JSON.stringify(jsonOut, null, 2));
  console.log(`📝 JSON written to: ${jsonFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
