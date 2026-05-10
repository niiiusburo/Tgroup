#!/bin/bash
set -euo pipefail

# local-prod-mirror.sh — Run local stack with production images
# Usage: TAG=v0.4.15 bash scripts/local-prod-mirror.sh
#
# This script pulls prebuilt images from GHCR and runs them locally,
# mirroring the exact production configuration. Useful for testing
# production image behavior before deploying to VPS.

DEFAULT_TAG="main"
DOCKER_IMAGE_TAG="${DOCKER_IMAGE_TAG:-${TAG:-$DEFAULT_TAG}}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/niiiusburo/Tgroup}"

echo "==> local-prod-mirror: Pulling production images (tag: $DOCKER_IMAGE_TAG)"

export DOCKER_IMAGE_TAG
export DOCKER_REGISTRY

# Test pull before starting (fail fast on auth errors)
echo "==> Testing GHCR authentication..."
if ! docker pull "$DOCKER_REGISTRY/tgroup-api:$DOCKER_IMAGE_TAG" 2>/dev/null; then
    echo "ERROR: Could not pull image from GHCR. Check:"
    echo "  1. Network connectivity to ghcr.io"
    echo "  2. Image exists: $DOCKER_REGISTRY/tgroup-api:$DOCKER_IMAGE_TAG"
    echo "  3. Authentication (for private images): docker login ghcr.io"
    echo ""
    echo "Continuing without authentication (images may not exist yet in GHCR)..."
else
    echo "✓ Authentication successful"
fi

# Start the stack with prod compose file
echo "==> Starting production-mirror stack..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to become healthy
echo "==> Polling health endpoints (60s timeout)..."
max_wait=60
elapsed=0
api_healthy=false
web_healthy=false
face_healthy=false

while [ $elapsed -lt $max_wait ]; do
    # Test API health
    if curl -s -f http://localhost:3002/api/health >/dev/null 2>&1; then
        api_healthy=true
    fi

    # Test web health
    if curl -s -f http://localhost/index.html >/dev/null 2>&1; then
        web_healthy=true
    fi

    # Test face-service health
    if curl -s -f http://localhost:8001/health >/dev/null 2>&1; then
        face_healthy=true
    fi

    if [ "$api_healthy" = true ] && [ "$web_healthy" = true ] && [ "$face_healthy" = true ]; then
        echo "✓ All services healthy"
        echo ""
        echo "✅ Production mirror is ready!"
        echo ""
        echo "Access the stack:"
        echo "  Web: http://localhost:5175"
        echo "  API: http://localhost:3002/api"
        echo "  Face Service: http://localhost:8001"
        echo ""
        exit 0
    fi

    elapsed=$((elapsed + 1))
    sleep 1
done

# If we get here, healthcheck failed
echo ""
echo "⚠️  Healthcheck timeout. Services may still be starting."
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Logs:"
docker compose -f docker-compose.prod.yml logs --tail=20
echo ""
exit 1
