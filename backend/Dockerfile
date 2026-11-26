# syntax=docker/dockerfile:1.4
# Backend Production Dockerfile (Node 20 Bookworm Slim + PG Client 16 + Playwright Chromium)

FROM node:22-bookworm-slim

# Cài đặt postgresql-client-16 phục vụ sao lưu tự động Google Drive
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget gnupg \
  && wget -qO /tmp/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  && gpg --dearmor -o /usr/share/keyrings/postgresql.gpg /tmp/pgdg.asc \
  && rm /tmp/pgdg.asc \
  && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 xvfb x11vnc xauth novnc python3-venv util-linux \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/warehouse-viewer \
  && /opt/warehouse-viewer/bin/pip install --no-cache-dir websockify==0.12.0
ENV PATH="/opt/warehouse-viewer/bin:${PATH}"

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package*.json ./
RUN npm ci --omit=dev

# Cài đặt Chromium cho Playwright (mở kho tự động và kiểm tra dịch vụ)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    npx playwright install --with-deps chromium \
 && if [ -d /ms-playwright/chromium-1248 ] && [ ! -e /ms-playwright/chromium-1208 ]; then \
      ln -s /ms-playwright/chromium-1248 /ms-playwright/chromium-1208; \
    fi \
 && if [ -d /ms-playwright/chromium_headless_shell-1248 ] && [ ! -e /ms-playwright/chromium_headless_shell-1208 ]; then \
      ln -s /ms-playwright/chromium_headless_shell-1248 /ms-playwright/chromium_headless_shell-1208; \
    fi \
 && if [ -d /ms-playwright/ffmpeg-1013 ] && [ ! -e /ms-playwright/ffmpeg-1011 ]; then \
      ln -s /ms-playwright/ffmpeg-1013 /ms-playwright/ffmpeg-1011; \
    fi

COPY . .
COPY --chmod=755 warehouse-chromium.sh /usr/local/bin/warehouse-chromium

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "-r", "module-alias/register", "src/server.js"]
