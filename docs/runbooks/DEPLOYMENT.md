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
3. Confirm `website/package.json` version and changelog are aligned for website/runtime code changes.
4. If schema or permission data changed, apply and verify migrations locally first.
5. Update `scripts/deploy-tbot.sh` before changing Docker/nginx/deploy behavior.
6. If Face ID changed, verify `face-service` container builds and starts, and model download URLs are reachable.
7. If operational exports changed, confirm production nginx has `/api` proxy timeouts long enough for large downloads.
7. Deploy to VPS.
8. Verify production version, containers, API health, and the changed user flow.

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
- For Face ID changes, verify `/api/health` shows `faceService: true` and the Face ID button is visible on the customer page.
- Remaining risks.
