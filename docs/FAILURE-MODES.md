# TGroup Clinic — Failure Modes

> Known broken patterns + their fix. Append-only war stories with root cause and resolution.

## Format

Each entry:
- **FM-YYYYMMDD-NN** — Failure Mode ID
- **Symptom** — What users see
- **Root Cause** — Why it happens
- **Fix** — How to resolve
- **Prevention** — How to avoid recurrence
- **Invariant / ADR** — Related policy

---

## FM-20260704-01: Stale Worktree Deploy Erases Live Features

- **Symptom:** A feature that was already pushed and verified disappears from NK/NK2 after a later hotfix deploy from another worktree.
- **Root Cause:** The deploy source did not contain the live target's current `version.json.gitCommit`, so the rebuild replaced production with a sibling branch missing already-deployed commits.
- **Fix:** Deploy only from a candidate that contains the live commit, and re-port intended changes onto that live baseline when old work exists on a stale branch.
- **Prevention:** `scripts/deploy-build-args.sh` runs `scripts/deploy-preflight.js`, which fetches each target's `/version.json`, requires `DEPLOY_FEATURES`, and blocks candidates that do not contain the live commit. `scripts/deploy-worktree-audit.js` lists stale/dirty sibling worktrees before release planning.
- **Related:** INV-018, INV-020, INV-022, AGENTS.md §12.1.

---

## FM-20260519-01: Feedback Attachment Row Points at Missing Uploaded File

- **Symptom:** A resolved `/feedback` thread shows an uploaded image attachment card, but the proof image does not load and the `/uploads/feedback/<file>` URL returns 404.
- **Root Cause:** Feedback reply routes inserted messages and `feedback_attachments` rows through a pooled client, then called `COMMIT`/`ROLLBACK` without first starting `BEGIN`. If later attachment enrichment or file-only content handling failed, cleanup could delete the uploaded file while already-autocommitted DB rows remained. The delete route also removed physical files before DB commit, so a rollback could leave attachment rows pointing at missing files.
- **Fix:** Wrap feedback create/reply attachment writes in explicit transactions, normalize optional/file-only content before validation, clean uploaded files on missing-thread replies, and delete physical attachment files only after feedback-thread DB deletion commits. For existing production orphans, restore files from a same-original/same-size attachment where possible; back up and prune only unrecoverable attachment rows so the UI does not keep rendering dead image URLs.
- **Prevention:** Any route that writes both DB attachment rows and physical files must make DB writes transactional and defer destructive file cleanup until the DB outcome is known. Add route tests that force post-upload DB failures and assert no committed row points at a missing file.
- **Related:** `api/tests/feedbackAttachments.test.js`, `product-map/domains/feedback-cms.yaml`.

## FM-20260506-01: Permission System Shows "No Permissions" for Active Employee

- **Symptom:** Employee logs in successfully but sees empty menus and "No permissions" toast. UI is unusable.
- **Root Cause:** `partners.tier_id` was NULL for migrated employees. `resolveEffectivePermissions()` returned empty array because there was no group to resolve.
- **Fix:** Admin opens PermissionBoard, assigns employee to a permission group (updates `tier_id`). Employee re-logs in.
- **Prevention:** Migration scripts must set a default `tier_id` for all employees. Permission resolution should handle NULL `tier_id` by falling back to a default group or employee-level overrides.
- **Related:** INC-20260506-01, ADR-0006.

## FM-20260506-02: Hosoonline Images Blocked by Mixed Content Policy

- **Symptom:** Health checkup images show broken image icon on production. Browser console shows `Mixed Content` error.
- **Root Cause:** Hosoonline API returned `http://` image URLs. Production page is `https://`. Browser blocks passive mixed content.
- **Fix:** Frontend `AuthenticatedCheckupImage` component now replaces `http://` with `https://` before rendering. Backend proxy normalizes URLs in the payload.
- **Prevention:** Always proxy external images through TGClinic backend (INV-013). Never render direct third-party image URLs on HTTPS pages without scheme normalization.
- **Related:** INC-20260506-02.

## FM-20260505-01: iPhone Modal Height Overflow

