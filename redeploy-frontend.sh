#!/bin/bash

# Deployment script for Admin Orderlist
# This script rebuilds and redeploys the frontend container

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop the current frontend container
echo -e "${YELLOW}📦 Stopping current frontend container...${NC}"
docker-compose stop frontend

# Step 2: Remove the old container
echo -e "${YELLOW}🗑️  Removing old frontend container...${NC}"
docker-compose rm -f frontend

# Step 3: Rebuild the frontend image without cache
echo -e "${YELLOW}🔨 Building new frontend image (this may take a few minutes)...${NC}"
docker-compose build --no-cache frontend

# Step 4: Start the new frontend container
echo -e "${YELLOW}▶️  Starting new frontend container...${NC}"
docker-compose up -d frontend

# Step 5: Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Step 6: Check container status
if docker ps | grep -q "admin_orderlist-frontend"; then
    echo -e "${GREEN}✅ Frontend container is running!${NC}"
    
    # Show container logs
    echo -e "${YELLOW}📋 Recent container logs:${NC}"
    docker logs --tail 20 admin_orderlist-frontend
    
    # Check if files exist in nginx
    echo -e "\n${YELLOW}📁 Checking build files in container:${NC}"
    docker exec admin_orderlist-frontend ls -la /usr/share/nginx/html
    
    echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your application should now be accessible at your domain${NC}"
else
    echo -e "${RED}❌ Frontend container failed to start!${NC}"
    echo -e "${RED}📋 Container logs:${NC}"
    docker logs admin_orderlist-frontend
    exit 1
fi

# Optional: Clean up old images
echo -e "\n${YELLOW}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f

echo -e "\n${GREEN}🎉 All done!${NC}"
