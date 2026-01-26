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
echo "[2/3] Rebuilding Docker containers..."
docker-compose down
docker-compose up -d --build

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