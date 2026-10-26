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

CLEAR_CACHE_ON_DEPLOY="${CLEAR_CACHE_ON_DEPLOY:-1}"
REDIS_DB="${REDIS_DB:-0}"

echo "======================================"
echo "  Deploying Admin Order List"
echo "======================================"
echo ""

echo "[1/4] Pulling latest code from Git..."
git pull origin main || git pull origin master

echo ""
if [ -n "$NO_CACHE" ]; then
  echo "[2/4] Rebuilding Docker containers (--no-cache)..."
else
  echo "[2/4] Rebuilding Docker containers (BuildKit + layer cache)..."
fi
"${DC[@]}" -f docker-compose.yml down
"${DC[@]}" -f docker-compose.yml build $NO_CACHE
"${DC[@]}" -f docker-compose.yml up -d

if [ "$CLEAR_CACHE_ON_DEPLOY" = "1" ]; then
  echo ""
  echo "Clearing Redis cache (FLUSHALL across all databases)..."
  if "${DC[@]}" -f docker-compose.yml exec -T redis redis-cli FLUSHALL >/dev/null 2>&1; then
    echo "Redis cache cleared (FLUSHALL OK)."
  else
    echo "Warning: Could not clear Redis cache automatically."
  fi
fi

if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
  echo ""
  echo "Reloading Host Nginx and clearing proxy caches..."
  if [ -d "/var/cache/nginx" ]; then
    sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
  fi
  (sudo nginx -t && sudo nginx -s reload) 2>/dev/null && echo "Host Nginx reloaded successfully." || echo "Notice: Host Nginx reload skipped or failed."
fi

echo ""
echo "[3/4] Running database migrations..."
"${DC[@]}" -f docker-compose.yml exec -T backend npx knex migrate:latest || echo "Warning: Database migration failed. Please check logs."

echo ""
echo "[4/4] Checking container status..."
sleep 3
"${DC[@]}" ps

echo ""
echo "======================================"
echo "  Deployment completed!"
echo "======================================"
echo ""
echo "Logs: ${DC[*]} logs -f"