- **Symptom:** On iPhone, Add Customer modal and other dense modals overflow the viewport; bottom fields are unreachable.
- **Root Cause:** Modal content height exceeded `100dvh` on small screens; no `max-height` or internal scroll was set.
- **Fix:** Added `max-h-[85dvh] overflow-y-auto` to modal content containers. Tested on iPhone 12/13/14 viewports.
- **Prevention:** All modals with variable content must use `max-h` + internal scroll. Test on 390×844 viewport before merge.
- **Related:** BEHAVIOR.md §5 (dense lists), DESIGN.md.

## FM-20260502-01: Sticky Toolbar Search Uneven Spacing

- **Symptom:** Overview search toolbar had uneven whitespace between label and input on desktop.
- **Root Cause:** Fixed label width created a reserved column even when content was short.
- **Fix:** Switched to content-sized `shrink-0` labels with `gap-3` mobile / `lg:gap-4` desktop.
- **Prevention:** Sticky toolbars should feel like compact toolbars, not form rows with reserved label columns.
- **Related:** DEC-20260502-05.

## FM-20260420-01: Login Rate Limiter Blocks All Clinic Staff

- **Symptom:** After a few failed logins, the entire clinic network is locked out.
- **Root Cause:** Rate limiter was scoped by IP only, not by email+IP. One employee's wrong password blocked everyone behind the same NAT.
- **Fix:** Changed rate limiter to scope by normalized email + IP, with a higher IP-wide cap for brute-force protection.
- **Prevention:** Rate limiting must differentiate between per-account attacks and per-network traffic.
- **Related:** `api/tests/loginRateLimiter.test.js`.

## FM-20260415-01: Export Downloads Timeout at 60s

- **Symptom:** Large revenue/payment exports fail mid-download with nginx 504 Gateway Timeout.
- **Root Cause:** Nginx default `proxy_read_timeout` is 60s. Large date ranges generate Excel files for >60s.
- **Fix:** Raised nginx `proxy_read_timeout`, `proxy_send_timeout`, `send_timeout` to `300s` for the `/api` proxy block.
- **Prevention:** Any new export type must document expected runtime and verify nginx timeout alignment.
- **Related:** INV-019.

## FM-20260410-01: Schema NOT NULL Constraint Breaks Customer Create

- **Symptom:** Creating a new customer returns 500 with `null value in column "xxx" violates not-null constraint`.
- **Root Cause:** Migration added a NOT NULL column to `dbo.partners` without updating all INSERT paths (legacy Odoo fields, TDental import scripts, and frontend forms).
- **Fix:** Rolled back NOT NULL constraint; added default value; updated all INSERT statements to include the column.
- **Prevention:** Before adding NOT NULL without default, grep for every `INSERT INTO partners` in the codebase and scripts. Update `product-map/schema-map.md` blast radius.
- **Related:** INV-001, schema-map.md.

## FM-20260405-01: Face Registration Overwrites Without Audit

- **Symptom:** Customer's face suddenly stops matching after re-registration. No history of previous embedding.
- **Root Cause:** Face register API overwrites `face_subject_id` and embedding without keeping old versions.
- **Fix:** Added `deleted_at` soft-delete to `customer_face_embeddings` (where table exists) so old embeddings are preserved.
- **Prevention:** Face re-registration should preserve historical embeddings for audit and rollback.
- **Related:** INV-005.

## FM-20260325-01: Payment Allocation Double-Count on Concurrent Deposits

- **Symptom:** Two cashiers process deposits for the same customer simultaneously. Both allocations succeed, but residual goes negative.
- **Root Cause:** No row-level lock or serializable transaction around residual read → allocation insert → residual update.
- **Fix:** Added `validateAllocationResidual()` pre-check; `GREATEST(0, residual - amount)` prevents negative DB value, but race condition still possible.
- **Prevention:** Use `SELECT FOR UPDATE` on `saleorders` during allocation transactions. Long-term: move allocation to a queue.
- **Related:** INV-003, INV-012.

## FM-20260310-01: Mock Data Masks API Failure in Production

- **Symptom:** Features work locally but fail in production. Local dev shows mock data instead of real API responses.
- **Root Cause:** Some components still import from `website/src/data/` mock files when API is slow or returns 500.
- **Fix:** Removed mock fallbacks from production code paths; mocks restricted to test fixtures only.
- **Prevention:** Never ship `website/src/data/` imports in production components. Use feature flags or loading states instead.
- **Related:** `product-map/unknowns.md` #11.

