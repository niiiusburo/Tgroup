export const meta = {
  name: 'money-commission-audit',
  description: 'Find money/commission bugs in the CTV commission engine, payment + earnings paths; adversarially verify each',
  phases: [
    { title: 'Find', detail: 'parallel finders, one per money/commission surface' },
    { title: 'Verify', detail: 'adversarially refute each finding; confirm real money impact + fix' },
  ],
};

// ── Shared context handed to every finder (grounded in real NK3 evidence) ──────
const CONTEXT = `
Repo: /Users/thuanle/Documents/TamTMV/Tgrouptest  (read with Read/Grep/Glob).
This is the TGroup clinic app. Cosmetic LOB v2 CTV commission engine.

CORE FILES:
- api/src/services/commissionEngine.js  (the earnings engine — READ IT FULLY)
- api/src/routes/payments.js + api/src/routes/payments/  (payment create/delete; calls the engine)
- api/src/routes/commissionConfig.js  (reads/writes commission_settings + commission_level_config)
- api/src/services/referralClaim.js, customerReferrer.js, referralCard.js
- api/src/services/ctvNetwork.js  (hierarchy; a cycle guard was JUST added here)
- api/src/routes/earnings.js, payouts.js, commissions.js

GROUND-TRUTH DATA (NK3 cosmetic smoketest DB, pulled today 2026-06-01):
- commission_settings.default_referral_percent = 20.00  (the value the ADMIN configured in the UI)
- products.commission_rate_percent: 197 products at 0.00, exactly 1 product at 10.00
- commission_level_config: L0=33.33% L1=14.5% L2=7.3% L3=3.6%(DISABLED) L4=1.8%(DISABLED)
- dbo.earnings现状: all source='ctv'; L0 = 2,422,700 (10 rows), L1 = 73,950 (2 rows), L2 = 37,230 (2 rows)

KNOWN/REPORTED SYMPTOMS (user, admin on Cosmetic LOB):
1. "Every service gives 10% commission even when NO CTV was added — and I configured the % in
    configuration (20%), I don't know where the 10% comes from."
2. "Trần Trung Kiên showed up as ~39,000 commission under a new CTV's downline." (hierarchy cycle —
    a referred_by back-edge; the DISPLAY was already fixed, but check the EARNINGS side.)
3. "I can't delete payments in the admin panel."

OPTIONAL live read-only DB check (SELECT ONLY — never mutate):
  ssh -o BatchMode=yes root@76.13.16.68 'set -a; . /opt/tgroup-nk3/.env.nk3; set +a; psql "$COSMETIC_DATABASE_URL" -P pager=off -c "<SELECT>"'
  (DATABASE_URL = dental, COSMETIC_DATABASE_URL = cosmetic). Do NOT run UPDATE/DELETE/INSERT.

RULES FOR YOUR FINDINGS:
- A "bug" must have real money or data-integrity impact (wrong amount, double-pay, pay-without-basis,
  un-reversed money, blocked legitimate action). Cite exact file:line and the offending code.
- Distinguish INTENDED behavior (documented in code comments) from a real bug. If something is
  intended-but-the-user-disagrees, say so and mark it as a policy/config question, not a code bug.
- Give a concrete, minimal proposedFix (what to change, where).
- Do NOT edit any files. Read-only investigation.
`;

