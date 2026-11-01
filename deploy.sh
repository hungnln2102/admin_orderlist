#!/bin/bash

# Deploy trên server — bật BuildKit (cache apt trong Dockerfile; Chromium baked vào image backend).
# Rebuild có cache (nhanh). Buộc sạch: ./deploy.sh --no-cache
# Usage: ./deploy.sh | ./deploy.sh --no-cache

set -euo pipefail

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

NO_CACHE=""
if [ "${1:-}" = "--no-cache" ]; then
  NO_CACHE="--no-cache"
fi

echo "======================================"
echo "  Deploying Admin Order List"
echo "======================================"
echo ""

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy from a dirty worktree. Commit or stash server-side changes first."
  exit 1
fi

echo "[1/5] Pulling latest code from Git..."
git pull origin main || git pull origin master

echo ""
if [ -n "$NO_CACHE" ]; then
  echo "[2/5] Rebuilding Docker images (--no-cache)..."
else
  echo "[2/5] Rebuilding Docker images (BuildKit + layer cache)..."
fi
"${DC[@]}" -f docker-compose.yml build $NO_CACHE
"${DC[@]}" -f docker-compose.yml up -d --wait --wait-timeout 120 postgres redis

echo ""
echo "[3/5] Running database migrations before application rollout..."
"${DC[@]}" -f docker-compose.yml run --rm --no-deps backend npx knex migrate:latest

if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
  echo ""
  echo "Validating and reloading Host Nginx..."
  (sudo nginx -t && sudo nginx -s reload) 2>/dev/null && echo "Host Nginx reloaded successfully." || echo "Notice: Host Nginx reload skipped or failed."
fi

echo ""
echo "[4/5] Starting updated application containers without tearing down healthy services..."
"${DC[@]}" -f docker-compose.yml up -d --remove-orphans

echo ""
echo "[5/5] Checking container status..."
sleep 3
"${DC[@]}" ps

echo ""
echo "======================================"
echo "  Deployment completed!"
echo "======================================"
echo ""
echo "Logs: ${DC[*]} logs -f"
