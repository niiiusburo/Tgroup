<!-- @crossref:domain[business-unit] -->
<!-- @crossref:used-in[NK3->NK2 promotion runbook] -->
<!-- @crossref:uses[scripts/nk3-to-nk2-preport-gates.py, scripts/verify-migration-additivity.js, docs/runbooks/DEPLOYMENT.md, docs/MIGRATIONS.md, product-map/governance-delta-cosmetic-lob-v2.md] -->

# NK3 → NK2 (→ NK) Promotion Runbook

> Promotes the Cosmetic-LOB v2 + CTV build from NK3 (`tmv.2checkin.com`) onto
> NK2 staging (`nk2.2checkin.com`) and then NK production (`nk.2checkin.com`).
> Promotion order is strictly **NK3 → NK2 → NK**. All preparation and gates run
> **local-first** on `127.0.0.1:5433`; nothing here touches live infra until the
> explicit promotion steps, which are gated on green local results + a per-target
> revalidate.

This runbook is the gate that answers one question: **will bringing NK3 onto NK2
and NK break the existing dental clinic?** The answer is "no, if the gates are
green and the per-target pre-checks pass," for two structural reasons:

1. **The dental DB changes are strictly additive.** Migrations `047–061` only
   `ADD COLUMN IF NOT EXISTS` (nullable/defaulted), `CREATE TABLE/INDEX IF NOT
   EXISTS`, and run `WHERE`-guarded backfills. No `DROP`/destructive `ALTER` on
   any pre-existing dental table. Proven by Gate 0 (static) + Gate 2 (real-data
   re-apply).
2. **All cosmetic code is feature-flagged off.** `COSMETIC_LOB_ENABLED` defaults
   `false`; with it off, `/api/cosmetic/*` returns `503 COSMETIC_LOB_DISABLED`,
   the LOB toggle is hidden, and every dental code path is byte-identical to
   today. NK2/NK can take the new code with the flag **off** and behave exactly
   as before.

## What the port carries (the delta)

- **Two-DB topology**: dental pool (`DATABASE_URL`) + cosmetic pool
  (`COSMETIC_DATABASE_URL`) via the `getDb(lob)` / `getQuery(req)` / ALS factory
  in `api/src/db.js`. The cosmetic DB is a **separate database**, never a
  cross-DB JOIN.
- **Additive dental schema** (migrations `047–061`): `partners.lob_scope`,
  `partners.is_ctv`, `partners.referred_by_ctv_id`, `products.commission_rate_percent`,
  `appointments.ctv_id`, `saleorders.ctv_id`, and the new tables `earnings`,
  `payouts`, `consultations`, `referral_locks`, `commission_level_config`,
  `commission_settings`, `braces_commission_level_config`, `audit_logs`.
- **Flag-gated `/api/cosmetic/*` mirror** (`api/src/server.js`) + `/api/ctv`
  (the only cross-DB surface, the CTV aggregator).
- The same set, applied to a **second cosmetic DB**, only matters once the flag
  is flipped on. With the flag off, the cosmetic DB can be absent.

## Pre-port gates (run before every promotion)

One command runs every local gate:

```bash
python3 scripts/nk3-to-nk2-preport-gates.py          # full suite (~3 min; Gate 2 clones real data)
python3 scripts/nk3-to-nk2-preport-gates.py --quick  # Gate 0,1,3 only (~3 s; no clone, no API boot)
python3 scripts/nk3-to-nk2-preport-gates.py --skip-live  # everything except the API boot
```

| Gate | What it proves | How |
|---|---|---|
| 0 additivity | No migration in the delta destroys/rewrites a pre-existing dental object | `node scripts/verify-migration-additivity.js` (static; exits 1 on any HIGH) |
| 1 revalidate | `049_widen`'s new `partners` CHECK won't abort on existing rows | per-DB count of `created_via` values outside the allowed set (must be 0) |
| 2 reapply | The full delta applies clean on a **real-data copy** of dental and removes **0** dental columns | clone `tdental_demo` → re-apply `047–061` → diff column set |
| 3 flag-guards | `/api/cosmetic/*` = `503` when flag off; `403 S_LOB_FORBIDDEN` / `200` when on | `jest api/src/__tests__/cosmeticLobGuards.test.js` |
| 4 two-db | CTV create writes route to the correct DB(s) with no cross-DB leakage | boot API (flag on) + `scripts/nk3-only/nk3-save-roundtrip-smoke.py` |

Last local run (branch `nk3-deploy`): **6 PASS · 0 FAIL · 0 SKIP**. Gate 0 reports
`58 SAFE · 4 REVIEW · 0 HIGH`; the 4 REVIEW items are the expected, non-destructive
attention points below. A JSON report is written to `output/preport-gates-report.json`.

The static audit alone is also wired into the verify family:

```bash
npm run verify:migrations
```

## The one genuine breakage risk — `049_widen` (verify on EACH target)

`049_widen_partners_created_via_for_legacy_ctv.sql` replaces the
`partners_created_via_check` CHECK constraint. `ADD CONSTRAINT … CHECK` has no
`IF NOT EXISTS` and **re-validates every existing `partners` row at apply time**.
If any row on the target has a `created_via` outside the allowed set, the
migration aborts.

Run this on **each** target DB (NK2 staging, then NK prod) **before** applying
the delta, and confirm it returns `0`:

