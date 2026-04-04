# syntax=docker/dockerfile:1.4
# BuildKit: npm run docker:build (repo root), hoặc ./deploy.sh (server), hoặc DOCKER_BUILDKIT=1 docker compose build
# → cache apt + cache Playwright, bước Chromium không tải lại full mỗi khi layer npm đổi (nếu cache builder còn).

FROM node:20-bookworm-slim

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# `--with-deps`: cài gói hệ thống (apt) + Chromium.
# Mount: tái dùng tarball/browser giữa các lần build; mount apt giảm thời gian install-deps.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/root/.cache/ms-playwright,sharing=locked \
    npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
