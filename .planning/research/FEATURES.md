# CTV Feature Landscape

**Domain:** Multi-level marketing collaborator onboarding, approval, and per-LOB commission management in clinic context
**Researched:** 2026-05-27

## Table Stakes

Features users expect. Missing = product feels incomplete for a CTV system.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Public CTV signup form | New CTVs must onboard themselves; clinic can't scale if admins create each CTV manually | Medium | Phone + referrer lookup + password; optional ID/DOB fields. Depends on existing `/api/ctv` auth scheme |
| Admin approval queue | Quality control + network integrity; prevents spam/fake accounts | Low | List, approve, reject. UI uses existing admin auth; no new security model needed |
| Per-LOB commission tiers (L0–L4) | Different services (dental vs cosmetic) have different margins; must support both independently | Medium | 5 levels, customizable labels, toggle active/inactive. Single `commission_tiers` table stores both LOBs |
| Multi-level commission split | MLM core; without this, the referral system has no financial incentive | High | Walk upline tree from closer, apply per-level rates. Depends on existing `commissionEngine.js` architecture |
| Dual-format password verify | Existing CTVlegacy users must keep working; breaking legacy logins = data loss + unhappy partners | Low | SHA256 plain + salted bcrypt; try both, accept either. Minimal new code |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gemini Vision OCR for ID cards | Fast, hands-off identity verification at signup; reduces fraud and admin review time | Medium | Optional, env-gated (only if `GEMINI_API_KEY` set); integrates with signup form |
| Signature pad at signup | Digital proof of consent; meets Vietnamese compliance for multi-level sales | Low | Canvas-based; stores as image blob in `ctv_registrations.signature_image` |
| Versioned signup terms (vi/en) | Admin can update legal language without re-training; audit trail for compliance | Medium | `signup_terms` table; language-aware; admins edit in rich-text editor |
| CSKH commission type (cosmetic follow-up only) | Prevents double-dipping: direct close = direct commission; customer's repeat visit with same CTV = CSKH commission, different rate | Medium | New `earnings.commission_type` column; `commissionEngine.js` branches on type. Cosmetic LOB only initially |
| Custom level labels | Clinic can brand tiers (e.g., "Personal", "Team", "Regional" instead of "L0", "L1") | Low | `commission_tiers.label` column; admin editor; reflected across CTV portal |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Marketing scrollytelling landing page | Out of scope for operator surface; CTVlegacy's App.tsx was customer-facing marketing, not clinic admin | Direct CTV signup form only; keep DX hidden |
| Google Sheets sync worker | Introduces external dependency; Tgrouptest DB is system of record; dual-write complexity | Admin UI for all commission config; read-only exports if needed later |
| Redis cache for commission rates | Premature optimization; rates change rarely; adds operational burden (Redis instance, cache invalidation) | In-memory cache in `commissionEngine.js`; flush on admin save |
| Two-config-table footgun | CTVlegacy had both `commission_settings` + `hoa_hong_config` out of sync; chaos | Single canonical `commission_tiers` table (already scaffolded); no legacy dual-write |
| activity_logs audit table | Deferred to later milestone; not critical for v1.2 | Skip for now; use DB timestamp fields for basic audit |
| Flask sessions / legacy auth | Tgrouptest uses Express + JWT; don't mix frameworks | Pure JWT on existing CTV auth routes |

## Feature Dependencies

```
CTV Public Signup (can start immediately)
  ├─ Existing /api/ctv route mount + JWT is_ctv flag (ready)
  ├─ Existing authentication scaffolding (ready)
  └─ new: ctv_registrations table + signup form + approval queue

Admin Approval Flow
  ├─ CTV Public Signup (above)
  ├─ Existing partners table (ready)
  └─ new: approval endpoints + admin UI

Per-LOB Commission Tiers
  ├─ Existing commission_tiers table structure (ready)
  ├─ Existing commissionEngine.js (ready)
  └─ new: per-LOB admin editor UI + label customization

Multi-Level Commission Split
  ├─ CTV Public Signup + Admin Approval (above)
  ├─ Existing commissionEngine.js (ready)
  ├─ Per-LOB Commission Tiers (above)
  └─ new: walk upline + apply per-level rates

Gemini Vision OCR
  ├─ CTV Public Signup form (above)
  ├─ GEMINI_API_KEY env var (gated)
  └─ new: Canvas + Gemini API client

Signature Pad
  ├─ CTV Public Signup form (above)
  └─ new: Canvas capture + store in ctv_registrations.signature_image

Versioned Signup Terms
  ├─ CTV Public Signup form (above; shows terms in modal)
  └─ new: signup_terms table + admin editor UI

CSKH Commission Type
  ├─ Multi-Level Commission Split (above)
  ├─ Existing cosmetic DB schema (ready)
  └─ new: earnings.commission_type column + commissionEngine.js branch

Dual-Format Password Verify
  ├─ Existing CTV auth routes (ready)
  └─ new: password hash comparison logic (no schema change)
```

## MVP Recommendation

Prioritize in this order to unblock CTV referrals:

1. **CTV Public Signup** — New CTVs can apply; enables network growth
2. **Admin Approval Queue** — Clinic controls who becomes CTV; prevents spam
3. **Multi-Level Commission Split** — Referral payments flow up; incentivizes onboarding
4. **Per-LOB Commission Tiers** — Dental vs cosmetic have different margins; required for accurate payout

Defer (don't block v1.2):
- **Gemini Vision OCR** — Nice-to-have for fast KYC; can be patched in later
- **Signature Pad** — Compliance nice-to-have; forms can work without it
- **Versioned Signup Terms** — Legal can live in hardcoded HTML initially; admin editor can come after launch
- **CSKH Commission Type** — Only cosmetic LOB; most volume is dental; can start as direct-only
- **Dual-Format Password Verify** — Only relevant if legacy CTVlegacy users are importing; if starting fresh, skip

## Key Complexity Flags

| Feature | Flag | Mitigation |
|---------|------|-----------|
| Multi-Level Commission Split | Recursive upline walk + per-LOB rates | Pre-test with 5-level deep hierarchy; unit test all rate combos |
| Per-LOB Commission Tiers | Two independent tier sets in one table | Clear schema (lob_type column); strict migration; test both LOBs separately |
| Gemini Vision OCR | API latency + image handling | Env-gate it; mock in tests; set timeout 5s |
| CSKH Commission Type | Branching logic in commissionEngine.js | Add feature flag; test direct-only + CSKH paths separately |

## Sources

- `.planning/PROJECT.md` — milestone scope, locked decisions
- `CTVlegacy/CTV_REGISTRATION_WORKFLOW.md` — signup + approval flow
- `CTVlegacy/COMMISSION_LOGIC.md` — multi-level structure, default rates
- `CTVlegacy/COMMISSION_SETTINGS_AUDIT.md` — two-table footgun (what NOT to do)
- Existing code: `commissionEngine.js`, `/api/ctv` routes, `contexts/LocationContext.tsx`
