#!/bin/bash

# Quick fix deployment script
# This rebuilds only the frontend container with the nginx fix

set -e

echo "🔧 Fixing nginx configuration and redeploying frontend..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop frontend
echo -e "${YELLOW}Stopping frontend container...${NC}"
docker-compose stop frontend

# Remove old container
echo -e "${YELLOW}Removing old container...${NC}"
docker-compose rm -f frontend

# Rebuild with no cache to ensure nginx config is updated
echo -e "${YELLOW}Rebuilding frontend (this may take a few minutes)...${NC}"
docker-compose build --no-cache frontend

# Start frontend
echo -e "${YELLOW}Starting frontend...${NC}"
docker-compose up -d frontend

# Wait a bit
sleep 3

# Check if running
if docker ps | grep -q "admin_orderlist-frontend"; then
    echo -e "${GREEN}✅ Frontend redeployed successfully!${NC}"
    
    # Show logs
    echo -e "\n${YELLOW}Recent logs:${NC}"
    docker logs --tail 20 admin_orderlist-frontend
    
    # Test if files are accessible
    echo -e "\n${YELLOW}Testing if JS files are accessible...${NC}"
    docker exec admin_orderlist-frontend ls -lh /usr/share/nginx/html/assets/ | head -5
    
    echo -e "\n${GREEN}✅ Done! Please clear browser cache (Ctrl+Shift+Delete) and refresh${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    docker logs admin_orderlist-frontend
    exit 1
fi
