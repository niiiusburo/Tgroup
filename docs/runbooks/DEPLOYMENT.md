# DEPLOYMENT.md

> VPS deployment authority for TGClinic.

## Rule

All changes are fixed and verified locally before VPS deployment. Do not edit VPS files directly as the first fix path.

## Main Production Target

- Site: `https://nk.2checkin.com`
- Runtime: Docker Compose on VPS behind nginx.
- Web: static Vite build.
- API: Node/Express container.
- Database: PostgreSQL using `dbo` schema.

## Deployment Checklist

1. Confirm local git status and intended commit.
2. Run the verification gates for the changed area.
3. Run deployment continuity preflight from the exact deploy worktree and list every feature/fix included, for example `DEPLOY_SITE=nk,nk2 DEPLOY_FEATURES=$'Investor same-portal scope\nTLBS selector hotfix' source scripts/deploy-build-args.sh`. The preflight must contain the target's live `/version.json.gitCommit`; otherwise stop and rebase/re-port onto the live commit.
4. Confirm `website/package.json` version and changelog are aligned for website/runtime code changes.
5. If schema or permission data changed, apply and verify migrations locally first. **After deploy, also apply unapplied canonical migrations on the VPS DB** — migrations are not auto-run. Loop them with `for f in /opt/tgroup/api/migrations/*.sql; do docker exec -i tgroup-db psql -U postgres -d tdental_demo < "$f"; done` (idempotent — every migration uses `IF NOT EXISTS`). Symptom of a missed migration: API returns 500 with `relation "dbo.<table>" does not exist`.
   - `api/migrations/` is the canonical deploy path. `api/src/db/migrations/` currently contains supplemental stragglers (`003_add_payment_category.sql`, `046_customer_face_embeddings.sql`); check `docs/MIGRATIONS.md` and run/consolidate those explicitly when a change depends on them.
6. Update `scripts/deploy-tbot.sh` before changing Docker/nginx/deploy behavior.
7. If Face ID changed, verify the configured provider: for `local`, `face-service` builds/starts and model download URLs are reachable; for `compreface`, CompreFace containers start, `COMPREFACE_API_KEY` is valid, and `/api/health` reports `"faceProvider":"compreface"`.
8. If operational exports changed, confirm production nginx has `/api` proxy timeouts long enough for large downloads.
9. Deploy to VPS.
10. Verify production version, containers, API health, and the changed user flow.

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
- Deployed feature manifest from `DEPLOY_FEATURES`.
- Live commit before deploy and candidate commit after deploy.
- URL checked.
- API endpoint or UI page checked.
- Any migration/permission/database checks performed.
- For export changes, the `/api/Exports` route or page export checked and whether nginx timeout behavior was verified.
- For Face ID changes, verify `/api/health` shows `checks.faceService: true` and the expected `faceProvider`, then verify the Face ID button is visible on the customer page.
- Remaining risks.
