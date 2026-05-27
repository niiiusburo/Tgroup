# Domain Pitfalls: Tgrouptest v1.2 CTVlegacy Port

**Domain:** CTV signup → approval → per-LOB commission tiers → CSKH commission engine + Gemini OCR  
**Researched:** 2026-05-27  
**Status:** CRITICAL PITFALLS IDENTIFIED

## Critical Pitfalls

### Pitfall 1: Two-DB Partner Approval Atomicity
**What goes wrong:** Admin approves a CTV registration targeting both dental and cosmetic LOBs. The creation of the `partners` row succeeds in tdental_demo but fails in tcosmetic_demo (or vice versa). System claims approval succeeded, but CSKH earnings calculations fail later because the cosmetic partner row doesn't exist.

**Why it happens:**
- Current `/api/ctv/approve` creates a single `partners` row in the chosen LOB's DB.
- v1.2 must create rows in BOTH LOBs atomically, or leave one side incomplete.
- If the second insert fails, the first is already committed — no rollback across DB boundaries.

**Consequences:**
- CTV cannot earn commissions in the incomplete LOB.
- Admin sees "approved" but operator reports CTV missing from cosmetic portal.
- Manual DB repair required to fix partial approval.

**Prevention:**
- Wrap both DB inserts in a transaction-like loop: insert dental, insert cosmetic, both fail or both succeed.
- If cosmetic insert fails, ROLLBACK both rows and return error to admin (don't mark approved).
- Add explicit `INSERT_PARTNER_BOTH_DBS` stored procedure that atomizes the writes.

**Detection:**
- Monitor: After approval, query BOTH `tdental_demo.partners` AND `tcosmetic_demo.partners` for the same ma_ctv.
- If counts diverge, flag in admin queue with "Approval incomplete — missing in [LOB]".
- E2E test: Approve a dual-LOB CTV, verify row exists in both DBs before showing success.

---

### Pitfall 2: Commission Tiers Drift Between LOBs
**What goes wrong:** Admin updates commission tier L0 rate from 25% to 24% in the admin UI. The change saves to tdental_demo successfully, but the update to tcosmetic_demo's `commission_tiers` table is skipped due to a logic error or network timeout. CTV earning commission on dental visits gets 24%, but on cosmetic gets 25% — invisible to the operator until earnings audit.

**Why it happens:**
- Legacy system already had a two-table sync footgun (`commission_settings` vs `hoa_hong_config`).
- v1.2 adds a THIRD canonical table (`commission_tiers`) that must stay in sync across TWO DBs.
- Naive "update both, ignore failures" logic leaves partial state.
- No explicit sync verification or rollback.

**Consequences:**
- Commissions calculated with inconsistent rates across LOBs.
- Operators unaware of the inconsistency until a CTV disputes earnings.
- Trust erosion: "Why did my dental rate change but cosmetic didn't?"

**Prevention:**
- Do NOT use naive "update both, ignore one failure" pattern.
- Instead: All commission tier edits go through a single endpoint that enforces two-DB consistency.
- Pseudo-code: `transaction { UPDATE tdental.commission_tiers; UPDATE tcosmetic.commission_tiers; } OR FAIL`.
- If either DB rejects the update, ROLLBACK both and return error to admin.
- Add a verification endpoint `/api/admin/commission-tiers/sync-check` that audits both tables hourly and alerts if rates diverge.

**Detection:**
- Query-compare tool: `SELECT rate FROM commission_tiers WHERE level=0` on both DBs, alert if mismatch.
- E2E test: Edit a rate, verify it appears in BOTH DBs with the same value before returning success.
- Dashboard: Show a "Sync Status" badge in the admin tier editor — red if either DB is stale.

---

### Pitfall 3: Gemini OCR Cost Runaway on Public Endpoint
**What goes wrong:** Public `/api/ctv/signup` endpoint accepts signature images and optionally calls Gemini Vision API to extract ID card info. A bot or attacker discovers the endpoint and sends 1000 requests per hour, each with a high-resolution image. Gemini API charges accumulate rapidly ($0.004 per image), totaling $40/day for junk requests.

**Why it happens:**
- Signup is public (no auth required) to allow new CTVs to self-register.
- Gemini OCR is optional but enabled by default when `GEMINI_API_KEY` is set.
- No rate limiting, no image size validation, no bot detection on signup.
- API keys are checked on server but not rate-limited per IP or session.

**Consequences:**
- Unexpected cloud costs spike without warning.
- Legitimate signups compete with abuse traffic for quota.
- Gemini API quota exhaustion blocks real CTV ID verification.

**Prevention:**
- Implement strict rate limiting on `/api/ctv/signup`:
  - Max 10 signups per IP per day.
  - Max 5 Gemini OCR calls per IP per day (separate from signup count).
  - Return 429 Too Many Requests with retry-after header when exceeded.
- Validate image size: reject base64 > 2MB or raw > 5MB before sending to Gemini.
- Add a feature flag `GEMINI_ENABLED=false` (default off); ops must explicitly enable in production after setting usage alerts.
- Set hard quota on Gemini API in GCP console (e.g., max 100 images/day) to auto-fail gracefully.

**Detection:**
- Alert on Gemini API call rate > 50/hour.
- Monitor: `/api/ctv/signup` request count per IP; flag IPs with >20 requests/hour.
- Check signature image sizes in DB; flag any > 2MB.

---

### Pitfall 4: Recursive Ancestor Walk N+1 Across Two DBs
**What goes wrong:** CSKH commission type in cosmetic requires walking up the referrer tree (grandparent, great-grandparent, etc.) to calculate "cosmetic follow-up visit" bonuses. The `commissionEngine.cskh()` branch does a recursive query to both tdental_demo and tcosmetic_demo:
```
FOR each level 0..4:
  SELECT ancestor FROM partners WHERE ma_ctv = ? AND db = ?
  (tdental first, then tcosmetic if not found)
```
For a deep tree (5+ levels), this becomes 10+ round-trips per earning record. Processing 1000 earning rows = 10,000 DB queries. System bogs down.

**Why it happens:**
- Recursive logic written naively without JOIN or CTE batching.
- Two-DB design means simple JOINs don't work; must alternate between DBs.
- No memoization or cache layer.

**Consequences:**
- earnings calculation jobs timeout after 30s, leaving records unprocessed.
- CTV commission payouts delayed by hours or days.
- Operator manually re-runs job, not knowing why it failed.

**Prevention:**
- Use PostgreSQL WITH RECURSIVE CTEs to fetch entire ancestor chain in a single query (one per DB).
- Pseudocode:
  ```sql
  WITH RECURSIVE ancestors AS (
    SELECT ma_ctv, parent_ctv, 0 as level FROM partners WHERE ma_ctv = ?
    UNION ALL
    SELECT p.ma_ctv, p.parent_ctv, a.level + 1 FROM ancestors a
    JOIN partners p ON a.parent_ctv = p.ma_ctv WHERE a.level < 5
  )
  SELECT * FROM ancestors;
  ```
- Run once per DB and merge results in-memory, avoiding the loop.
- Cache the ancestor chain for 24h in memory or Redis to avoid re-fetching.

**Detection:**
- Monitor: Count DB queries during `commissionEngine.cskh()` job; flag if > 100 queries per earning record.
- E2E test: Create a 5-level referrer tree, trigger CSKH earnings calculation, measure query count and latency (should be <5 queries per record).
- Slow query log: Flag queries on `partners` table that run > 1000 times in a single earnings batch.

---

### Pitfall 5: Signup Terms Version Race
**What goes wrong:** Admin updates the signup terms from v1 to v2 mid-morning. At the same moment, two CTVs are filling out the signup form:
- CTV A loads the form, sees v2 terms, signs and submits.
- CTV B loads the form while the update is in-flight, sees v1, signs and submits.
Later, a dispute arises: "Did they accept the new terms or old?" System has no audit trail of which version each CTV agreed to.

**Why it happens:**
- Signup form fetches active terms at load time, stores in a transient variable.
- No version ID is stored in `ctv_registrations` — only `accepted_terms` (boolean).
- Terms update is live, no versioning on the signup record.

**Consequences:**
- Cannot prove which version of terms the CTV accepted.
- Legal risk: dispute over terms compliance goes unresolved.
- Operator must manually check signup timestamp vs terms update time to guess the version.

**Prevention:**
- Add `signup_terms_id` (FK) to `ctv_registrations` table, NOT just a boolean.
- At signup form load, fetch active terms and store the row ID in hidden input.
- On submit, insert `signup_terms_id` into `ctv_registrations` (with timestamp).
- Migration: `ALTER TABLE ctv_registrations ADD COLUMN signup_terms_id INT REFERENCES signup_terms(id);`
- API response: `GET /api/ctv/terms/active` returns `{ id, version, language, content }`, client stores ID in form.
- On POST signup, require `signup_terms_id` in request body; validate it matches the row in DB.

**Detection:**
- Audit: Query `ctv_registrations` and verify every row has a valid `signup_terms_id` (not NULL, references actual row).
- E2E test: Update terms mid-signup, verify new signups record the old terms ID (if submitted before update) or new (if after).
- Dashboard: Show "Signup Terms Used" column in approval queue, color-code outdated versions.

---

### Pitfall 6: Signature Image Base64 Bloat in DB
**What goes wrong:** Signature images are captured as PNG, converted to base64, and stored directly in `partners.signature_image` column (type TEXT). A 400x150 signature at 72dpi becomes ~30KB base64, stored as a TEXT column. After 1000 CTVs sign up, the `partners` table bloats to 30MB. Queries that fetch `partners.*` slow down because of the image payload. Backups and replicas lag.

**Why it happens:**
- Base64 encoding inflates size by ~33% (4 chars per 3 bytes).
- Signature field is not indexed, so it's fetched every time `SELECT * FROM partners` runs.
- No image compression before encoding.
- No separate `partner_signatures` table to isolate the heavy data.

**Consequences:**
- `partners` table grows unexpectedly, affecting all queries.
- Backup times increase.
- Replication lag to cosmetic DB worsens.
- Approval queue page loads slowly because it fetches all partner rows.

**Prevention:**
- Store signatures in external object storage (S3 / GCP Cloud Storage), not DB.
- In `partners` table, store only `signature_image_url` (VARCHAR 512), not the image itself.
- On signup, upload PNG to object storage, get back signed URL, store URL in DB.
- Fallback: If storage is not available, create a separate narrow table:
  ```sql
  CREATE TABLE partner_signatures (
    partner_id INT PRIMARY KEY REFERENCES partners(id),
    signature_image TEXT,
    created_at TIMESTAMP
  );
  ```
  Then `SELECT p.* FROM partners p` stays lean, and `SELECT p.*, ps.signature_image FROM partners p LEFT JOIN partner_signatures ps` is explicit.
- Compress signature PNG before base64 encoding (use ImageMagick or similar).

**Detection:**
- Query: `SELECT pg_size_pretty(pg_total_relation_size('partners'));` — flag if > 50MB.
- Check: `SELECT AVG(pg_column_size(signature_image)) FROM partners;` — flag if avg > 20KB.
- E2E test: Sign up 10 CTVs, check `partners` table size, verify it grows <300KB.

---

### Pitfall 7: Dual-Format Password Downgrade Attack
**What goes wrong:** The system supports both legacy (plain SHA256) and new (salted SHA256) password hashes for backward compatibility. An attacker discovers a CTV with a legacy hash stored in the DB. They can:
1. Intercept the hash (e.g., via DB breach).
2. Crack the plain SHA256 easily (rainbow tables, GPU brute force).
3. Hijack the account.

Meanwhile, CTVs with salted hashes are secure, creating a false sense of progress. The operator doesn't know legacy hashes are still in use.

**Why it happens:**
- Backward compatibility support means legacy hashes never expire or get rehashed.
- No automatic migration on login (lazy rehash pattern).
- No audit trail showing which CTVs have weak hashes.
- Verification function accepts both formats transparently, hiding the risk.

**Consequences:**
- High-value CTV accounts compromised via legacy password hash exploitation.
- Operator unaware of the vulnerability until after a breach.
- Audit trail does not distinguish secure vs weak accounts.

**Prevention:**
- Do NOT store legacy hashes indefinitely. Set a deadline (e.g., 90 days after migration start date).
- Implement "lazy rehash on login": When a CTV with legacy hash logs in successfully, immediately re-hash the password with salt and update the DB.
- After deadline, reject legacy hashes in verify_password() — force password reset for affected CTVs.
- Add `password_hash_format` enum column to `ctv` table to track which format each CTV uses.
- Audit endpoint: `GET /api/admin/ctv/password-audit` returns count of CTVs by hash format, flag legacy accounts.
- Migration script: Batch-rehash all legacy hashes on login (not a one-time script, done opportunistically).

**Detection:**
- Query: `SELECT COUNT(*) FROM ctv WHERE password_hash NOT LIKE '%:%';` — any result > 0 means legacy hashes exist.
- Alert: If any CTV has not logged in for 60+ days and still has legacy hash, send reset-password email.
- E2E test: Verify that after lazy rehash on login, the password_hash no longer contains `:` (it does post-rehash).

---

### Pitfall 8: CSKH Classification False Positives
**What goes wrong:** Earnings are tagged as `commission_type = 'cskh'` (cosmetic follow-up) based on a heuristic: "Same CTV + cosmetic service + within 30 days of prior visit." A patient books a routine cosmetic checkup on day 29 after their initial cosmetic visit. The system flags it as CSKH and applies bonus rate (2% instead of direct 5%). But the visit is not actually a follow-up for a prior service — it's a separate consultation. CTV gets underpaid, disputes the calculation.

**Why it happens:**
- CSKH logic is time-window based without explicit "prior service reference" field.
- No way to distinguish a genuine follow-up from a coincidental repeat visit in the window.
- Heuristic is too broad: 30-day window captures unrelated visits.

**Consequences:**
- CTV earnings consistently lower than expected for certain booking patterns.
- Trust erosion: "Your system is unfairly labeling my visits."
- Disputes require manual operator review and correction.

**Prevention:**
- Add explicit `prior_earning_id` (FK to earnings table) on new earnings records.
- On visit save, require explicit link to prior earning if flagging as CSKH.
- CSKH heuristic becomes: `commission_type = 'cskh' AND prior_earning_id IS NOT NULL AND days_since_prior <= 30`.
- If no prior_earning_id, default to `commission_type = 'direct'`.
- Operator must manually link follow-up visits to their prior visit in the appointment UI.
- Fallback: If no prior_earning_id, system defaults to 'direct' (conservative, not overly generous).

**Detection:**
- Audit: For each CSKH earning, verify `prior_earning_id IS NOT NULL` and the prior earning exists.
- E2E test: Create a visit, mark as CSKH without prior earning link, verify system rejects or defaults to direct.
- Report: Dashboard shows count of CSKH vs direct earnings; compare to expected ratio.

---

### Pitfall 9: Referrer Phone Variant Matching Collisions
**What goes wrong:** During signup, the CTV enters a referrer's phone number (e.g., "0397616697"). The system searches for `WHERE phone = ?` in the `partners` table to find the referrer. But the phone numbers in the DB are stored in different formats:
- Some as `0397616697` (10 digits, leading zero, no dashes).
- Some as `+84397616697` (international, leading +84).
- Some as `397616697` (9 digits, no leading zero or country code).
A match fails, CTV cannot link to referrer. Operator must manually create the link.

**Why it happens:**
- Phone input validation does not normalize all variants.
- DB stores historical data in mixed formats from older imports.
- No standardization on insert (each system, each country, each era used different conventions).

**Consequences:**
- New CTV signups fail to auto-link referrers.
- Approval process requires manual operator intervention to fix links.
- Referrer earnings not tracked correctly because link is missing.
- Duplicate records created for the same person (e.g., CTV A and CTV B both claim the same referrer with different phone formats).

**Prevention:**
- Implement phone normalization function: `normalize_phone(input) → standardized`.
  - Strip non-digits except leading +.
  - If starts with +84, keep it; if starts with 0, replace with +84; if 9 digits and no leading 0, prepend +84.
  - Result: all phones stored as `+84XXXXXXXXX` (12 chars).
- On INSERT to `partners`, call `normalize_phone()` on the phone field.
- On signup referrer lookup, normalize the input before querying: `SELECT * FROM partners WHERE phone = normalize_phone(?)`.
- Migration: Back-fill existing `partners` phone field with normalized values.
- Add UNIQUE constraint on normalized phone: `UNIQUE(phone)` (after normalization).

**Detection:**
- Query: `SELECT COUNT(DISTINCT phone) FROM partners;` vs `SELECT COUNT(DISTINCT normalize_phone(phone)) FROM partners;` — if different, duplicates exist.
- Audit: Grep `partners` table for phone patterns, group by variant (e.g., `0%`, `+84%`, `84%`), count each.
- E2E test: Signup with referrer phone in multiple formats (0397..., 0397..., +84397...), verify all resolve to the same referrer.

---

### Pitfall 10: `is_ctv` Flag Mismatch Between Dental and Cosmetic Mirrors
**What goes wrong:** A CTV is approved for both dental and cosmetic LOBs. The approval process creates `partners` rows in both DBs, both with `is_ctv = true`. Later, an operator queries cosmetic DB directly (e.g., via DBeaver) and accidentally sets a row's `is_ctv = false` without updating dental. The two DBs are now inconsistent. CTV shows as not-a-CTV in cosmetic portal, but earns commissions in dental. Operator is confused about which is the source of truth.

**Why it happens:**
- Two-DB architecture means no single source of truth for the `is_ctv` flag.
- Operators have direct DB access and can modify data without the API (intentional, for emergencies).
- No constraints or audit log to enforce dual-DB consistency on manual edits.
- No sync check after manual DB edits.

**Consequences:**
- Inconsistent CTV status across LOBs.
- Operator unable to determine canonical state.
- CTV portal shows inconsistent commission eligibility.
- Audit trail does not capture the manual edit.

**Prevention:**
- Make `is_ctv` read-only in the API layer. Changes only via approval/deactivation endpoints.
- If manual edits are necessary (emergency), require a sync endpoint to be called afterward: `POST /api/admin/partners/sync-is-ctv-flag`.
- This endpoint re-synchronizes the flag across both DBs: query dental, compare to cosmetic, resolve conflicts (see next bullet).
- Conflict resolution: canonical source is the DB that was edited most recently (check `updated_at` timestamp). Copy flag from canonical to mirror.
- Add a nightly job that audits `is_ctv` flag in both DBs, alerts if mismatches exist.

**Detection:**
- Query: `SELECT ma_ctv, is_ctv FROM tdental.partners WHERE ma_ctv IN (SELECT ma_ctv FROM tcosmetic.partners) EXCEPT SELECT ma_ctv, is_ctv FROM tcosmetic.partners WHERE ma_ctv IN (SELECT ma_ctv FROM tdental.partners);` — if any results, flags are out of sync.
- E2E test: Approve a dual-LOB CTV, manually edit one DB's `is_ctv` flag, call `/api/admin/partners/sync-is-ctv-flag`, verify both DBs now match.
- Dashboard: Add a "Sync Status" indicator in the approval queue showing last sync time and any mismatches.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|-----------|
| Database | Migrations (048–052) | Two-DB sync not enforced in schema | Add FK constraints, DEFAULT values, and triggers to keep dental/cosmetic in sync |
| Signup | Public endpoint + Gemini | Cost runaway, bot abuse | Rate limit per IP, image size validation, feature flag off-by-default |
| Approval | Atomic partner creation | Partial creation in one DB, full in other | Stored procedure or transaction loop that fails both or succeeds both |
| Commission Tiers | Admin editor | Drift between LOBs after update | Single endpoint that validates both DBs update, returns error if either fails |
| CommissionEngine | CSKH branch | N+1 recursive walks | Use CTE or pre-fetch ancestor chain, cache results |
| Auth | Dual-format passwords | Legacy hash exploitation indefinitely | Lazy rehash on login, set deadline for legacy format phase-out, audit weak hashes |

---

**Sources:** CTVlegacy documentation, commissionEngine audit, commission_settings sync footgun report, dual-password compatibility log, signup terms version control status
