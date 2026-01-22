#!/bin/bash

# Setup script for nginx with SSL using Certbot
# This script will:
# 1. Stop Caddy
# 2. Setup nginx reverse proxy
# 3. Get SSL certificates from Let's Encrypt
# 4. Start nginx with SSL

set -e

echo "🔧 Setting up nginx with SSL (removing Caddy)..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Stop and remove Caddy
echo -e "${YELLOW}Step 1: Stopping Caddy...${NC}"
docker-compose --profile caddy down caddy 2>/dev/null || true
docker rm -f admin_orderlist-caddy 2>/dev/null || true

# Step 2: Create nginx directories
echo -e "${YELLOW}Step 2: Creating nginx directories...${NC}"
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
mkdir -p nginx/certbot/www

# Step 3: Install Certbot (if not installed)
echo -e "${YELLOW}Step 3: Checking Certbot installation...${NC}"
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Step 4: Stop nginx temporarily to get certificates
echo -e "${YELLOW}Step 4: Getting SSL certificates...${NC}"
docker-compose down nginx 2>/dev/null || true

# Get SSL certificate using standalone mode
certbot certonly --standalone \
    --preferred-challenges http \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d admin.mavrykpremium.store

# Step 5: Copy certificates to nginx ssl directory
echo -e "${YELLOW}Step 5: Copying SSL certificates...${NC}"
cp /etc/letsencrypt/live/admin.mavrykpremium.store/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/admin.mavrykpremium.store/privkey.pem nginx/ssl/
chmod 644 nginx/ssl/*.pem

# Step 6: Start services with new docker-compose
echo -e "${YELLOW}Step 6: Starting services with nginx...${NC}"
docker-compose up -d

# Step 7: Check if nginx is running
sleep 3
if docker ps | grep -q "admin_orderlist-nginx"; then
    echo -e "${GREEN}✅ Nginx is running with SSL!${NC}"
    docker logs --tail 20 admin_orderlist-nginx
else
    echo -e "${RED}❌ Nginx failed to start${NC}"
    docker logs admin_orderlist-nginx
    exit 1
fi

# Step 8: Setup auto-renewal
echo -e "${YELLOW}Step 8: Setting up SSL auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renew << 'EOF'
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/admin.mavrykpremium.store/*.pem /root/admin_orderlist/nginx/ssl/ && docker-compose -f /root/admin_orderlist/docker-compose.yml restart nginx"
EOF

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}Your site should now be accessible at https://admin.mavrykpremium.store${NC}"
echo -e "${YELLOW}Note: SSL certificates will auto-renew every 3 months${NC}"
