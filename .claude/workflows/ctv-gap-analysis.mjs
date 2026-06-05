export const meta = {
  name: 'ctv-gap-analysis',
  description: 'Map every rule in docs/business-logic/ctv-referral-commission.md against current NK3 code; produce a code-grounded gap analysis + implementation plan per feature cluster',
  phases: [{ title: 'Map', detail: '8 read-only cluster mappers over the CTV referral/commission surface' }],
}

const ROOT = '/Users/thuanle/Documents/TamTMV/Tgrouptest'

const COMMON = `
You are mapping ACCEPTED BUSINESS LOGIC (the spec) against the CURRENT code, for the NK3 deployment (tmv.2checkin.com).
Spec authority file: ${ROOT}/docs/business-logic/ctv-referral-commission.md
Invariant: ${ROOT}/docs/INVARIANTS.md (INV-003C is the core CTV commission trigger).

This is READ-ONLY analysis. DO NOT edit any file. Read code, grep, and (optionally) read live tmv.2checkin.com GET endpoints to confirm runtime behavior.

NK3 facts (respect, do not contradict):
- NK3 DBs are tdental_nk3 / tcosmetic_nk3 (NOT *_smoketest). Two physical DBs, dental + cosmetic, mirrored partner rows.
- DB stores Vietnam wall-clock as NAIVE timestamps (no AT TIME ZONE conversions).
- Commission engine today: dbo.earnings + dbo.commission_level_config (levels x amount). saleorders.ctv_id carries attribution.
- INV-003C TARGET: commission born when a SERVICE CARD (saleorderline / service) with an attached CTV is CREATED, based on FULL service price (NOT amount paid). Tier config is the only rate source; product commission_rate_percent (legacy) must go.
- CTV booking stays appointment-only (creates appointment + claim, NO commission).
- Goal: implement on NK3 only first, migrate to NK/NK2 later — so flag/scope changes so NK/NK2 behavior is not silently broken (note how).

For EACH rule in your assigned cluster, determine the real code state with file:line evidence, then a concrete implementation plan. Be precise and honest: "partial" must say exactly what exists vs what's missing. Quote the current code that conflicts with the spec.

Key entry points you may use (confirm/expand via grep/glob):
- api/src/services/commissionEngine.js, api/src/services/referralClaim.js, api/src/services/serviceReversal.js
- api/src/routes/ctv.js, ctvPublic.js, ctvActions.js, ctvProfile.js, payments.js, saleOrderLines.js, services*.js, payouts*.js
- dbo.earnings, dbo.commission_level_config, dbo.commission_settings, dbo.payouts, saleorders/saleorderlines, dbo.partners
- website/src/pages/CTV/*, website/src/components/ctv/*, website/src/pages/CTV/JoinCtv.tsx, payment & customer-profile pages
`

const GAP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cluster', 'rules', 'sharedSchemaNeeds', 'summary'],
  properties: {
    cluster: { type: 'string' },
    summary: { type: 'string', description: 'one-paragraph state-of-the-world for this cluster' },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ruleId', 'title', 'codeState', 'evidence', 'plan', 'files', 'complexity', 'risk', 'testable', 'nk3Note'],
        properties: {
          ruleId: { type: 'string' },
          title: { type: 'string' },
          codeState: { type: 'string', enum: ['implemented', 'partial', 'missing', 'conflicts-with-spec'] },
          evidence: { type: 'string', description: 'file:line + what current code actually does' },
          plan: { type: 'string', description: 'concrete steps to implement/fix' },
          files: { type: 'array', items: { type: 'string' } },
          complexity: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
          risk: { type: 'string', enum: ['low', 'med', 'high'] },
          testable: { type: 'boolean' },
          nk3Note: { type: 'string', description: 'how to scope to NK3 without breaking NK/NK2' },
        },
      },
    },
    sharedSchemaNeeds: { type: 'array', items: { type: 'string' }, description: 'DB columns/tables/migrations this cluster needs' },
  },
}

