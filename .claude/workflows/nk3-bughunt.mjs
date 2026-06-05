export const meta = {
  name: 'nk3-bughunt',
  description: 'Exhaustive root-caused bug hunt over the NK3 (nk3-deploy) CTV/booking/commission/cosmetic surface, with adversarial 3-lens verification',
  phases: [
    { title: 'Find', detail: '7 finders, one per NK3 slice, root-cause investigation' },
    { title: 'Verify', detail: 'adversarial 3-lens refutation panel per candidate bug' },
  ],
}

const ROOT = '/Users/thuanle/Documents/TamTMV/Tgrouptest'

const COMMON = `
You are hunting REAL bugs on the NK3 deployment ONLY (branch nk3-deploy).
NK3 = the CTV portal + public guest booking + commission v3 + cosmetic-LOB work that serves
https://tmv.2checkin.com / https://ctv.thammyvientam.com / https://76-13-16-68.sslip.io
(web :5375, api :3202, *_smoketest DBs). IGNORE NK/NK2 dental-only code.

Repo root: ${ROOT}

NK3 domain facts you MUST respect (do NOT flag these as bugs — they are intended):
- DB stores Vietnam wall-clock as NAIVE timestamps. Do NOT flag missing "AT TIME ZONE" as a bug.
- CTV journey/portal stages derive ONLY from dbo.earnings (born at payment time). Stage 4 = payout, not customer-paid.
- Cosmetic /api/cosmetic/* authz resolves perms vs caller's HOME db (req.user.authLob), NOT the ALS request-LOB.
- CTV selector sets the customer's referred_by_ctv_id (per-customer, assign-only). Wire field is ctv_id.
- API routes are PascalCase collections: /api/Ctvs/options, /api/Products, /api/Partners. Lowercase /api/customers etc. 404 by design.
- Commission = saleorders.ctv_id + commission_level_config levels x paid amount (no 20% default, no product rate).
- referred_by cycles are guarded: getCtvHierarchy seeds BFS with the upline chain.

METHOD (systematic debugging, Iron Law = root cause before claiming a bug):
1. READ the cited files fully. Trace data flow across layers (component -> lib/api -> route -> service -> DB).
2. A "bug" must be a concrete defect: wrong logic, crash path, contract mismatch, missing await,
   unhandled error, broken validation, security/authz hole, state desync, i18n key defined-but-not-wired
   or wired-but-not-defined, disabled control with no explanation, data component missing loading/empty/error state.
3. You MAY run read-only checks with Bash: grep, cat, run the existing tests, tsc, eslint.
   You MAY probe the LIVE api READ-ONLY (GET only) to confirm runtime behavior. NEVER POST/PUT/DELETE the live site (login GET-token is fine):
     TOK=$(curl -s -X POST https://tmv.2checkin.com/api/auth/login -H 'Content-Type: application/json' -d '{"email":"t@clinic.vn","password":"123123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('NOTOKEN')}})")
     curl -s -H "Authorization: Bearer $TOK" "https://tmv.2checkin.com/api/<Route>"
4. For each finding give exact file:line, the ROOT CAUSE (not the symptom), a concrete reproduction, the user impact, and a minimal suggested fix.
5. Quality over quantity. Do NOT pad with style nits or speculative "could be improved". If you find nothing real, return an empty findings array. Default to NOT reporting when uncertain.
`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'findings'],
  properties: {
    area: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'files', 'rootCause', 'reproduction', 'impact', 'suggestedFix', 'confidence'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          files: { type: 'array', items: { type: 'string' }, description: 'exact file:line references' },
          rootCause: { type: 'string' },
          reproduction: { type: 'string' },
          impact: { type: 'string' },
          suggestedFix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'confidence', 'reasoning', 'correctedSeverity'],
  properties: {
    isReal: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    correctedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'not-a-bug'] },
    fixNotes: { type: 'string' },
  },
}

