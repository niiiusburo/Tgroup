// run.mjs — orchestrates the CTV referral & commission suite against the live site.
// Usage:
//   node run.mjs                 # safe suite (read-only + negative + UI affordance)
//   ALLOW_MUTATIONS=1 node run.mjs   # also run gated mutating happy-paths
//   NO_UI=1 node run.mjs         # skip browser tests (API only)
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CONFIG, login, api, assert, assertEq, assertIn, errCode, getBrowser, closeBrowser, loggedInPage, bodyText } from './lib.mjs';
import { TESTS } from './tests.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function firstArray(j, keys) {
  if (Array.isArray(j)) return j;
  for (const k of keys) if (Array.isArray(j?.[k])) return j[k];
  return [];
}

async function gatherFixtures(token) {
  const fx = {};
  try {
    const r = await api('/api/Ctvs?limit=50', { token });
    const ctvs = firstArray(r.json, ['ctvs', 'items']);
    if (ctvs.length) {
      fx.ctvId = ctvs[0].id;
      fx.existingCtvPhone = ctvs.find((c) => c.phone)?.phone || ctvs[0].phone;
      fx.allCtvIds = ctvs.map((c) => c.id);
    }
  } catch (e) { fx._ctvErr = e.message; }
  try {
    const r = await api('/api/Partners?limit=50', { token });
    const parts = firstArray(r.json, ['items', 'partners', 'data']);
    const customer = parts.find((p) => !p.is_ctv) || parts[0];
    if (customer) { fx.customerId = customer.id; fx.customerName = customer.name; }
  } catch (e) { fx._partErr = e.message; }
  // CTV with activity = a recipient that has earnings; target = a different CTV.
  try {
    const r = await api('/api/Earnings?limit=200', { token });
    const items = firstArray(r.json, ['items']);
    const recipients = new Set(items.map((e) => e.recipient_partner_id).filter(Boolean));
    if (fx.allCtvIds) {
      fx.ctvWithActivity = fx.allCtvIds.find((id) => recipients.has(id)) || null;
      if (fx.ctvWithActivity) fx.targetUplineId = fx.allCtvIds.find((id) => id !== fx.ctvWithActivity) || null;
    }
  } catch (e) { fx._earnErr = e.message; }
  try {
    const r = await api('/api/Products?limit=1', { token });
    const prods = firstArray(r.json, ['items', 'products', 'data']);
    if (prods.length) fx.productId = prods[0].id;
  } catch { /* optional */ }
  return fx;
}

function shouldSkip(t, fx) {
  if (t.mutating && !CONFIG.ALLOW_MUTATIONS) return 'gated (mutating; set ALLOW_MUTATIONS=1)';
  if (t.kind === 'ui' && !CONFIG.UI) return 'UI disabled (NO_UI=1)';
  for (const need of t.needs || []) {
    if (fx[need] === undefined || fx[need] === null) return `missing fixture: ${need}`;
  }
  return null;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`\n=== CTV Referral & Commission suite → ${CONFIG.BASE} ===`);
  console.log(`mutations=${CONFIG.ALLOW_MUTATIONS ? 'ON' : 'OFF(safe)'} ui=${CONFIG.UI}`);
  const token = await login();
  console.log('login OK');
  const fx = await gatherFixtures(token);
  console.log('fixtures:', JSON.stringify({ customerId: fx.customerId, ctvId: fx.ctvId, ctvWithActivity: fx.ctvWithActivity, targetUplineId: fx.targetUplineId, existingCtvPhone: fx.existingCtvPhone }));

  // Shared UI page (login once) if any UI test will run.
  let browser = null, uiCtx = null, uiPage = null;
  const willRunUi = CONFIG.UI && TESTS.some((t) => t.kind === 'ui' && !shouldSkip(t, fx));
  if (willRunUi) {
    browser = await getBrowser();
    const lp = await loggedInPage(browser);
    uiCtx = lp.context; uiPage = lp.page;
    console.log('UI page logged in:', uiPage.url());
  }

  const helpers = { api, assert, assertEq, assertIn, errCode, CONFIG, bodyText };
  const results = [];
  for (const t of TESTS) {
    const skip = shouldSkip(t, fx);
    if (skip) { results.push({ ...meta(t), status: 'skip', detail: skip }); console.log(`SKIP ${t.id} — ${skip}`); continue; }
    const ctx = { token, fx, page: t.kind === 'ui' ? uiPage : undefined, ...helpers };
    const t0 = Date.now();
    try {
      const detail = await t.fn(ctx);
      const isSoft = t.soft && typeof detail === 'string' && detail.startsWith('SOFT');
      results.push({ ...meta(t), status: isSoft ? 'soft' : 'pass', detail: detail || '', ms: Date.now() - t0 });
      console.log(`${isSoft ? 'SOFT' : 'PASS'} ${t.id} — ${detail || ''}`);
    } catch (e) {
      results.push({ ...meta(t), status: 'fail', detail: e.message, ms: Date.now() - t0 });
      console.log(`FAIL ${t.id} — ${e.message}`);
    }
  }

  if (uiCtx) await uiCtx.close().catch(() => {});
  await closeBrowser();

  const report = buildReport(results, { startedAt, fx });
  const out = join(__dirname, 'REPORT.md');
  writeFileSync(out, report);
  const jsonOut = join(__dirname, 'results.json');
  writeFileSync(jsonOut, JSON.stringify({ startedAt, base: CONFIG.BASE, mutations: CONFIG.ALLOW_MUTATIONS, results }, null, 2));

  const pass = results.filter((r) => r.status === 'pass').length;
  const soft = results.filter((r) => r.status === 'soft').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skip = results.filter((r) => r.status === 'skip').length;
  console.log(`\n=== ${pass} pass · ${soft} soft · ${fail} FAIL · ${skip} skip ===`);
  console.log(`report: ${out}`);
  process.exit(fail > 0 ? 1 : 0);
}