const CLUSTERS = [
  {
    key: 'commission-engine',
    prompt: `${COMMON}
CLUSTER: Commission trigger + tier rates (spec §3, §4; gaps #1,#2,#3).
Rules to map:
- Service-card creation with attached CTV creates earnings IMMEDIATELY (§3 row1).
- Amount basis = FULL service price, NOT paid/deposit/collected (§3 row2) — THIS IS THE BIG ONE. Read commissionEngine.js carefully: does it trigger on payment or on service-card create? What amount does it use?
- Appointment-only booking creates NO commission (§3 row3, current invariant) — confirm still true.
- Service with no selected CTV => no commission even if customer has an appointment owner (§3 row6).
- Tier source = CTV admin portal tier config (§4 row1). Where is tier config stored/read? commission_level_config?
- Levels 0,1,2 active; 3,4 configurable-but-disabled (§4 row2).
- Disabled/missing levels earn nothing, remainder stays with company, no redistribution (§4 row3, row5).
- Remove legacy product commission_rate_percent dependency (§4 row4, gap#2).
Map the CURRENT trigger point and amount basis precisely (quote code). State exactly what must change to make earnings service-card-created at full price.`,
  },
  {
    key: 'braces-override',
    prompt: `${COMMON}
CLUSTER: Braces override (spec §5; gap #4). Dental-only.
Rules: Braces/Ortho detection by category (Braces|Orthodontics) or name contains brace/braces/niềng răng; separate Braces tier config; full-price basis; Dental-only.
Map: is there ANY braces-specific commission code today? Any category/name matching? Any second tier config? Almost certainly missing — confirm and give a concrete plan (where to detect, where to store the braces tier config, how to branch the engine).`,
  },
  {
    key: 'claim-timer',
    prompt: `${COMMON}
CLUSTER: Claim ownership + 6-month timer + eligibility + per-LOB lock (spec §6, §7; gap #7).
Read api/src/services/referralClaim.js end to end.
Rules: 6-month claim window; timer anchor = latest CTV-bearing appointment OR CTV-bearing service; same-CTV activity resets timer; expiry frees customer; CROSS-LOB lock is PER LOB (dental lock must not block cosmetic); reassignment keeps timer.
Eligibility (§7): eligible when unclaimed/expired/same-CTV; blocked when different CTV in window; block returns claim error, creates nothing; Referral Start fallback.
Map exactly how getReferralClaimStatus computes ownership + expiry today, what the anchor is, and whether locks are per-LOB or cross-LOB. Quote code.`,
  },
  {
    key: 'admin-reassignment',
    prompt: `${COMMON}
CLUSTER: Admin CTV override / reassignment (spec §8; gaps #5,#6).
Rules:
- Appointment-card CTV change: changes ownership + claim owner, does NOT move commission money, keeps timer anchor.
- Service-card CTV change BEFORE payout: reverse old pending commission, create new pending commission for new CTV/uplines immediately.
- Paid-out lock: if commission paid out, cancel/delete/refund/service-CTV-reassign is BLOCKED (INV-003B/INV-003C).
Map: is there any admin endpoint to change CTV on an appointment? on a service card? Does changing it reverse+recreate earnings? Is there a paid-out guard? Quote code (look in appointments routes, saleOrderLines.js, services routes, ctv.js, ctvActions.js).`,
  },
  {
    key: 'deletes-payments',
    prompt: `${COMMON}
CLUSTER: Deletes/refunds/corrections + payment-edit removal (spec §9; gap #11).
Rules: service cancel/delete/refund before payout reverses earnings; paid-out permanently locked (INV-003B, current); staff do NOT edit payments — delete/void + new payment is the correction path; direct PATCH /api/Payments/:id is a legacy gap (not supported workflow); UI payment delete = hard delete/void unless paid-out blocks.
Map: read payments.js (PATCH + DELETE handlers) + serviceReversal.js. Does a payment EDIT button exist in the UI (grep website for payment edit)? Is PATCH /api/Payments/:id still wired in the UI? What is the plan to REMOVE the staff payment-edit button while keeping delete+new?`,
  },
  {
    key: 'payouts',
    prompt: `${COMMON}
CLUSTER: Payouts — separate/combined by LOB (spec §10).
Rules: admin runs payouts separately per LOB OR combined Dental+Cosmetic; combined = one LOB-local payout row in EACH DB linked by same payout_group_id; shared receipt/proof URL on both; CTV portal shows ONE combined row expandable to per-LOB; admin All filter shows one combined row, per-LOB filters show LOB-local row.
Map: read the payouts code (grep payouts, payout_group_id, dbo.payouts). Is payout creation per-LOB only today? Does payout_group_id exist (schema + code)? How does the CTV portal + admin render payouts now? Quote code + schema.`,
  },
  {
    key: 'deposit-history',
    prompt: `${COMMON}
CLUSTER: Deposit wallet history (spec §11; gap #10).
Rules: Customer profile Payment History tab shows deposit top-ups, deposit refunds, deposit-used-for-service, and void/deleted correction rows; admin /payment shows the SAME customer deposit wallet history after selecting one customer; this is customer-profile/admin-payment deposit history, NOT the CTV portal wallet.
Map: how are deposits represented today (payments.method='deposit', deposit_used, payment_category — see INV-004)? Is there a customer Payment History tab? Does admin /payment show per-customer deposit history? grep website customer profile + payment page. Quote code; state what's missing.`,
  },
  {
    key: 'signup-hierarchy',
    prompt: `${COMMON}
CLUSTER: Public signup root path + admin hierarchy management (spec §12; gaps #8,#9).
Rules:
- Public signup creates a ROOT CTV when NO upline phone/referral code entered (currently /join REQUIRES upline — confirm: ctvPublic.js returns U_UPLINE_REQUIRED when no code+phone). Root is active immediately.
- Duplicate blocking only when phone/email already a CTV; existing customer signing up creates a SEPARATE CTV row (don't convert customer).
- Required fields: phone + password; email OPTIONAL (UI must say so). Map JoinCtv.tsx current required fields + the /join validation (it currently requires name, phone, email, password).
- Bilingual EN/VI.
- Admin drag-and-drop hierarchy tree to move uplines/downlines; move allowed only when CTV is fresh (no referred customer/service/earning); moves auto-log audit (no free-text reason needed).
Map: ctvPublic.js /join, JoinCtv.tsx, admin CTV hierarchy UI (grep hierarchy/tree), getCtvHierarchy. State exactly what's missing for root signup + drag-drop + no-activity guard + audit log.`,
  },
]

