FROM node:20-alpine AS base

# --- THÊM DÒNG NÀY ---
# Cài đặt postgresql-client để có lệnh pg_dump cho tính năng backup
RUN apk add --no-cache postgresql-client
# ---------------------

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