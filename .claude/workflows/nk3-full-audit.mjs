export const meta = {
  name: 'nk3-full-audit',
  description: 'Full read-only multi-dimension audit of the NK3 deployment (https://76-13-16-68.sslip.io) with adversarial verification + synthesis',
  phases: [
    { title: 'Audit', detail: '11 parallel read-only dimension auditors' },
    { title: 'Verify', detail: 'adversarial skeptics per CRITICAL/HIGH finding (3/2 lenses)' },
    { title: 'Synthesize', detail: 'merge into prioritized P0/P1/P2 audit report' },
  ],
}

const COMMON = [
  'PROJECT & TARGET',
  '- Repo: /Users/thuanle/Documents/TamTMV/Tgrouptest (git branch nk3-deploy, HEAD e9c304ec0).',
  '- TARGET = "NK3": a STAGING deployment of a dual-LOB (dental + cosmetic) clinic-management system with a CTV (collaborator/affiliate) commission money-flow.',
  '- NK3 live URL (confirmed HTTP 200, ~0.7s): https://76-13-16-68.sslip.io  (nk3.2checkin.com does NOT resolve).',
  '- NK3 on VPS: /opt/tgroup-nk3 (web :5375, api :3202, COSMETIC_LOB_ENABLED=true). NK3 DBs live ON THE VPS: tdental_nk3 + tcosmetic_nk3.',
  '- Local machine: only Homebrew Postgres on :5433 (holds *_demo data = NK/NK2 demo, NOT nk3). Local API/web NOT running. No local Docker.',
  '- VPS SSH: ~/.ssh/config has a HostName 76.13.16.68 entry. Find its Host alias and try `ssh <alias> "cmd"` non-interactively. If it demands an interactive password, do NOT block; report it and fall back to the public URL + static code.',
  '- Admin login on all envs: t@clinic.vn / 123123 (only valid admin account).',
  '',
  'HARD RULES (this is an AUDIT — strictly read-only)',
  '- Do NOT edit files, mutate DBs, run mutating tests, deploy, push, or start state-changing services. Leave any ALLOW_MUTATIONS gate OFF. Do NOT touch *_demo databases.',
  '- Prefer: live URL probes (curl / HTTP), static code analysis, graphify, and read-only SELECTs (on the correct DB only).',
  '- EVERY finding MUST carry CONCRETE evidence: a file:line, OR a URL + HTTP code, OR an exact command you ran + its real output. If you could not verify, say so explicitly and set confidence=low. Do not speculate.',
  '',
  'NAVIGATION (mandatory for you too)',
  '- A knowledge graph exists at graphify-out/graph.json. BEFORE grepping or reading source, run `graphify query "<question>"` (scoped subgraph), `graphify explain "<concept>"`, or `graphify path "<A>" "<B>"`. Only grep/read a specific file:line AFTER graphify orients you. gitnexus semantic search may be unavailable (read-only index); prefer graphify.',
  '- Authority docs to consult as relevant: docs/SECURITY.md, docs/INVARIANTS.md, docs/CONTRACTS.md, product-map/contracts/permission-registry.yaml, product-map/contracts/api-index.md, product-map/domains/auth.yaml, product-map/schema-map.md, .claude/CONTEXT/database.md, docs/runbooks/DEPLOYMENT.md, docs/CHANGELOG.md.',
].join('\n')

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'overallStatus', 'summary', 'findings'],
  properties: {
    dimension: { type: 'string' },
    overallStatus: { type: 'string', enum: ['healthy', 'degraded', 'broken', 'unknown'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'severity', 'category', 'evidence', 'impact', 'recommendation', 'confidence'],
        properties: {
          id: { type: 'string', description: 'short kebab id unique within this dimension, e.g. money-dblcount' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
          category: { type: 'string' },
          evidence: { type: 'string', description: 'file:line OR url+http code OR command + real output' },
          impact: { type: 'string' },
          recommendation: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findingId', 'verdict', 'adjustedSeverity', 'reasoning'],
  properties: {
    findingId: { type: 'string' },
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'downgraded', 'needs-info'] },
    adjustedSeverity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
    reasoning: { type: 'string' },
    contradictingEvidence: { type: 'string' },
  },
}

const DIMENSIONS = [
  {
    key: 'infra-deploy',
    title: 'Deployment & Infrastructure',
    prompt: [
      'AUDIT DIMENSION: Deployment & Infrastructure integrity of the NK3 staging deployment.',
      '1. Live URL https://76-13-16-68.sslip.io: probe HTTP status, response time, TLS/LE cert validity (expiry, issuer), security headers (HSTS/CSP/X-Frame), and the version exposed by the VersionDisplay/CHANGELOG.json (compare to website/package.json version and git HEAD e9c304ec0).',
      '2. VPS /opt/tgroup-nk3 via the ssh alias for 76.13.16.68: live git HEAD vs local nk3-deploy, running node processes (api :3202 / web :5375), COSMETIC_LOB_ENABLED, tarball-deploy integrity (NK3 is tarball, not docker). Detect silent revert (memory warns parallel sessions can revert /opt/tgroup-nk3/app).',
      '3. .github/workflows/nk3-verify-packages.yml (untracked) — what does it verify? Is CI covering NK3?',
      '4. Read docs/runbooks/DEPLOYMENT.md and report whether the running state matches the documented deploy flow.',
      'Report the deployment-ladder rung NK3 sits on (🔴..🟢) with evidence.',
    ].join('\n'),
  },
  {
    key: 'money-commission',
    title: 'CTV Commission Money-Flow',
    prompt: [
      'AUDIT DIMENSION: CTV commission money-flow — THE HIGHEST-RISK surface.',
      'NOTE: api/src/services/serviceReversal.js AND api/src/services/__tests__/serviceReversal.test.js are MODIFIED-UNCOMMITTED right now. Inspect the working-tree diff (`git -C /Users/thuanle/Documents/TamTMV/Tgrouptest diff -- api/src/services/serviceReversal.js`) and assess whether the uncommitted edits are safe / complete / possibly half-applied.',
      'Verify the commission model: commission = saleorders.ctv_id + commission_level_config levels × paid amount (NO 20% default, NO product rate). Find the calc code via `graphify query "CTV commission calculation"`. Check for: double-counting, missing/incorrect reversal (soft vs hard), paid-out 409 guard, hierarchy cycle guard (getCtvHierarchy BFS seeds upline chain), retroactive CTV-assign backfill, earnings-driven journey (stage 4 = payout, not customer-paid).',
      'Read testsprite_tests/ctv_commission/ (31 cases W1-W8) and INV-003C invariant. Do NOT execute mutating tests; read them.',
      'Consult docs/CONTRACTS.md, docs/INVARIANTS.md, docs/SECURITY.md.',
      'Flag ANY path that could mis-pay, double-pay, fail to reverse, or leak commission up a cyclic hierarchy.',
    ].join('\n'),
  },
  {
    key: 'auth-permissions',
    title: 'Auth & Permissions',
    prompt: [
      'AUDIT DIMENSION: Authentication + authorization / permission system.',
      'Verify the tier_id auto-grant fix in permissionService: is_ctv users must get CTV perms (ctv.dashboard.view etc.) regardless of staff tier_id (prior bug: Editor tier_id skipped the grant → 403 on whole CTV portal + leaked payment.edit). Confirm no regression.',
      'Verify authLob resolution: cosmetic routes (/api/cosmetic/*) MUST resolve perms vs the callers HOME DB (req.user.authLob), NOT the ALS request-LOB, or admins get 403.',
      'Audit permission registry coverage (product-map/contracts/permission-registry.yaml) vs actual requirePermission/requireScope call sites. CTV portal scope enforcement. requireLobScope on dental legacy routes (memory: a DESIGNED gap INV-008A/009 — dental legacy routes lack requireLobScope, FE-enforced). Confirm whether that gap is still acceptable or has widened.',
      'JWT config (secret, expiry, algorithm). Read product-map/domains/auth.yaml.',
      'Find NEW permission leaks or 403 regressions beyond the known-and-fixed ones.',
    ].join('\n'),
  },
  {
    key: 'contracts-types',
    title: 'Contracts & Type Alignment',
    prompt: [
      'AUDIT DIMENSION: Contract / type integrity across FE and BE.',
      'CRITICAL: api/src/routes/services.js is DELETED (git status D, confirmed absent on disk). Find EVERY orphaned reference — route mount in the express app, imports, and frontend calls to /api/services or /api/Services. Use `graphify path "services.js"` and grep narrowly. Report each dangling reference as a finding.',
      'Audit contracts/ Zod schemas (Partner, Appointment, Payment) for FE/BE alignment. Cross-check product-map/contracts/api-index.md routes vs actual express route registrations.',
      'Read docs/CONTRACTS.md. Flag any contract drift where BE validates differently than FE expects.',
    ].join('\n'),
  },
  {
    key: 'data-integrity',
    title: 'Data & DB Integrity',
    prompt: [
      'AUDIT DIMENSION: Database / data integrity and isolation.',
      'DB ISOLATION: tdental_nk3 + tcosmetic_nk3 (on VPS) MUST be isolated from *_demo (local :5433 = NK/NK2 demo). Via ssh alias, verify the NK3 DBs exist, are reachable, and have sane row counts (memory: cosmetic ~4.5k appointments). Confirm the local :5433 is demo-only and no code path accidentally points nk3 at *_demo.',
      'Schema drift: compare dental vs cosmetic DB schemas and the SQL views (memory: ~11 views created so legacy routes work against the 3-table demo DB). Assess the deleted services.js impact on any view/route.',
      'Timestamps: VN-local NAIVE (memory: do NOT add AT TIME ZONE). Confirm no code is doing tz conversion that would corrupt them. search_path=dbo usage.',
      'Read .claude/CONTEXT/database.md, product-map/schema-map.md.',
      'Read-only SELECTs only; never write.',
    ].join('\n'),
  },
  {
    key: 'security',
    title: 'Security',
    prompt: [
      'AUDIT DIMENSION: Security (OWASP-oriented).',
      'Secrets: grep for hardcoded API keys / JWT_SECRET / passwords / DB creds in source and committed env files. Check .gitignore (modified) and website/.env* handling. VITE flag baking (memory: must be in .env.production.local, Dockerfile.web asserts).',
      'Injection: dynamic SQL + search_path=dbo (SQL injection surface), XSS (dangerouslySetInnerHTML/innerHTML), path traversal in file routes.',
      'Auth surface: JWT config/expiry/rotation, CORS config (origin allowlist), rate limiting on auth + state-changing endpoints, CSP/security headers (probe the live URL).',
      'Verify the prior tier_id → payment.edit leak is actually fixed (not just documented).',
      'Read docs/SECURITY.md. Cite file:line for every issue.',
    ].join('\n'),
  },
  {
    key: 'performance',
    title: 'Performance',
    prompt: [
      'AUDIT DIMENSION: Performance.',
      'Known root cause (verify current state): single Node process on 8 cores + pg pool max=10/DB-default + uncached per-req permission resolution + dual-LOB (dental+cosmetic) fan-out + Feedback/unread-count amplification → admin portal 1.3-2.3s. Live URL measured ~0.7s — reconcile with the contention thesis.',
      'A parallel worktree Tgrouptest-perf (branch nk3-perf-quickwins, HEAD 9eee2180c) exists. Determine whether the perf fixes (pg pool max↑, Node clustering, permission cache) LANDED on nk3-deploy (e9c304ec0) or are stranded in the worktree. `git log nk3-deploy..nk3-perf-quickwins --oneline` and inspect.',
      'Find the api pg-pool config and server bootstrap (clustering?). Find any measure.mjs perf harness.',
      'Read the memory note context; cite file:line for config values you find.',
    ].join('\n'),
  },
  {
    key: 'functional-flows',
    title: 'Functional Flows',
    prompt: [
      'AUDIT DIMENSION: Functional correctness of key user flows (verify via live URL + code).',
      'Login (t@clinic.vn/123123) → dashboard renders without console errors. Probe https://76-13-16-68.sslip.io login page HTML + /api/auth health.',
      'CTV portal: is_ctv user can access portal without 403 (the prior whole-portal 403 must be gone). Public CTV join link /api/ctv-public + /ctv/join.',
      'CTV refer modal: Service + Notes fields, persists to appointment productid/note; services from GET /api/ctv/services?lob=. Per-customer referred_by_ctv_id assign-only; ctv_id wire field.',
      'Cosmetic appointment CRUD + payment → commission creation end-to-end.',
      'Which features are wired to real DB vs still mock? Read .claude/CONTEXT/feature-status.md if present.',
      'Cite URL+HTTP or file:line. Do not log in destructively.',
    ].join('\n'),
  },
  {
    key: 'test-coverage',
    title: 'Test Coverage',
    prompt: [
      'AUDIT DIMENSION: Test suite health and coverage gaps.',
      'testsprite_tests/ (testsprite-results.json is modified-uncommitted) + testsprite_tests/ctv_commission/ (31 cases). website/src/pages/CTV/CtvDashboard.test.tsx is modified-uncommitted. api/src/services/__tests__/serviceReversal.test.js is modified-uncommitted.',
      'Determine vitest/jest config, what runs in CI (nk3-verify-packages.yml), ALLOW_MUTATIONS gating discipline, TESTSPRITE row purge after mutating runs.',
      'Identify coverage GAPS especially on the money path (commission calc, reversal, payout) and the deleted services.js (were its tests removed too?).',
      'Do NOT run mutating tests. Read-only inventory. Report green/red/missing per suite where determinable from code.',
    ].join('\n'),
  },
  {
    key: 'dead-code-config',
    title: 'Dead Code & Config Drift',
    prompt: [
      'AUDIT DIMENSION: Repo hygiene, dead code, and config drift.',
      'Dead endpoints (memory: some 500s not user-facing) — identify and classify. Deleted api/src/routes/services.js (covered in contracts dim; here: cleanup completeness).',
      'NEW husky hooks (.husky/post-checkout, .husky/post-commit are untracked; .husky/_/ added) — read each and assess SAFETY: do they auto-run graphify rebuild / git operations that could clobber parallel worktrees? This is high-relevance given 8 active worktrees.',
      '.claude/settings.json (modified) vs .claude/settings.json.pre-graphify.bak, CLAUDE.md.pre-graphify.bak, .graphify_detect.json, .gitnexusignore, coding-reference-catalog.md — what changed, is the graphify integration safe and reversible?',
      'Report risk + concrete cleanup candidates with file:line.',
    ].join('\n'),
  },
  {
    key: 'i18n-a11y',
    title: 'i18n & Accessibility',
    prompt: [
      'AUDIT DIMENSION: Internationalization + the global accent-insensitive-search rule + a11y.',
      'GLOBAL RULE (AGENTS.md §1.1): ALL project search bars must be accent-insensitive — Vietnamese names/labels with diacritics must match when typed without accents. Audit the shared normalizeText() helper (FE) and the backend accent-stripped compare (where the route owns filtering). Find search inputs that bypass it. This is a hard project invariant — violations are HIGH.',
      'Aesthetic/cosmetic LOB i18n: commit 6430b5a78 "aesthetic LOB pink accent theme + Aesthetic i18n" (v0.37.10). Audit i18n key completeness across LOBs (dental vs cosmetic) — missing keys, hardcoded Vietnamese/English strings in components.',
      'Basic a11y: semantic HTML, labeled form controls, keyboard reachability on the CTV portal + admin dashboard.',
      'Cite file:line for every gap.',
    ].join('\n'),
  },
]

function lensesFor(severity) {
  if (severity === 'CRITICAL') {
    return [
      'REPRODUCE-OR-REFUTE: independently re-run the cited evidence (graphify query / read the file:line / curl the URL) and see if it actually holds. DEFAULT to REFUTED if you cannot reproduce it.',
      'RISK-MAGNITUDE: is the claimed impact/severity overstated? Re-score. A true-but-low-impact issue should be DOWNGRADED; a true-and-severe one CONFIRMED.',
      'EVIDENCE-SUFFICIENCY: does the cited evidence actually PROVE the claim, or is it circumstantial/thin? DEFAULT to NEEDS-INFO or REFUTED if the evidence does not support the severity.',
    ]
  }
  return [
    'REPRODUCE-OR-REFUTE: independently re-run the cited evidence. DEFAULT to REFUTED if you cannot reproduce it.',
    'EVIDENCE-SUFFICIENCY: does the cited evidence actually prove the claim? DEFAULT to NEEDS-INFO or REFUTED if thin.',
  ]
}

async function verifyFinding(d, f) {
  const lenses = lensesFor(f.severity)
  const votes = await parallel(
    lenses.map((lens, i) => () =>
      agent(
        COMMON +
          '\n\n=== ADVERSARIAL VERIFIER ===\n' +
          'You are an INDEPENDENT SKEPTIC. Your default is doubt; assume the finding is wrong until you confirm it yourself.\n' +
          'YOUR LENS: ' + lens + '\n\n' +
          'DIMENSION: ' + d.key + ' (' + d.title + ')\n' +
          'FINDING TO VERIFY:\n' + JSON.stringify(f, null, 2) + '\n\n' +
          'Independently verify via graphify query / reading the cited file:line / curling the cited URL. Cite exactly what you checked and what you observed. Then return your verdict.',
        { label: 'verify:' + d.key + ':' + f.id + ':' + (i + 1), phase: 'Verify', schema: VERDICT_SCHEMA, model: 'sonnet' }
      )
    )
  )
  return votes.filter(Boolean)
}

phase('Audit')
log('Launching 11 read-only dimension auditors over NK3 (https://76-13-16-68.sslip.io)...')

const audited = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(COMMON + '\n\n=== AUDITOR ===\nYou are the lead auditor for ONE dimension. Be exhaustive and evidence-driven.\n\n' + d.prompt, {
      label: 'audit:' + d.key,
      phase: 'Audit',
      schema: AUDIT_SCHEMA,
      model: 'sonnet',
    }),
  async (result, d) => {
    if (!result || !result.findings) {
      return {
        dimension: d.key,
        dimensionTitle: d.title,
        overallStatus: result && result.overallStatus ? result.overallStatus : 'unknown',
        summary: result && result.summary ? result.summary : 'audit agent for ' + d.key + ' returned no structured result',
        findings: [],
        verdicts: [],
      }
    }
    const toVerify = result.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
    const verdicts = await parallel(
      toVerify.map((f) => () => verifyFinding(d, f).then((votes) => ({ findingId: f.id, title: f.title, originalSeverity: f.severity, votes: votes })))
    )
    return Object.assign({}, result, { dimensionKey: d.key, dimensionTitle: d.title, verdicts: verdicts.filter(Boolean) })
  }
)

