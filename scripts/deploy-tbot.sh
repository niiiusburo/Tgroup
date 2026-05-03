#!/bin/bash

set -euo pipefail

PRODUCTION_DOMAIN="nk.2checkin.com"
RUNBOOK="docs/runbooks/DEPLOYMENT.md"

cat >&2 <<MESSAGE
This legacy deployment bootstrap is obsolete and refuses to run.

Current production target: https://${PRODUCTION_DOMAIN}
Deployment authority: ${RUNBOOK}

Use the current Docker/nginx VPS runbook and verify locally before deploying.
Do not use this script as a one-command VPS bootstrap until it is replaced with
the current ${PRODUCTION_DOMAIN} deployment flow.
MESSAGE

exit 1
