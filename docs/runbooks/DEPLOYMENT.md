# DEPLOYMENT.md

> VPS deployment authority for TGClinic.

> **Cosmetic LOB v2 (Phase 0):** "local only, NK2 later" per PLAN.md and governance-delta.md. Feature flag COSMETIC_LOB_ENABLED=false by default in all envs. tcosmetic_demo provisioning/restore steps + dual-pool connection details in VERIFICATION.md and INFRASTRUCTURE.md. No direct NK2/prod changes in this worktree until Phase 4 after local gates + rollback dry-run. See v2 design migration plan steps 1-8.

## Rule

All changes are fixed and verified locally before VPS deployment. Do not edit VPS files directly as the first fix path.

## Main Production Target

- Site: `https://nk.2checkin.com`
- Runtime: Docker Compose on VPS behind nginx.
- Web: static Vite build.
- API: Node/Express container.
- Database: PostgreSQL using `dbo` schema.

### NK3 (tmv.2checkin.com) Deploy Notes

NK3 is the Cosmetic LOB v2 target. Before building NK3, the VPS shell MUST export:

```bash
export COSMETIC_LOB_ENABLED=true
export VITE_COSMETIC_LOB_ENABLED=true
```

These flags enable `/api/cosmetic/*` routes and the LOB toggle in the admin UI. The `docker-compose.yml` defaults both to `false`, so NK and NK2 deployments are unaffected when these exports are omitted.

NK3 databases are `tdental_nk3` + `tcosmetic_nk3` (from `/opt/tgroup-nk3/.env.nk3`), **not** `tdental_demo`. The checklist step-4 migration loop on NK3 must target them:

```bash
for f in /opt/tgroup-nk3/app/api/migrations/*.sql; do docker exec -i tgroup-db psql -U postgres -d tdental_nk3 < "$f"; done
# cosmetic-DB migrations likewise against tcosmetic_nk3
```

## Deployment Checklist

1. Confirm local git status and intended commit.
2. Run the verification gates for the changed area.
3. Confirm `website/package.json` version and changelog are aligned for website/runtime code changes.
4. If schema or permission data changed, apply and verify migrations locally first. **After deploy, also apply unapplied canonical migrations on the VPS DB** — migrations are not auto-run. Loop them with `for f in /opt/tgroup/api/migrations/*.sql; do docker exec -i tgroup-db psql -U postgres -d tdental_demo < "$f"; done` (idempotent — every migration uses `IF NOT EXISTS`). Symptom of a missed migration: API returns 500 with `relation "dbo.<table>" does not exist`.
   - `api/migrations/` is the canonical deploy path. `api/src/db/migrations/` currently contains supplemental stragglers (`003_add_payment_category.sql`, `046_customer_face_embeddings.sql`); check `docs/MIGRATIONS.md` and run/consolidate those explicitly when a change depends on them.
5. Update `scripts/deploy-tbot.sh` before changing Docker/nginx/deploy behavior.
6. If Face ID changed, verify the configured provider: for `local`, `face-service` builds/starts and model download URLs are reachable; for `compreface`, CompreFace containers start, `COMPREFACE_API_KEY` is valid, and `/api/health` reports `"faceProvider":"compreface"`.
7. If operational exports changed, confirm production nginx has `/api` proxy timeouts long enough for large downloads.
8. Deploy to VPS.
9. Verify production version, containers, API health, and the changed user flow.

## Deployment Script

The deploy script is:

```bash
bash scripts/deploy-tbot.sh
```

Before changing it:

```bash
bash -n scripts/deploy-tbot.sh
```

## Production Proof

Every deployment recap should include:

- Version deployed.
- Commit deployed.
- URL checked.
- API endpoint or UI page checked.
- Any migration/permission/database checks performed.
- For export changes, the `/api/Exports` route or page export checked and whether nginx timeout behavior was verified.
- For Face ID changes, verify `/api/health` shows `checks.faceService: true` and the expected `faceProvider`, then verify the Face ID button is visible on the customer page.
- Remaining risks.
