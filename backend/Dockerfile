# syntax=docker/dockerfile:1.4
# Backend Production Dockerfile (Node 20 Bookworm Slim + PG Client 16 + Playwright Chromium)

FROM node:20-bookworm-slim

# Cài đặt postgresql-client-16 phục vụ sao lưu tự động Google Drive
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget gnupg \
  && wget -qO /tmp/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  && gpg --dearmor -o /usr/share/keyrings/postgresql.gpg /tmp/pgdg.asc \
  && rm /tmp/pgdg.asc \
  && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Cài đặt Chromium cho Playwright (mở kho tự động và kiểm tra dịch vụ)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    npx playwright install --with-deps chromium \
 && if [ -d /root/.cache/ms-playwright/chromium-1248 ] && [ ! -e /root/.cache/ms-playwright/chromium-1208 ]; then \
      ln -s /root/.cache/ms-playwright/chromium-1248 /root/.cache/ms-playwright/chromium-1208; \
    fi \
 && if [ -d /root/.cache/ms-playwright/chromium_headless_shell-1248 ] && [ ! -e /root/.cache/ms-playwright/chromium_headless_shell-1208 ]; then \
      ln -s /root/.cache/ms-playwright/chromium_headless_shell-1248 /root/.cache/ms-playwright/chromium_headless_shell-1208; \
    fi \
 && if [ -d /root/.cache/ms-playwright/ffmpeg-1013 ] && [ ! -e /root/.cache/ms-playwright/ffmpeg-1011 ]; then \
      ln -s /root/.cache/ms-playwright/ffmpeg-1013 /root/.cache/ms-playwright/ffmpeg-1011; \
    fi

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "-r", "module-alias/register", "src/server.js"]