const ok = audited.filter(Boolean)
const totalFindings = ok.reduce((n, a) => n + (a.findings ? a.findings.length : 0), 0)
const critHigh = ok.reduce(
  (n, a) => n + (a.findings ? a.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length : 0),
  0
)
const verified = ok.reduce((n, a) => n + (a.verdicts ? a.verdicts.length : 0), 0)
log('Audit+verify complete: ' + ok.length + '/11 dimensions | findings ' + totalFindings + ' | CRITICAL/HIGH ' + critHigh + ' | verifications ' + verified)

phase('Synthesize')
const dataset = ok.map((a) => ({
  dimension: a.dimension,
  dimensionTitle: a.dimensionTitle || a.dimension,
  overallStatus: a.overallStatus,
  summary: a.summary,
  findings: a.findings,
  verdicts: a.verdicts,
}))

let report
try {
  report = await agent(
  COMMON +
    '\n\n=== SYNTHESIS LEAD ===\n' +
    'You are the synthesis lead for a full NK3 audit. Below is per-dimension audit data with adversarial verifier verdicts. Produce a comprehensive, prioritized audit REPORT in markdown.\n\n' +
    'RULES:\n' +
    '- A finding is CONFIRMED only if at least one verifier says "confirmed" AND no verifier says "refuted" with concrete contradicting evidence. Weight verifier reasoning; if verdicts split, say so.\n' +
    '- DOWNGRADE severity when a verifier downgraded and you agree; explain why.\n' +
    '- DROP findings that were refuted, but list them briefly in a "Refuted / withdrawn" section so the user sees what was considered and rejected.\n' +
    '- Order surviving findings by severity (CRITICAL first), then by money/security/data risk.\n' +
    '- For each surviving finding: id, title, severity, dimension, evidence (file:line / URL / command), impact, recommendation, confidence, and a one-line verifier verdict summary.\n' +
    '- Open with an EXECUTIVE SUMMARY: NK3 overall health verdict (healthy/degraded/broken), the single most important risk, and the deployment-ladder rung with evidence.\n' +
    '- End with a PRIORITIZED REMEDIATION PLAN grouped P0 (ship now / money-security-data), P1 (this week), P2 (cleanup).\n' +
    '- Be precise and concrete. No filler. This report goes to the repo owner.\n\n' +
    'AUDIT DATA (JSON):\n' + JSON.stringify(dataset, null, 2),
    { label: 'synthesize', phase: 'Synthesize', model: 'sonnet' }
  )
} catch (e) {
  // Resilience guard (added 2026-06-26 after a trailing ReferenceError once vaporized a
  // completed ~1.4M-token audit run): a synthesis failure must NEVER throw away the
  // expensive per-dimension audit + verifier verdicts. Surface the error and let the raw
  // `dataset` in the return below carry the work, so only the cheap Synthesize phase is lost.
  report =
    '⚠️ SYNTHESIS FAILED: ' + (e && e.message ? e.message : String(e)) +
    '\n\nThe full per-dimension audit data + verifier verdicts are preserved in the `dataset` field of this result — re-run only the Synthesize phase over it.'
  log('Synthesis failed: ' + (e && e.message ? e.message : String(e)) + ' — returning raw audit dataset instead.')
}

return {
  report,
  stats: {
    dimensionsAudited: ok.length,
    dimensionsTotal: DIMENSIONS.length,
    totalFindings,
    critHigh,
    verifications: verified,
  },
  perDimension: ok.map((a) => ({ dimension: a.dimensionKey || a.dimension, overallStatus: a.overallStatus, findingCount: a.findings ? a.findings.length : 0 })),
  dataset,
}