const DIMENSIONS = [
  {
    key: 'rate-source',
    prompt: `${CONTEXT}

DIMENSION: Commission RATE SOURCE — where does the percentage come from, and is the admin-configured % honored?
Trace createEarningsForPayment + getProductRate in commissionEngine.js. The direct L0 commission uses
products.commission_rate_percent (getProductRate, line ~85/262). _getDefaultReferralPercent reads
commission_settings.default_referral_percent (=20) — IS IT EVER CALLED anywhere? commission_level_config.L0
=33.33% — is that used for the direct commission or only overrides?
Determine precisely: (a) what rate actually drives each earnings row, (b) whether the admin's configured 20%
(or the L0 33.33%) is silently ignored, (c) where the "10%" the user sees comes from. Is the per-product rate
vs configured-% a genuine bug or intended? Grep the whole repo for default_referral_percent usage.`,
  },
  {
    key: 'no-ctv-attribution',
    prompt: `${CONTEXT}

DIMENSION: Commission attribution WITHOUT a CTV. resolveRecipient (commissionEngine.js:41-73) falls back to
consultation_staff (cosmetic open consultation) then salestaff (dental) when there is no referred_by_ctv_id.
Questions: Does the live payment hook (routes/payments.js / payments/) call createEarningsForPayment for EVERY
posted payment? Is there any gate so a service with no CTV pays zero? Trace how referred_by_ctv_id gets set on a
customer (customerReferrer.js, the refer form, claims) — could a customer carry a stale CTV so "no CTV on the
service form" still pays? Is the consultation/salestaff fallback firing (query earnings by source)? Decide:
is paying consultation/salestaff with no CTV a real over-attribution bug, or intended D13 design the user
disagrees with? Be precise about what triggers an earnings row.`,
  },
  {
    key: 'override-cycle',
    prompt: `${CONTEXT}

DIMENSION: MLM override walk + referral CYCLES. _walkCtvChain (commissionEngine.js:122-147) walks
referred_by_ctv_id up to 5 levels with NO visited/cycle guard (contrast ctvNetwork.js which JUST got a guard).
A 2-cycle (A.referred_by=B, B.referred_by=A) makes the walk emit the same upline at multiple levels →
_writeCtvOverrides creates bogus override earnings (real money in dbo.earnings). A TTK⇄thuyquynh dental cycle
existed today (now nulled). Confirm: (a) the missing cycle guard in _walkCtvChain is a real over-pay vector;
(b) check live earnings for override rows whose recipient also appears in the earner's upline (cycle-induced) —
query dbo.earnings for source='ctv' level>=1 and inspect the chain; (c) does walking across the SAME row in
both LOB DBs (dental referred_by != cosmetic referred_by) cause wrong chains? Propose the seen-guard fix and
whether any existing override rows must be reversed.`,
  },
  {
    key: 'payment-deletion',
    prompt: `${CONTEXT}

DIMENSION: "Can't delete payments." Find the payment delete/void route (grep routes/payments.js and
routes/payments/ for delete/void/DELETE). Determine WHY deletion fails: FK constraints from dbo.earnings.payment_id
or payment_allocations.payment_id referencing payments (no ON DELETE CASCADE)? a 500? a permission gate? a
soft-delete that the UI doesn't refresh? ALSO assess money integrity: if a payment IS deleted, are its earnings
reversed/removed, or do they orphan (commission paid on a vanished payment)? Is delete even implemented, or only
refund? Reproduce the failure mode from the code path. Query the live schema for FK constraints on earnings /
payment_allocations if helpful (\\d dbo.earnings).`,
  },
  {
    key: 'idempotency-doublepay',
    prompt: `${CONTEXT}

DIMENSION: DOUBLE-PAY / idempotency. The L0 direct earnings INSERT in createEarningsForPayment (line ~270) has
NO "WHERE NOT EXISTS" guard, unlike _writeCtvOverrides which does. Can the same payment produce duplicate L0
earnings? Trace every caller of createEarningsForPayment: the live POST /api/Payments hook, backfillEarningsForClient
(CTV-assign backfill), triggerCommissionEngine, backfillOverridesForLob. backfillEarningsForClient guards on
"source='ctv' exists" — but does the LIVE hook re-run on payment edit/re-post? Can assigning+unassigning a CTV, or
re-posting a payment, create duplicate earnings? Check reverseOnRefund idempotency (double refund → double negative).
Confirm with a query: any (payment_id, recipient, level) with >1 earnings row of the same sign?`,
  },
  {
    key: 'refund-reversal',
    prompt: `${CONTEXT}

DIMENSION: REFUND / reversal correctness. reverseOnRefund (commissionEngine.js:444-481) selects original earnings
WHERE amount>0 and writes negatives. Does it reverse the OVERRIDE rows (level>=1) too, or only L0? Does it set
level on the reversal (the insert omits level → NULL) so net-by-level is wrong? Is it wired to refund payments in
routes/payments.js, and is it idempotent (a second refund of the same original → double reversal)? When a payment
is deleted vs refunded, are earnings handled? Does a partial refund over-reverse (reverses full original even for a
partial refund)? Verify the net-to-zero claim with the actual code + a query on negative earnings rows.`,
  },
  {
    key: 'allocation-line-math',
    prompt: `${CONTEXT}

DIMENSION: Line/allocation MATH for the commission base. In createEarningsForPayment, when lines=[] it falls back
to a single line {amount: paymentAmount, product_id: null} (line ~252) → getProductRate(null)=0 → 0 commission;
but when lines exist, lineAmount fallback is paymentAmount/lineList.length (line 261) if a line has no amount —
could mis-split. Does the live payment hook pass real saleorderline amounts+product_ids, or the whole payment?
A deposit/tạm ứng (advance) vs a service payment — does the engine pay commission on DEPOSITS (advances) that
aren't yet services? Check routes/payments.js: which payment types invoke the engine. Over-paying commission on
deposits/advances, or on the full payment instead of per-service-line, is a real money bug. Also check rounding
(Math.round(x*100)/100) drift across many lines.`,
  },
];

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          file: { type: 'string' },
          lines: { type: 'string' },
          rootCause: { type: 'string' },
          evidence: { type: 'string' },
          moneyImpact: { type: 'string' },
          proposedFix: { type: 'string' },
          intendedOrBug: { type: 'string', enum: ['bug', 'intended-but-disputed', 'needs-policy-decision'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'severity', 'file', 'rootCause', 'moneyImpact', 'proposedFix', 'intendedOrBug'],
      },
    },
  },
  required: ['findings'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    isRealBug: { type: 'boolean' },
    severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    verdict: { type: 'string' },
    fixAssessment: { type: 'string' },
    refinedFix: { type: 'string' },
  },
  required: ['isRealBug', 'severity', 'verdict', 'fixAssessment'],
};

