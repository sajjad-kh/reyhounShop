# Multi-stage Dockerfile for GlassShop E-commerce
# Optimized for production deployment

# Stage 1: Build
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build application
ARG VITE_API_BASE_URL
ARG VITE_API_TIMEOUT
ARG VITE_JWT_SECRET_KEY
ARG VITE_TOKEN_EXPIRY
ARG VITE_STRIPE_PUBLIC_KEY
ARG VITE_ZARINPAL_MERCHANT_ID
ARG VITE_PAYIR_API_KEY
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_ENABLE_PWA
ARG VITE_ENABLE_DEVTOOLS
ARG VITE_LOG_LEVEL
ARG VITE_ENABLE_ANALYTICS
ARG VITE_ANALYTICS_ID
ARG VITE_CDN_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_TIMEOUT=$VITE_API_TIMEOUT
ENV VITE_JWT_SECRET_KEY=$VITE_JWT_SECRET_KEY
ENV VITE_TOKEN_EXPIRY=$VITE_TOKEN_EXPIRY
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV VITE_ZARINPAL_MERCHANT_ID=$VITE_ZARINPAL_MERCHANT_ID
ENV VITE_PAYIR_API_KEY=$VITE_PAYIR_API_KEY
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA
ENV VITE_ENABLE_DEVTOOLS=$VITE_ENABLE_DEVTOOLS
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL
ENV VITE_ENABLE_ANALYTICS=$VITE_ENABLE_ANALYTICS
ENV VITE_ANALYTICS_ID=$VITE_ANALYTICS_ID
ENV VITE_CDN_URL=$VITE_CDN_URL

RUN npm run build:production

# Stage 2: Production
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
