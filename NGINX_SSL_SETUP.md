# Setup Nginx with SSL (Removing Caddy)

## Overview

This guide will help you remove Caddy and setup nginx directly with SSL certificates from Let's Encrypt.

## Prerequisites

- Root access to your server
- Domain pointing to your server IP
- Ports 80 and 443 open

## Quick Setup (Automated)

### Step 1: Upload Files to Server

Upload these new files to your server:
- `docker-compose.yml` (updated)
- `nginx/nginx.conf`
- `nginx/conf.d/default.conf`
- `setup-nginx-ssl.sh`

### Step 2: Run Setup Script

```bash
cd ~/admin_orderlist
chmod +x setup-nginx-ssl.sh
sudo ./setup-nginx-ssl.sh
```

The script will:
1. Stop and remove Caddy
2. Create nginx directories
3. Install Certbot (if needed)
4. Get SSL certificates from Let's Encrypt
5. Start nginx with SSL
6. Setup auto-renewal

## Manual Setup (If Automated Fails)

### Step 1: Stop Caddy

```bash
docker-compose --profile caddy down caddy
docker rm -f admin_orderlist-caddy
```

### Step 2: Create Directories

```bash
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
```

### Step 3: Install Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot
```

### Step 4: Get SSL Certificate

```bash
# Stop all containers first
docker-compose down

# Get certificate
sudo certbot certonly --standalone \
    --preferred-challenges http \
    -d admin.mavrykpremium.store \
    --email your-email@example.com \
    --agree-tos
```

### Step 5: Copy Certificates

```bash
sudo cp /etc/letsencrypt/live/admin.mavrykpremium.store/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/admin.mavrykpremium.store/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

### Step 6: Start Services

```bash
docker-compose up -d
```

### Step 7: Verify

```bash
# Check if nginx is running
docker ps | grep nginx

# Check nginx logs
docker logs admin_orderlist-nginx

# Test HTTPS
curl -I https://admin.mavrykpremium.store
```

## SSL Auto-Renewal

Add this to crontab to auto-renew certificates:

```bash
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/admin.mavrykpremium.store/*.pem /root/admin_orderlist/nginx/ssl/ && docker-compose -f /root/admin_orderlist/docker-compose.yml restart nginx"
```

## Troubleshooting

### Issue: Certificate not found

**Solution:** Make sure domain points to your server and ports 80/443 are open:

```bash
# Check DNS
nslookup admin.mavrykpremium.store

# Check ports
sudo netstat -tulpn | grep -E ':(80|443)'
```

### Issue: Nginx won't start

**Solution:** Check nginx config syntax:

```bash
docker run --rm -v $(pwd)/nginx:/etc/nginx nginx:alpine nginx -t
```

### Issue: Still getting blank page

**Solution:** Check if files are being served:

```bash
# Test from inside nginx container
docker exec admin_orderlist-nginx wget -O- http://frontend:80/

# Check nginx access logs
docker logs admin_orderlist-nginx | grep GET
```

## Architecture

```
Internet
    ↓
Nginx (Port 443 - SSL)
    ↓
Frontend Container (Port 80)
    ↓
React App
```

## Files Created

- `docker-compose.yml` - Updated without Caddy
- `nginx/nginx.conf` - Main nginx config
- `nginx/conf.d/default.conf` - Server config with SSL
- `nginx/ssl/` - SSL certificates directory
- `setup-nginx-ssl.sh` - Automated setup script

## Benefits of This Setup

1. **Simpler architecture** - One less container to manage
2. **Better performance** - Direct nginx → frontend (no double proxy)
3. **Easier debugging** - Standard nginx logs and configuration
4. **More control** - Full access to nginx configuration
5. **Industry standard** - nginx is widely used and documented

## Next Steps After Setup

1. Clear browser cache (Ctrl+Shift+Delete)
2. Visit https://admin.mavrykpremium.store
3. Check browser console for any errors
4. Monitor nginx logs: `docker logs -f admin_orderlist-nginx`
