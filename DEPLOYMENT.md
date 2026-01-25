# Deployment Guide

This guide explains how to deploy the **Admin Orderlist** application to a VPS using Docker.

## Prerequisites

1.  **VPS** with [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.
2.  **SSH Access** to the VPS.
3.  **Environment Variables**: You need `.env` files for backend and database.

## Method 1: Manual Deployment (Recommended)

1.  **Clone the repository** on your VPS:
    ```bash
    git clone <your-repo-url> admin_store
    cd admin_store
    ```
    *(Or copy your project files manually if not using a remote git repo)*

2.  **Setup Environment Variables**:
    Create or copy `.env` files in `backend/` and `database/` (if needed).
    Ensure `backend/.env.docker` exists as referenced in `docker-compose.yml`.

3.  **Run with Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```

    This command will:
    - Build the Frontend, Backend, Database, and Caddy (TLS) containers.
    - Start them in detached mode (`-d`).
    - Restart them automatically if they crash (`restart: always` is set).

## Method 2: Use the `deploy.sh` script

I have created a `deploy.sh` script in the root directory. You can use it from your local machine (Git Bash).

Usage:
```bash
./deploy.sh <user> <host> <remote_dir>
```

Example:
```bash
./deploy.sh root 123.45.67.89 /var/www/admin_store
```

**Note**: This script uses `scp` to copy files. It excludes `node_modules` to save time.

## Unified Nginx (chung port 80 với Website)

Khi chạy chung với **Website** qua **Host Nginx** (một Nginx trên máy listen 80/443):

- **Admin Orderlist** không chạy container Nginx. Chỉ postgres, backend (3001 + 5000), frontend (8081).
- Host Nginx (cấu hình từ `../Website/nginx-server.conf`) proxy `admin.mavrykpremium.store` tới 8081, 3001, 5000.
- Deploy: `./deploy.sh` (trong thư mục `admin_orderlist`). Chi tiết xem `../Website/DEPLOY_NGINX.md`.

## Verify Deployment

- **Frontend**: https://admin.mavrykpremium.store (qua Host Nginx) hoặc http://localhost:8081
- **Backend API**: http://localhost:3001 | Webhook: http://localhost:5000
- **Database**: Port 5432
