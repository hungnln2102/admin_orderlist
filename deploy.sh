#!/bin/bash

# Simple deployment script - run on server
# Usage: ./deploy.sh

set -e

echo "======================================"
echo "  Deploying Admin Order List"
echo "======================================"
echo ""

# Step 1: Pull latest code from Git
echo "[1/3] Pulling latest code from Git..."
git pull origin main || git pull origin master

# Step 2: Rebuild and restart Docker containers
echo ""
echo "[2/3] Rebuilding Docker containers (no cache)..."
# Dùng -f để CHỈ load docker-compose.yml, bỏ qua override (dành cho dev local)
docker-compose -f docker-compose.yml down
# Xóa anonymous volumes cũ (node_modules) để tránh dùng bản cũ
docker volume prune -f 2>/dev/null || true
docker-compose -f docker-compose.yml build --no-cache
docker-compose -f docker-compose.yml up -d

# Reload host Nginx to clear proxy cache (if applicable)
if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
    echo ""
    echo "Reloading Host Nginx to clear proxy cache..."
    sudo nginx -s reload 2>/dev/null && echo "Host Nginx reloaded." || echo "Could not reload Host Nginx (requires sudo)."
fi

# Step 3: Show status
echo ""
echo "[3/3] Checking container status..."
sleep 3
docker-compose ps

echo ""
echo "======================================"
echo "  Deployment completed!"
echo "======================================"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"