const AREAS = [
  {
    key: 'public-booking',
    prompt: `${COMMON}
SLICE: Public guest appointment booking (phone-first) + CTV public join.
Read & trace:
- ${ROOT}/api/src/routes/ctvPublic.js
- ${ROOT}/website/src/pages/CTV/JoinCtv.tsx
- ${ROOT}/website/src/lib/api/ctv.ts (booking / public funcs)
- ${ROOT}/api/src/routes/__tests__/ctvPublicJoin.test.js
- ${ROOT}/api/src/routes/__tests__/ctvBookings.test.js
- ${ROOT}/website/src/lib/api/__tests__/ctv.booking.test.ts
Hunt: phone verification bypass, guest booking creating appointment with wrong/missing CTV attribution (ctv_id / referred_by_ctv_id),
auto-populate leaking another customer's PII by phone, missing input validation, unhandled errors, lob mismatch, productid/note persistence, duplicate-submit, rate-limit/abuse on the public unauthenticated endpoint.`,
  },
  {
    key: 'refer-services',
    prompt: `${COMMON}
SLICE: CTV refer modal + services endpoint.
Read & trace:
- ${ROOT}/website/src/components/ctv/CtvReferModal.tsx
- ${ROOT}/website/src/lib/api/ctv.ts
- ${ROOT}/api/src/routes/ctv.js (services?lob endpoint, refer/assign)
- ${ROOT}/website/src/components/ctv/CtvReferModal.test.tsx
- ${ROOT}/website/src/i18n/locales/vi/ctv.json and en/ctv.json
Hunt: services?lob returning wrong LOB list, refer persisting to appointment productid/note incorrectly, assign-only semantics violated (overwriting existing referred_by),
i18n keys used in JSX but missing from ctv.json (or defined but never used), form validation gaps, disabled submit with no explanation, error states.`,
  },
  {
    key: 'self-profile',
    prompt: `${COMMON}
SLICE: CTV self-service profile + account settings + password change.
Read & trace:
- ${ROOT}/api/src/routes/ctvProfile.js
- ${ROOT}/api/src/services/ctvSelfProfile.js
- ${ROOT}/website/src/pages/CTV/tabs/CtvMeTab.tsx
- ${ROOT}/website/src/pages/CTV/tabs/CtvAccountSettings.tsx
- ${ROOT}/website/src/lib/api/ctvSelf.ts
- ${ROOT}/website/src/components/shared/ChangePasswordModal.tsx
- ${ROOT}/api/src/services/__tests__/ctvSelfProfile.test.js
Hunt: a CTV being able to read/update ANOTHER ctv's profile (IDOR / missing self-scope check), password change without verifying current password,
field updates silently dropped across the component->api->service->DB chain, response leaking password hash / other PII, lob_scope tampering.`,
  },
  {
    key: 'commission-earnings',
    prompt: `${COMMON}
SLICE: Commission v3 + earnings/journey + dashboard.
Read & trace:
- ${ROOT}/api/src/routes/ctv.js (commission / earnings / hierarchy)
- ${ROOT}/website/src/pages/CTV/CtvDashboard.tsx
- ${ROOT}/website/src/pages/CTV/CtvDashboard.test.tsx
Hunt: commission computed off the wrong base (not paid amount, or double-counting levels), payout/delete guard (409) bypass allowing deletion of paid-out payment,
journey stage derived from something other than dbo.earnings, hierarchy cycle causing infinite loop / wrong downline, money rounding errors, NaN/undefined money rendered in UI, missing empty/loading/error states on dashboard.`,
  },
  {
    key: 'authz-lob',
    prompt: `${COMMON}
SLICE: CTV route gating + cosmetic LOB authz + lob scope.
Read & trace:
- ${ROOT}/api/src/server.js (route mounting, middleware order, CTV gating)
- ${ROOT}/api/src/__tests__/ctvRouteGating.test.js
- ${ROOT}/api/src/routes/__tests__/ctvCreateLobScope.test.js
- ${ROOT}/api/src/routes/ctv.js and ctvPublic.js (auth middleware usage)
Hunt: an unauthenticated public route accidentally mounted before auth giving access to protected data, a CTV token reaching an admin-only route,
cosmetic/* perms resolved against ALS request-LOB instead of req.user.authLob (admin 403 regression), middleware ordering letting a route skip auth, missing permission check on a mutating endpoint, CORS/exposure on the public ctv endpoints.`,
  },
  {
    key: 'ui-modals',
    prompt: `${COMMON}
SLICE: NK3 shared/CTV UI surfaces touched on this branch.
Read & trace:
- ${ROOT}/website/src/components/ctv/CtvRecruitModal.tsx (+ .test.tsx)
- ${ROOT}/website/src/components/ctv/CtvModalSheet.tsx
- ${ROOT}/website/src/components/calendar/ExportDateRangeModal.tsx (+ .test.tsx)
- ${ROOT}/website/src/components/shared/ExportPreviewModal.tsx
- ${ROOT}/website/src/components/shared/Breadcrumbs.tsx (+ __tests__/Breadcrumbs.test.tsx)
- ${ROOT}/website/src/components/Layout.tsx
- ${ROOT}/website/src/pages/index.ts
Hunt: export date range producing an off-by-one / inverted range, modal not resetting state between opens, breadcrumb wrong path for CTV vs Doctor,
i18n key used but undefined (renders raw key) or defined but unused, broken prop chain, controlled/uncontrolled input warning, missing key prop in lists, a11y disabled-without-reason.
For any i18n claim, GREP the key in both vi/en ctv.json AND the JSX to prove defined-vs-wired.`,
  },
  {
    key: 'static-build',
    prompt: `${COMMON}
SLICE: Concrete build/type/lint/test regressions across the whole NK3 change set (shared files like Layout.tsx, lib/api.ts, server.js can break non-CTV code).
Run these and report ONLY real errors (with the exact message + file:line):
  cd ${ROOT}/website && npx tsc --noEmit 2>&1 | head -60
  cd ${ROOT}/website && npx vitest run 2>&1 | tail -40
  cd ${ROOT}/api && npx jest 2>&1 | tail -40
  cd ${ROOT}/website && git --no-pager diff --name-only | grep -E '\\.(ts|tsx)$' | sed 's#^website/##' | while read f; do [ -f "$f" ] && npx eslint "$f" 2>&1; done | head -60
Also: for each NEW untracked api route/service file, run \`node --check <file>\` to catch syntax errors.
Report each distinct failing test, type error, or lint error as a finding. A green run = empty findings.`,
  },
]

