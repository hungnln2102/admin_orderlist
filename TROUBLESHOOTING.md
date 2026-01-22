# Troubleshooting Guide

This document helps you diagnose and fix common deployment issues with the Admin Orderlist application.

## 🔍 Blank/White Page After Deployment

### Symptoms
- Page loads but shows only a white/blank screen
- No visible errors in the browser
- Application works fine locally but not on server

### Diagnosis Steps

#### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab:

```
Right-click → Inspect → Console tab
```

**Common errors to look for:**
- `Failed to load module` - Asset path issues
- `Uncaught SyntaxError` - Build configuration issues
- `CORS error` - API endpoint configuration issues
- `404 Not Found` for JS/CSS files - nginx configuration issues

#### 2. Check Network Tab
In DevTools, go to Network tab and refresh the page:

```
DevTools → Network tab → Refresh page (Ctrl+Shift+R)
```

**What to check:**
- ✅ `index.html` should load with status 200
- ✅ All JS files in `/assets/` should load with status 200
- ✅ All CSS files in `/assets/` should load with status 200
- ❌ Any 404 errors indicate missing files or wrong paths

#### 3. Verify Build Output
SSH into your server and check the build files:

```bash
# Check if dist folder exists and has content
docker exec admin_orderlist-frontend ls -la /usr/share/nginx/html

# Expected output:
# - index.html
# - assets/ (folder with JS and CSS files)
```

#### 4. Check Docker Logs
View container logs for build or runtime errors:

```bash
# Check frontend container logs
docker logs admin_orderlist-frontend

# Check for build errors
docker logs admin_orderlist-frontend 2>&1 | grep -i error
```

### Common Fixes

#### Fix 1: Clear Browser Cache
Sometimes old cached files cause issues:

```
Ctrl + Shift + Delete → Clear cached images and files
Or use Incognito/Private mode
```

#### Fix 2: Rebuild Frontend Container
Force a fresh build:

```bash
# Stop and remove old container
docker-compose down frontend

# Rebuild without cache
docker-compose build --no-cache frontend

# Start container
docker-compose up -d frontend
```

#### Fix 3: Check Environment Variables
Verify API URL is correct:

```bash
# Check docker-compose.yml
cat docker-compose.yml | grep VITE_API_BASE_URL

# Should match your actual API endpoint
```

#### Fix 4: Verify Nginx Configuration
Check nginx config is correct:

```bash
# View nginx config
docker exec admin_orderlist-frontend cat /etc/nginx/conf.d/default.conf

# Test nginx config
docker exec admin_orderlist-frontend nginx -t
```

---

## 🔌 API Connection Issues

### Symptoms
- Frontend loads but API calls fail
- "Network Error" in console
- CORS errors

### Diagnosis Steps

#### 1. Check API Endpoint
In browser console, check what URL the frontend is calling:

```javascript
// In DevTools Console, run:
console.log(import.meta.env.VITE_API_BASE_URL)
```

#### 2. Test API Directly
Try accessing the API directly:

```bash
# From your local machine
curl https://admin.mavrykpremium.store/api/health

# Should return a response, not 404 or connection error
```

#### 3. Check Backend Container
Verify backend is running:

```bash
# Check if backend container is running
docker ps | grep backend

# Check backend logs
docker logs admin_orderlist-backend
```

### Common Fixes

#### Fix 1: Update API Base URL
Edit `docker-compose.yml`:

```yaml
frontend:
  build:
    args:
      VITE_API_BASE_URL: https://your-actual-domain.com
```

Then rebuild:

```bash
docker-compose build frontend
docker-compose up -d frontend
```

#### Fix 2: Check Nginx Proxy
Verify nginx is proxying `/api` requests to backend:

```bash
# Test from inside frontend container
docker exec admin_orderlist-frontend wget -O- http://backend:3001/api/health
```

---

## 🐳 Docker Build Issues

### Symptoms
- Build fails with errors
- Container exits immediately after starting
- Out of memory errors

### Diagnosis Steps

#### 1. Check Build Logs
```bash
docker-compose build frontend 2>&1 | tee build.log
```

#### 2. Check Container Status
```bash
docker ps -a | grep frontend
```

### Common Fixes

#### Fix 1: Increase Docker Memory
Edit Docker Desktop settings:
- Settings → Resources → Memory → Increase to 4GB+

#### Fix 2: Clean Docker Cache
```bash
# Remove old images and cache
docker system prune -a

# Rebuild
docker-compose build --no-cache frontend
```

---

## 📝 Quick Diagnostic Script

Run this script to collect diagnostic information:

```bash
#!/bin/bash
echo "=== Docker Containers ==="
docker ps -a

echo -e "\n=== Frontend Container Logs (last 50 lines) ==="
docker logs --tail 50 admin_orderlist-frontend

echo -e "\n=== Frontend Build Files ==="
docker exec admin_orderlist-frontend ls -la /usr/share/nginx/html

echo -e "\n=== Nginx Config Test ==="
docker exec admin_orderlist-frontend nginx -t

echo -e "\n=== Backend Health ==="
docker exec admin_orderlist-frontend wget -O- http://backend:3001/api/health 2>&1
```

Save as `diagnose.sh`, make executable with `chmod +x diagnose.sh`, and run with `./diagnose.sh`.

---

## 🆘 Still Having Issues?

If none of the above fixes work:

1. **Check the uploaded screenshot** - Look at browser DevTools Console and Network tabs
2. **Collect logs** - Run the diagnostic script above
3. **Check recent changes** - What was the last thing that worked?
4. **Test locally** - Does `npm run build && npm run preview` work locally?

### Local Testing
Before deploying, always test the production build locally:

```bash
cd frontend

# Build for production
npm run build

# Preview the production build
npm run preview

# Open http://localhost:4173 and test
```

If it works locally but not on server, the issue is likely:
- Environment variables
- nginx configuration
- Docker build process
- Network/firewall issues