```sql
SELECT count(*) FROM dbo.partners
WHERE created_via IS NOT NULL
  AND created_via NOT IN ('self_signup','admin_create','migrated')
  AND created_via NOT LIKE 'legacy_ctv_import%';
```

If it returns `> 0`, list the offenders and normalize them (or widen the CHECK)
before applying `049_widen`:

```sql
SELECT DISTINCT created_via, count(*) FROM dbo.partners
WHERE created_via IS NOT NULL
  AND created_via NOT IN ('self_signup','admin_create','migrated')
  AND created_via NOT LIKE 'legacy_ctv_import%'
GROUP BY created_via;
```

Other REVIEW items (informational, non-destructive): `049_widen` also widens
`partners.created_via` `VARCHAR(16)→(64)` (safe widen) and drops/replaces the
CHECK constraint; `053` drops `commission_settings.default_referral_percent`
(a delta-introduced column). Duplicate-numbered migrations (`047`, `049`) are
idempotent and alpha-ordered by the deploy loop.

## Promote to NK2 (staging) — flag OFF first

Goal: NK2 runs the NK3 code with **zero behavior change** (flag off), proving the
additive schema + new code are inert on real staging data.

1. **Local gates green** — `python3 scripts/nk3-to-nk2-preport-gates.py` → all PASS.
2. **Back up the NK2 dental DB** (and any prior code) before any write.
3. **Per-target revalidate** — run the `049_widen` pre-check (above) on the NK2
   dental DB; confirm `0`.
4. **Apply the additive migrations** to the NK2 dental DB (idempotent; every file
   is `IF NOT EXISTS`):
   ```bash
   for f in /opt/tgroup-staging/api/migrations/*.sql; do
     docker exec -i <nk2-db-container> psql -U postgres -d <nk2-dental-db> -v ON_ERROR_STOP=1 < "$f"
   done
   ```
   Confirm the exact NK2 DB container + database name on the box first
   (`docker ps`); do not assume. With the flag off this only adds columns/tables —
   dental queries are unchanged.
5. **Deploy the NK3 code** to the NK2 web/api containers **without** exporting the
   cosmetic flags. `docker-compose.yml` defaults `COSMETIC_LOB_ENABLED` and
   `VITE_COSMETIC_LOB_ENABLED` to `false`, so `/api/cosmetic/*` returns 503 and the
   admin LOB toggle stays hidden.
6. **Verify dental parity on NK2** — log in as `t@clinic.vn`, confirm the header,
   reports, and a customer/payment flow look identical to before; confirm
   `GET /api/cosmetic/Partners` returns `503 COSMETIC_LOB_DISABLED`.
   Optionally run `NK_BASE=https://nk2.2checkin.com python3 scripts/nk2-regression.py`
   for the export/resolver smoke.

### (Optional) Turn cosmetic ON in NK2 — Phase 4 experimental

Only after step 6 is clean and you want to stage cosmetic:

1. Provision the **cosmetic DB** on NK2 (a `tcosmetic_*` database), apply the same
   `047–061` migrations to it, and set `COSMETIC_DATABASE_URL` on the NK2 api.
2. Export `COSMETIC_LOB_ENABLED=true` + `VITE_COSMETIC_LOB_ENABLED=true` and rebuild.
3. Grant `lob_scope += 'cosmetic'` + `cosmetic.access` to 1–2 test admins.
4. Real-browser smoke: toggle to Cosmetic (empty state), toggle back (dental
   intact); CTV-flagged user lands on `/ctv` and gets `403` on `/customers`.

## Promote to NK (production)

Repeat the NK2 sequence against NK (`/opt/tgroup`, container `tgroup-db`, db
`tdental_demo`), in this order:

1. Local gates green **and** NK2 has run clean for the agreed soak period.
2. Back up the NK dental DB.
3. **Per-target revalidate** the `049_widen` pre-check on NK prod → `0`.
4. Apply the additive migrations to `tdental_demo` (flag stays off).
5. Deploy the code; keep cosmetic flags unset.
6. Verify dental parity on `https://nk.2checkin.com`; `/api/cosmetic/*` → 503.
7. Flip cosmetic on in prod only as a separate, deliberate change after NK2 has
   proven the cosmetic path, granting scope only to designated accounts.

## Rollback

- **Code**: redeploy the previous image/build (kept from step 2).
- **Flag**: unset `COSMETIC_LOB_ENABLED` / `VITE_COSMETIC_LOB_ENABLED` and rebuild —
  cosmetic disappears instantly; dental is unaffected.
- **Schema**: the additive columns/tables are inert when the flag is off, so they
  normally need no rollback. If required, each migration file carries a documented
  reverse (`DROP COLUMN/TABLE IF EXISTS …`); apply in reverse order. The `049_widen`
  CHECK can only be narrowed back after confirming no value exceeds the old set.

## Definition of done (per target)

- [ ] `python3 scripts/nk3-to-nk2-preport-gates.py` → all PASS, on the promotion commit.
- [ ] `049_widen` pre-check returns `0` on the target DB.
- [ ] Target DB backed up.
- [ ] Additive migrations applied; `SELECT count(*) FROM dbo.partners WHERE lob_scope IS NULL` → `0`.
- [ ] Dental parity verified in a real browser on the target URL.
- [ ] `/api/cosmetic/*` returns `503` while the flag is off.
- [ ] `docs/CHANGELOG.md` entry + `website/package.json` bump for the deployed build.