const LENSES = [
  { key: 'correctness', focus: 'Read the cited files yourself. Is this a REAL correctness defect with the exact root cause stated? Try hard to REFUTE it (maybe the code already handles it, maybe a guard exists elsewhere). Default isReal=false unless you can point to the concrete defective line.' },
  { key: 'reproduce', focus: 'Does the stated reproduction ACTUALLY trigger the bug given the real data flow, routes, and tests? Trace it end to end. If the repro is hand-wavy or blocked by an upstream check, isReal=false.' },
  { key: 'contract', focus: 'Is this actually a violation of an intended contract / NK3 domain rule, or is it EXPECTED behavior (see the domain facts)? Check contracts/, product-map/, and existing tests. If it is by-design, isReal=false and correctedSeverity=not-a-bug.' },
]

phase('Find')
log(`NK3 bug hunt: ${AREAS.length} finders over the nk3-deploy CTV/booking/commission/cosmetic surface`)

const results = await pipeline(
  AREAS,
  (area) => agent(area.prompt, { label: `find:${area.key}`, phase: 'Find', schema: FINDINGS_SCHEMA, agentType: 'general-purpose' }),
  (found, area) => parallel(((found && found.findings) || []).map((f) => () =>
    parallel(LENSES.map((lens) => () =>
      agent(
        `${COMMON}\nADVERSARIAL VERIFICATION (lens: ${lens.key}).\n${lens.focus}\n\nCANDIDATE BUG (area ${area.key}):\nTitle: ${f.title}\nSeverity(claimed): ${f.severity}\nFiles: ${(f.files || []).join(', ')}\nRoot cause(claimed): ${f.rootCause}\nReproduction(claimed): ${f.reproduction}\nImpact(claimed): ${f.impact}\n\nReturn your verdict. Be skeptical; default to isReal=false when uncertain.`,
        { label: `verify:${area.key}:${lens.key}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'general-purpose' },
      )
    )).then((votes) => {
      const v = votes.filter(Boolean)
      const realVotes = v.filter((x) => x.isReal).length
      return { ...f, area: area.key, votes: v, realVotes, confirmed: realVotes >= 2 }
    })
  )),
)

const all = results.flat().filter(Boolean)
const confirmed = all.filter((x) => x.confirmed)
log(`Found ${all.length} candidates; ${confirmed.length} confirmed by >=2/3 adversarial lenses`)

const sevRank = { critical: 0, high: 1, medium: 2, low: 3 }
confirmed.sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9))

return {
  summary: {
    candidates: all.length,
    confirmed: confirmed.length,
    bySeverity: confirmed.reduce((m, x) => ((m[x.severity] = (m[x.severity] || 0) + 1), m), {}),
  },
  confirmed: confirmed.map((x) => ({
    title: x.title, severity: x.severity, area: x.area, files: x.files,
    rootCause: x.rootCause, reproduction: x.reproduction, impact: x.impact,
    suggestedFix: x.suggestedFix, realVotes: x.realVotes,
    verdicts: x.votes.map((v) => ({ real: v.isReal, sev: v.correctedSeverity, why: v.reasoning })),
  })),
  rejected: all.filter((x) => !x.confirmed).map((x) => ({ title: x.title, area: x.area, realVotes: x.realVotes })),
}
