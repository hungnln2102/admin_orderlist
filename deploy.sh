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

echo "[1/3] Pulling latest code from Git..."
git pull origin main || git pull origin master

echo ""
if [ -n "$NO_CACHE" ]; then
  echo "[2/3] Rebuilding Docker containers (--no-cache)..."
else
  echo "[2/3] Rebuilding Docker containers (BuildKit + layer cache)..."
fi
"${DC[@]}" -f docker-compose.yml down
docker volume prune -f 2>/dev/null || true
"${DC[@]}" -f docker-compose.yml build $NO_CACHE
"${DC[@]}" -f docker-compose.yml up -d

if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
  echo ""
  echo "Reloading Host Nginx to clear proxy cache..."
  sudo nginx -s reload 2>/dev/null && echo "Host Nginx reloaded." || echo "Could not reload Host Nginx (requires sudo)."
fi

echo ""
echo "[3/3] Checking container status..."
sleep 3
"${DC[@]}" ps

echo ""
echo "======================================"
echo "  Deployment completed!"
echo "======================================"
echo ""
echo "Logs: ${DC[*]} logs -f"