function meta(t) { return { id: t.id, wave: t.wave, kind: t.kind, mutating: !!t.mutating, title: t.title }; }

function emoji(s) { return { pass: '✅', fail: '❌', skip: '⏭️', soft: '🟡' }[s] || '❓'; }

function buildReport(results, { startedAt, fx }) {
  const pass = results.filter((r) => r.status === 'pass').length;
  const soft = results.filter((r) => r.status === 'soft').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skip = results.filter((r) => r.status === 'skip').length;
  const lines = [];
  lines.push('# TestSprite-style Report — CTV Referral & Commission (NK3)');
  lines.push('');
  lines.push(`**Target:** ${CONFIG.BASE}  ·  **Login:** ${CONFIG.EMAIL}  ·  **Run:** ${startedAt}`);
  lines.push(`**Mode:** mutations ${CONFIG.ALLOW_MUTATIONS ? '**ON**' : 'OFF (safe / read-only + negative + UI affordance)'} · UI ${CONFIG.UI ? 'on' : 'off'}`);
  lines.push('');
  lines.push(`**Result: ${pass} pass · ${soft} soft-pass · ${fail} fail · ${skip} skipped** (of ${results.length})`);
  lines.push('');
  lines.push('## Summary by wave');
  lines.push('');
  lines.push('| Wave | ✅ | 🟡 | ❌ | ⏭️ |');
  lines.push('|---|---|---|---|---|');
  const waves = [...new Set(results.map((r) => r.wave))];
  for (const w of waves) {
    const rs = results.filter((r) => r.wave === w);
    lines.push(`| ${w} | ${rs.filter((r) => r.status === 'pass').length} | ${rs.filter((r) => r.status === 'soft').length} | ${rs.filter((r) => r.status === 'fail').length} | ${rs.filter((r) => r.status === 'skip').length} |`);
  }
  lines.push('');
  lines.push('## All cases');
  lines.push('');
  lines.push('| | ID | Wave | Kind | Mut | Title | Detail / Error |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const detail = (r.detail || '').replace(/\|/g, '\\|').slice(0, 160);
    lines.push(`| ${emoji(r.status)} | ${r.id} | ${r.wave} | ${r.kind} | ${r.mutating ? 'Y' : ''} | ${r.title.replace(/\|/g, '\\|')} | ${detail} |`);
  }
  lines.push('');
  if (fail > 0) {
    lines.push('## ❌ Failures (need triage)');
    lines.push('');
    for (const r of results.filter((x) => x.status === 'fail')) lines.push(`- **${r.id}** (${r.wave}) — ${r.title}: \`${(r.detail || '').slice(0, 200)}\``);
    lines.push('');
  }
  lines.push('## Notes');
  lines.push('');
  lines.push('- Safe mode runs read-only reads, negative/contract checks (auth gates, validation, blocked-actions that perform **no** mutation), and UI affordance checks. Mutating happy-paths (create service card, run payout, move a fresh CTV, root signup) are **gated** behind `ALLOW_MUTATIONS=1`.');
  lines.push('- Known caveat: `X-LOB` is ignored on `POST /api/SaleOrders` → cosmetic service cards attribute commission to the dental DB (separate LOB-routing bug).');
  lines.push(`- Fixtures: customerId=\`${fx.customerId || '—'}\`, ctvId=\`${fx.ctvId || '—'}\`, ctvWithActivity=\`${fx.ctvWithActivity || '—'}\`.`);
  lines.push('');
  return lines.join('\n');
}

main().catch((e) => { console.error('RUNNER ERROR:', e); process.exit(2); });
