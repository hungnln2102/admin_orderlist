FROM node:20-alpine AS base

# Cài đặt postgresql-client (pg_dump) và Chromium cho Puppeteer (Renew Adobe)
RUN apk add --no-cache \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    fontconfig \
    ttf-freefont

# Dùng Chromium của hệ thống thay vì tải qua Puppeteer (tránh ENOENT trong container)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install only the production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source after dependencies are cached
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

# Default command runs the API; the scheduler can reuse this image with a different command
CMD ["node", "index.js"]