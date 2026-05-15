# GHCR Setup — One-time PAT minting for VPS pulls

**Used by:** v2.0 Phase 9 (CI image push) + Phase 10 (VPS atomic deploy)
**Frequency:** Once at v2.0 cutover, then every 90 days for rotation
**Owner:** Project lead (requires GitHub UI access to `niiiusburo` org)

## Why this exists

GHCR (`ghcr.io`) hosts our private container images. The CI workflow uses the built-in `GITHUB_TOKEN` to push, but the VPS needs its own credential to *pull*. This runbook mints that pull-only token.

We deliberately use a **read-only** PAT on the VPS. Even if the VPS is compromised, the attacker cannot push poisoned images.

## Prerequisites

- `gh` CLI installed and authenticated as a member of the `niiiusburo` org (or fork-owner)
- Browser access (token creation has no API)
- SSH access to the VPS (`ssh root@76.13.16.68`)

## Run it

```bash
./scripts/setup-ghcr-pat.sh
```

The script walks through:

1. **Preflight** — verifies `gh` is installed and logged in
2. **Scope refresh** — adds `write:packages` to your local `gh` auth (needed by Phase 9 CI debugging, not by the VPS)
3. **Mint PAT** — opens GitHub's classic-PAT page in your browser. You set:
   - Note: `tgroup-vps-ghcr-pull`
   - Expiration: **90 days** (recommended) or "No expiration" (accept the risk)
   - Scopes: **`read:packages` only** — nothing else
4. **Save locally** — writes to `~/.config/tgroup/ghcr.token` (mode 600). The script verifies the token works by attempting `docker login ghcr.io`.
5. **Ship to VPS** — prints the exact `scp` + `ssh` commands. **You** run them after reviewing.

## After running

Two files exist:

| Path | Owner | Purpose |
|------|-------|---------|
| `~/.config/tgroup/ghcr.token` (laptop) | you | Master copy + rotation source |
| `/opt/tgroup/.env.ghcr` (VPS, mode 600) | root | Sourced by `scripts/deploy.sh` for `docker login` |

## Rotation (every 90 days)

```bash
# 1. Re-run the mint script — creates a new PAT
./scripts/setup-ghcr-pat.sh

# 2. Push the new file to VPS (overwrite the old one)
scp ~/.config/tgroup/ghcr.token root@76.13.16.68:/opt/tgroup/.env.ghcr

# 3. Test on VPS
ssh root@76.13.16.68 'cd /opt/tgroup && source .env.ghcr && \
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin && \
  docker pull ghcr.io/niiiusburo/tgroup-api:latest && \
  docker logout ghcr.io'

# 4. Revoke the old PAT in the GitHub UI:
#    https://github.com/settings/tokens
```

## Troubleshooting

**`docker login ghcr.io` returns "denied"** — the token doesn't have `read:packages` scope. Re-mint with the correct scope.

**`docker pull` returns "manifest unknown"** — the image hasn't been pushed yet (Phase 9 not deployed) or the namespace is wrong. Check `https://github.com/orgs/niiiusburo/packages`.

**`gh auth refresh` says "no scopes to add"** — your existing `gh` auth already has the scopes; safe to skip.

**Browser opens but shows "404"** — your `gh` user may not be in the `niiiusburo` org. Have an org admin invite you or generate the PAT under the org's machine-user account.

## Why classic PAT and not fine-grained PAT?

Fine-grained PATs do not yet support GHCR (as of late 2025). Once they do, switch — fine-grained tokens are scoped per-repository and per-permission, which is strictly safer.

## Why not use the CI's `GITHUB_TOKEN` for the VPS too?

`GITHUB_TOKEN` is a per-workflow ephemeral credential — it cannot be exfiltrated to the VPS, and even if it could, it expires when the workflow ends. The VPS needs a long-lived credential, hence the PAT.
