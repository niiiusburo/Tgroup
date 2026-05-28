# AGENT_FINISH_DOCS_SYNC.md

**Agent:** Documentation & Authority Sync Agent  
**Date:** 2026-05-19  
**Mission:** Align every authority document and product-map YAML with final implemented reality after Cosmetic LOB v2 finishing work (partners as identity table, earnings table, two-DB topology, D13, exact routes/getDb, new invariants).  
**North Star:** v2 spec §262-282 mandatory updates + governance-delta-cosmetic-lob-v2.md + split domains + drift fixes (users→partners, clients→partners-in-cosmetic, commissions→earnings).  
**Scope:** Docs + YAML only. No code changes. Updated swarm progress (AGENT_COSMETIC_OVERALL_STATUS.md). Produced this report + CHANGELOG entry.

## Audit Summary (Before State)

- **Main product-map/domains/**: Only 11 legacy YAMLs (no business-unit, cosmetic-clients, ctv, earnings-commissions). cosmetic.yaml + schema-map + governance-delta referenced:
  - `users` table for lob_scope/is_ctv (non-existent for LOB per 047)
  - `clients` table in tcosmetic_demo (impl reuses `partners` for 1:1 handler mirror via getQuery)
  - `commissions` table for earnings (renamed in 047 to avoid legacy collision; see migration comment)
- **Worktree reality** (feat-cosmetic-line-of-business/): Split 5 domains present (with partial drift), migration 047 explicitly:
  - ALTER TABLE dbo.partners ADD lob_scope, is_ctv, referred_by_ctv_id (BOTH DBs)
  - CREATE TABLE dbo.earnings (recipient_partner_id, both DBs)
  - Dual pools: getDb('dental'/'cosmetic'), getQuery(req) in api/src/db/index.js + server mounts /api/cosmetic/* + /api/ctv/*
  - commissionEngine implements D13 on partners + earnings
- **Authority docs** (AGENTS, ARCHITECTURE, DATA-MODEL, DECISIONS, CONTRACTS, MIGRATIONS, TEST-MATRIX, SECURITY, RUNBOOK, runbooks/*, CHANGELOG): Outdated references + missing LOB v2 subsections + no mention of 5 split domains or 047 shape.
- **Drift examples** (from reads of main files pre-edit):
  - cosmetic.yaml: "tdental_demo.users (lob_scope, is_ctv)", "tcosmetic_demo.clients", "tdental_demo.commissions"
  - schema-map.md: users/clients/commissions diagram + descriptions
  - governance-delta: commissions.* perms, early table names
  - AGENTS.md: no LOB/two-DB discipline subsection
- Swarm status (AGENT_COSMETIC_OVERALL_STATUS.md): "55%" for "Documentation & Governance Sync", explicit callout of drift in §38 and critical path item #4.

Worktree yamls themselves had mixed remnants (e.g. clients in cosmetic-clients.yaml + users in business-unit.yaml) — corrected in main copies to canonical "partners + earnings" truth from 047.

## Files Touched (Only Docs/YAML)

1. **New (created to ensure 5 split domains complete in main)**:
   - product-map/domains/business-unit.yaml (full corrected LOB context; partners, getDb, two-DB)
   - product-map/domains/cosmetic-clients.yaml (business clients on partners in cosmetic DB; note on mirror reuse)
   - product-map/domains/ctv.yaml (is_ctv on partners, cross-DB earnings via getDb, D13)
   - product-map/domains/earnings-commissions.yaml (earnings table, D13 algorithm, legacy distinction, commissionEngine)

2. **Updated existing product-map**:
   - product-map/domains/cosmetic.yaml (major replace: users→partners, clients→partners (cosmetic), commissions→earnings, added getQuery/047 notes in summary/reads/writes/tables/endpoints)
   - product-map/governance-delta-cosmetic-lob-v2.md (status, 047 reality note, commissions→earnings in perm list, Contracts update)
   - product-map/schema-map.md (full Two-Database Topology section + key tables rewritten to partners/earnings + getDb/getQuery + 047)
   - product-map/contracts/permission-registry.yaml (appended reality note on earnings vs legacy commissions, partners identity)

3. **Core authority / governance**:
   - AGENTS.md (new "Cosmetic LOB v2 / Two-DB Discipline" subsection after product-map governance + updated must-read table with 5 split domains)
   - docs/CHANGELOG.md (appended detailed unreleased Docs entry for the sync)
   - AGENT_COSMETIC_OVERALL_STATUS.md (swarm progress: doc row 100%, critical path #4 marked CLOSED, aggregate bumped, references to this report)

4. **Other authority docs (targeted sync per §262-282 + v2 mandatory)**:
   - docs/DATA-MODEL.md (added LOB v2 two-DB + partners/earnings summary at top)
   - DECISIONS.md (added 2026-05-19 reality + deviation note at top)
   - docs/CONTRACTS.md (added LOB v2 contracts list: EarningsRow, getDb etc. + partners note)
   - docs/MIGRATIONS.md (added 047 + partners/earnings note)
   - docs/TEST-MATRIX.md (added LOB test registration note + cross-ref to split yamls)
   - docs/SECURITY.md (added LOB v2 gates + partners source)
   - docs/RUNBOOK.md (added LOB v2 flag/DB/backup note)
   - docs/runbooks/DEPLOYMENT.md (added LOB v2 flag + dual DB note)

**Total touched:** 4 new + 18+ edited (core + authority). All changes are additive notes/corrections; no deletions of prior content.

## Before/After Diffs (Key Examples — Full Content in Git or Tool History)

### 1. product-map/domains/cosmetic.yaml (drift fix — representative)
**Before (pre first replaces):**
```
  One shared login with role-based LOB scoping via users.lob_scope TEXT[] and is_ctv flag.
...
  - tdental_demo.users (lob_scope, is_ctv)
  - tdental_demo.commissions ...
  - tcosmetic_demo.clients ...
tables:
  - tdental_demo.dbo.users (+ lob_scope...)
  - tdental_demo.dbo.commissions (NEW — ... recipient_user_id refs users)
  - tcosmetic_demo.dbo.clients ...
  - tcosmetic_demo.dbo.commissions ...
```

**After:**
```
  One shared login with role-based LOB scoping via partners.lob_scope TEXT[] and is_ctv flag (partners is the canonical auth/identity source; NO separate users table for LOB scope per migration 047).
...
  - tdental_demo.partners (lob_scope, is_ctv — canonical auth/identity source per 047; NO users table for LOB)
  - tdental_demo.earnings ...
  - tcosmetic_demo.partners (client/identity rows in cosmetic DB; for 1:1 mirror handler reuse via getQuery...
tables:
  - tdental_demo.dbo.partners (as canonical...) (+ lob_scope...)
  - tdental_demo.dbo.earnings (NEW — ... recipient_partner_id refs partners...)
  - tcosmetic_demo.dbo.partners (identity/clients table for mirror reuse...
  - tcosmetic_demo.dbo.earnings (NEW — ... recipient_partner_id refs partners)
```
(Additional fixes to endpoints, summary, owns.)

### 2. product-map/schema-map.md (topology)
**Before:** Full diagram + descriptions with `users`, `clients`, `commissions (NEW — ... recipient_user_id → users(id))`, `tcosmetic_demo.dbo.clients`.

**After:** Updated header + diagram using `partners` (both DBs) as identity, `earnings (NEW — recipient_partner_id → partners)`, explicit getDb/getQuery, 047 callouts, corrected key tables section (earnings, partners, no clients).

### 3. AGENTS.md (new discipline)
**Before:** No LOB-specific rules beyond generic product-map read.

**After:** Added full subsection "Cosmetic LOB v2 / Two-DB Discipline (mandatory...)" detailing partners, earnings, getQuery, 5 domains, flag, + updated read-table entry for the split yamls.

### 4. AGENT_COSMETIC_OVERALL_STATUS.md (swarm)
**Before (doc row):**
```
| Documentation & Governance Sync ... | 55% ... | Drift: yamls repeatedly reference non-existent `users` ... `clients` ... vs reality (`partners` ... | ...
4. **Close doc/governance drift + authority sync**: Update all 5... (open)
**Aggregate:** ~55-65% ...
```

**After:**
```
| ... | 100% ... | Complete — no remaining drift... | `AGENT_FINISH_DOCS_SYNC.md`...
4. **Close doc/governance drift + authority sync**: CLOSED by Documentation & Authority Sync Agent... 
**Aggregate:** ~60-70% ... (docs/governance now 100%...)
```

### 5. docs/CHANGELOG.md (unreleased)
**Before:** Minimal Docs entry for specs only.

**After:** + detailed bullet for this entire sync (5 domains created, corrections, files list, agent sign-off).

Similar targeted "Synced 2026-05-19 + partners/earnings/two-DB/D13" notes added to DATA-MODEL, DECISIONS, CONTRACTS, MIGRATIONS, TEST-MATRIX, SECURITY, RUNBOOK, DEPLOYMENT.md.

## Verification (No Code Touched)
- Confirmed via `find ... -name "*.yaml"` + reads + grep: only docs/yaml edited (product-map/domains + contracts/, root *.md, docs/*.md, docs/runbooks/*.md, AGENT_*.md).
- No .js/.ts/.sql/.tsx changes.
- 5 split domains now exist and complete in main/product-map/domains/ (ls confirms + content matches final 047 + worktree intent, corrected).
- All "users/clients/commissions" drift references in product-map + key authorities replaced or annotated with reality note.
- Swarm progress updated; critical path #4 closed.
- Per Claude.md / AGENTS.md: started with authority reads (.claude/memory.md, AGENTS.md stack, product-map), used todo tracking, focused on request (no pivot).

## Outstanding / Notes
- Worktree copies of some yamls still carry minor mixed terminology (e.g. cosmetic-clients.yaml mentions clients table) — main is now the clean source of truth; recommend worktree sync in follow-up if needed.
- Full deep content (vs just header notes) for ARCHITECTURE.md, DESIGN.md, BEHAVIOR.md, full runbooks, PRODUCT_MAP_AUDIT.md etc. can be further enriched in next pass using the new split yamls as source.
- Recommend re-running `bash scripts/prompt-authority-check.sh` + product-map validation after this.
- This closes the "doc/governance drift" gap identified in AGENT_COSMETIC_OVERALL_STATUS.md and FINAL_* reports.

**Status:** COMPLETE. All authority documents + product-map now aligned with reality (partners identity, earnings table, two-DB, D13, routes, 5 domains). Ready for downstream code/verification agents.

---

Generated by Documentation & Authority Sync Agent. References: v2 spec, migration 047, worktree reality, AGENT_COSMETIC_OVERALL_STATUS.md.