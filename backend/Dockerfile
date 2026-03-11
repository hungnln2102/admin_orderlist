FROM ghcr.io/puppeteer/puppeteer:latest

# Cài đặt postgresql-client (pg_dump) cho backup DB
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
USER pptruser

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