const verifyPrompt = (f, dim) => `${CONTEXT}

ADVERSARIAL VERIFICATION. A finder (dimension "${dim}") reported this money/commission finding:

  title: ${f.title}
  severity: ${f.severity}
  file: ${f.file}  lines: ${f.lines || '?'}
  rootCause: ${f.rootCause}
  evidence: ${f.evidence || ''}
  moneyImpact: ${f.moneyImpact}
  proposedFix: ${f.proposedFix}
  finder-classification: ${f.intendedOrBug}

Your job is to REFUTE it. Read the actual code at that file:line yourself. Decide:
- isRealBug: true ONLY if there is genuine wrong-money / data-integrity / blocked-legitimate-action impact that
  is NOT already guarded elsewhere in the call path. Default to false if the finder over-claimed, if a guard
  exists, or if it's intended behavior the user merely dislikes (call that out in verdict).
- severity: your independent rating.
- verdict: 2-4 sentences citing the real code you read (quote the line).
- fixAssessment: is the proposedFix correct, minimal, and safe? Any regression risk?
- refinedFix: the fix you'd actually ship (or "none — not a bug").
Be skeptical and concrete. Do not edit files.`;

phase('Find');
log(`Auditing ${DIMENSIONS.length} money/commission surfaces…`);

const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS_SCHEMA }).then((r) => ({ dim: d.key, findings: (r && r.findings) || [] })),
  (r) =>
    parallel(
      (r.findings || []).map((f) => () =>
        agent(verifyPrompt(f, r.dim), { label: `verify:${r.dim}:${(f.title || '').slice(0, 24)}`, phase: 'Verify', schema: VERDICT_SCHEMA })
          .then((v) => ({ dim: r.dim, finding: f, verdict: v }))
          .catch(() => null)
      )
    )
);

const all = results.flat().filter(Boolean);
const confirmed = all.filter((x) => x.verdict && x.verdict.isRealBug);
const rejected = all.filter((x) => x.verdict && !x.verdict.isRealBug);

const sevRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
confirmed.sort((a, b) => (sevRank[a.verdict.severity] ?? 9) - (sevRank[b.verdict.severity] ?? 9));

log(`Confirmed ${confirmed.length} real money/commission bugs; ${rejected.length} rejected/intended.`);

return {
  confirmedCount: confirmed.length,
  rejectedCount: rejected.length,
  confirmed: confirmed.map((x) => ({
    dimension: x.dim,
    title: x.finding.title,
    severity: x.verdict.severity,
    file: x.finding.file,
    lines: x.finding.lines,
    rootCause: x.finding.rootCause,
    moneyImpact: x.finding.moneyImpact,
    verdict: x.verdict.verdict,
    fix: x.verdict.refinedFix || x.finding.proposedFix,
  })),
  rejected: rejected.map((x) => ({ dimension: x.dim, title: x.finding.title, why: x.verdict.verdict })),
};
