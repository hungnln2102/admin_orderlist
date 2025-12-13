Deploying on Ubuntu VPS (Docker)
--------------------------------

Prereqs
- PostgreSQL is already running on the VPS and reachable from Docker (open 5432 only to localhost/private IP, not the internet).
- DNS A record: `admin.mavrykpremium.store` -> `110.172.28.206`.
- Docker and docker compose plugin installed (`sudo apt update && sudo apt install -y docker.io docker-compose-plugin`).

1) Copy code to the VPS
- `git clone <repo> Admin_Orderlist && cd Admin_Orderlist`
- (Optional) remove existing build artifacts: `rm -rf dist`

2) Configure backend env
- `cp backend/.env.example backend/.env`
- Edit `backend/.env`:
  - `DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB_NAME` (if Postgres runs on the host). Replace host with your private IP if Docker cannot reach it.
  - `FRONTEND_ORIGINS=http://admin.mavrykpremium.store,https://admin.mavrykpremium.store`
  - Adjust `CRON_SCHEDULE`, `RUN_CRON_ON_START`, `APP_TIMEZONE` if needed.

3) Allow Docker to reach Postgres on the host
- Ensure Postgres listens on the host IP that Docker containers can reach (e.g. `listen_addresses = '*'` in `postgresql.conf` and `pg_hba.conf` allows the `172.17.0.0/16` docker bridge or `127.0.0.1` if you map it).
- Firewall: allow only the local bridge (172.17.0.0/16) or localhost to hit port 5432.
- The compose file maps `host.docker.internal` to the host gateway, so `host.docker.internal` in `DATABASE_URL` will resolve correctly.

4) Build and run
- `docker compose up -d --build`
- Services:
  - `frontend` (nginx) on port 80 serving the React build and proxying `/api` to the backend.
  - `backend-api` on port 3001.
  - `backend-scheduler` running cron tasks from `scheduler.js`.

5) Verify
- `docker compose ps`
- `docker compose logs -f backend-api`
- `curl http://localhost:3001/health` (if you add a health route) or hit any `/api/...` endpoint.
- Browse to `http://admin.mavrykpremium.store`.

6) TLS (recommend)
- Easiest: run Traefik or Caddy as a reverse proxy to terminate HTTPS and forward to `frontend:80`.
- Quick Caddy example:
  - `docker run -d --name caddy --network admin_orderlist_default -p 80:80 -p 443:443 -v $PWD/Caddyfile:/etc/caddy/Caddyfile caddy`
  - Caddyfile:
    ```
    admin.mavrykpremium.store {
      reverse_proxy frontend:80
    }
    ```
  - This auto-fetches Let's Encrypt certs.

7) Updates
- Pull new code, rebuild: `docker compose pull && docker compose up -d --build`
- Clean old images: `docker image prune -f`