## FM-20260228-01: i18n Key Missing in Vietnamese

- **Symptom:** UI shows English labels on Vietnamese pages after a feature update.
- **Root Cause:** Developer added English i18n key but forgot Vietnamese equivalent.
- **Fix:** Added missing Vietnamese keys; added `i18n-coverage.test.ts` to CI gate.
- **Prevention:** Every UI text change requires both `en` and `vi` keys. `website/src/i18n/__tests__/i18n-coverage.test.ts` catches missing keys.
- **Related:** INV-016.

---

## How to Add a New Failure Mode

1. Assign next `FM-YYYYMMDD-NN` ID.
2. Fill all five fields (Symptom, Root Cause, Fix, Prevention, Related).
3. Append to this file. Never delete or rewrite existing entries.
4. If the failure mode reveals a new invariant, add it to `INVARIANTS.md` (append-only).

---

## FM-20260723-01: Historical Customer Sources Collapse Into Sale Online

- **Symptom:** Re-exporting a closed reporting period changes the `Nguồn khách` value for untouched visits. Strict Q10 June row-key comparison ultimately found 44 service/order rows across 31 customers changing among `Giới thiệu`, `Khách cũ`, `Khách hàng giới thiệu`, `Hotline`, and `Sale Online`; the first phone/source-set comparison surfaced 43 rows across 30 customers and masked `SO-2026-5176` because that customer still had a mixed source set in both workbooks.
- **Root Cause:** The directly proven failure is corrupted persisted order-level source attribution, not an Excel formula or report-rendering calculation: before repair, production `saleorders.sourceid` disagreed with the earlier closed-period export, and every confirmed target appeared in the July 7 merge audit. Historical migrations 031/033/034/035/036 contain the matching causal mechanism—SQL designed to rename, rewrite, delete, and partially recreate source data, including broad `partners.sourceid` and `saleorders.sourceid` rewrites in 033/034. This strongly implicates the executed source-merge workflow, while the retained evidence does not isolate one historical migration execution as the sole cause of every affected row.
- **Fix:** Quarantine all five artifacts with non-executable `.sql.retired` extensions. Repair affected production records only from a verified earlier export or backup using an explicit order-level manifest and transaction; recreating lookup names alone cannot restore lost assignments. The explicitly confirmed first batch repaired exactly 43 orders; `SO-2026-5176` remains unchanged until separately confirmed.
- **Prevention:** `customerSourceMigrationArchiveGuard.test.js` proves the retired files cannot be selected by top-level or recursive `*.sql` migration scans. Workbook comparisons must use an immutable row key such as order code plus customer reference, not only phone-level source sets. Production source repairs require a fresh backup, exact old-to-new manifest, rollback, and explicit confirmation. Inactive historical lookup selection/deletion is guarded by INV-024.
- **Related:** INV-023, INV-024, UC-009, UC-013, WF-005, `product-map/domains/customers-partners.yaml`, `product-map/domains/reports-analytics.yaml`.

## FM-20260723-02: Partial Customer Edit Clears Omitted UUID Fields

- **Symptom:** Saving an unrelated customer edit can silently clear UUID-backed assignments, including `partners.sourceid`, even though the client omitted those fields. Reports that fall back to the customer source may then show a changed or blank attribution.
- **Root Cause:** The shared UUID sanitizer converted both empty strings and `undefined` values to `null` before `updatePartner()` built its partial SQL. That added omitted UUID keys to the request body, so the dynamic update treated them as explicit clears.
- **Fix:** Preserve `undefined` writable UUID fields on partner updates, keep explicit empty-string-to-`null` clearing for those writable fields, and make `partners.sourceid` read-only on normal Partner POST/PUT. The frontend no longer includes source in customer create/update payloads.
- **Prevention:** `api/src/routes/partners/__tests__/mutationHandlers.test.js` proves source create/change/clear rejection, repeated-source compatibility, omitted-field preservation, and explicit clearing of a writable non-source UUID. `useCustomers.cskh.test.ts` proves frontend Partner payloads omit source.
- **Related:** INV-023, INV-025, `PUT /api/Partners/:id`.
