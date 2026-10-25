# syntax=docker/dockerfile:1.4
# Step 1 - Install deps from package.json only
FROM node:20-alpine AS deps
WORKDIR /app

# Tối ưu npm để build nhanh hơn
ENV npm_config_fund=false \
    npm_config_audit=false \
    npm_config_progress=false

# Copy package files
COPY package*.json ./

# Cài deps với cache tối đa
RUN npm ci --prefer-offline --no-audit --no-fund

# Step 2 - Build app
FROM node:20-alpine AS build
WORKDIR /app

# Tối ưu npm + tránh out-of-memory
ENV npm_config_fund=false \
    npm_config_audit=false \
    npm_config_progress=false \
    NODE_OPTIONS="--max_old_space_size=1024" \
    NODE_ENV=production

# Copy node_modules từ stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build-time API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build frontend for production
RUN echo "Building frontend with VITE_API_BASE_URL=${VITE_API_BASE_URL}" && \
    npm run build

# Step 3 - Serve with Nginx
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx/00-bot-block-maps.conf /etc/nginx/conf.d/00-bot-block-maps.conf
COPY docker/nginx/snippets/bot-block-locations.conf /etc/nginx/snippets/bot-block-locations.conf
COPY docker/nginx/snippets/deny-ips.conf /etc/nginx/snippets/deny-ips.conf
COPY docker/frontend-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