phase('Map')
log(`CTV gap analysis: ${CLUSTERS.length} cluster mappers over the NK3 CTV referral/commission spec`)

const reports = await parallel(
  CLUSTERS.map((c) => () =>
    agent(c.prompt, { label: `map:${c.key}`, phase: 'Map', schema: GAP_SCHEMA, agentType: 'general-purpose' })
  )
)

const ok = reports.filter(Boolean)
log(`Collected ${ok.length}/${CLUSTERS.length} cluster gap reports`)

// Flatten + rank rules so the orchestrator can plan waves.
const allRules = ok.flatMap((r) => (r.rules || []).map((rule) => ({ cluster: r.cluster, ...rule })))
const cmplxRank = { S: 0, M: 1, L: 2, XL: 3 }
const stateRank = { 'conflicts-with-spec': 0, missing: 1, partial: 2, implemented: 3 }

return {
  clusters: ok.map((r) => ({ cluster: r.cluster, summary: r.summary, ruleCount: (r.rules || []).length, schemaNeeds: r.sharedSchemaNeeds })),
  counts: {
    total: allRules.length,
    byState: allRules.reduce((m, x) => ((m[x.codeState] = (m[x.codeState] || 0) + 1), m), {}),
    testable: allRules.filter((x) => x.testable).length,
  },
  // Quick-win candidates first: needs work (not implemented) + testable + lower complexity + lower risk
  quickWins: allRules
    .filter((x) => x.codeState !== 'implemented' && x.testable && cmplxRank[x.complexity] <= 1 && x.risk !== 'high')
    .map((x) => ({ cluster: x.cluster, ruleId: x.ruleId, title: x.title, codeState: x.codeState, complexity: x.complexity, files: x.files })),
  rules: allRules
    .sort((a, b) => (stateRank[a.codeState] - stateRank[b.codeState]) || (cmplxRank[a.complexity] - cmplxRank[b.complexity]))
    .map((x) => ({
      cluster: x.cluster, ruleId: x.ruleId, title: x.title, codeState: x.codeState,
      complexity: x.complexity, risk: x.risk, testable: x.testable, files: x.files,
      evidence: x.evidence, plan: x.plan, nk3Note: x.nk3Note,
    })),
  schemaNeeds: [...new Set(ok.flatMap((r) => r.sharedSchemaNeeds || []))],
}
