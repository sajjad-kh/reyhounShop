# Deployment Guide

This guide covers deploying the GlassShop e-commerce application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Monitoring Setup](#monitoring-setup)
- [Post-Deployment](#post-deployment)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Access to production environment
- Environment variables configured
- API backend deployed and accessible
- CDN configured (optional but recommended)
- SSL certificates configured

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.glassshop.com/api/v1
VITE_API_TIMEOUT=15000

# Authentication
VITE_JWT_SECRET_KEY=your-production-jwt-secret
VITE_TOKEN_EXPIRY=24h

# Payment Gateways
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_key
VITE_ZARINPAL_MERCHANT_ID=your-production-merchant-id
VITE_PAYIR_API_KEY=your-production-api-key

# App Configuration
VITE_APP_NAME=GlassShop
VITE_APP_VERSION=1.0.0
VITE_ENABLE_PWA=true

# Production Settings
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error

# Analytics & Monitoring
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=your-analytics-id

# CDN Configuration
VITE_CDN_URL=https://cdn.glassshop.com
```

### Staging Environment

For staging deployments, use `.env.staging` with test credentials and staging URLs.

## Build Process

### 1. Install Dependencies

```bash
npm install --production=false
```

### 2. Run Type Checking

```bash
npm run typecheck
```

### 3. Run Linting

```bash
npm run lint
```

### 4. Build for Production

```bash
npm run build:production
```

This will:
- Compile TypeScript to JavaScript
- Bundle and minify all assets
- Generate optimized chunks
- Create Gzip and Brotli compressed files
- Generate source maps (if configured)
- Output to `dist/` directory

### 5. Verify Build

```bash
npm run preview:production
```

This starts a local server to preview the production build.

## Deployment Options

### Option 1: Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront

```bash
# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### GitHub Pages

```bash
# Build with correct base path
npm run build:production

# Deploy to gh-pages branch
npx gh-pages -d dist
```

### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:production

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and deploy:

```bash
# Build Docker image
docker build -t glassshop:latest .

# Run container
docker run -p 80:80 glassshop:latest
```

### Option 3: Traditional Server

1. Build the application
2. Copy `dist/` folder to server
3. Configure web server (Nginx/Apache)
4. Set up SSL certificates
5. Configure reverse proxy if needed

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name glassshop.com www.glassshop.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name glassshop.com www.glassshop.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/glassshop/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Brotli compression (if available)
    brotli on;
    brotli_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.glassshop.com;" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # Manifest - short cache
    location = /manifest.json {
        add_header Cache-Control "public, max-age=3600";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional)
    location /api/ {
        proxy_pass https://api.glassshop.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring Setup

### 1. Error Tracking

The application includes built-in error tracking. Errors are automatically:
- Logged to console (development)
- Sent to analytics endpoint (production)
- Stored in localStorage for debugging

To integrate with external services (Sentry, Rollbar, etc.):

```typescript
// In src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production',
    tracesSampleRate: 1.0,
  });
}
```

### 2. Performance Monitoring

Performance metrics are automatically tracked:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

Metrics are sent to `/api/v1/analytics/events` endpoint.

### 3. Analytics

User interactions and page views are tracked automatically. Configure your analytics ID in environment variables.

### 4. Health Checks

The application performs periodic health checks:
- API connectivity
- LocalStorage availability
- SessionStorage availability
- Service Worker status
- Network connectivity

Access health status at runtime:

```typescript
import { monitor } from '@/utils/monitoring';

const health = await monitor.performHealthCheck();
console.log(health);
```

### 5. Uptime Monitoring

Set up external uptime monitoring:

**Recommended Services:**
- UptimeRobot
- Pingdom
- StatusCake
- AWS CloudWatch

Monitor these endpoints:
- `https://glassshop.com` - Main application
- `https://api.glassshop.com/health` - API health

## Post-Deployment

### 1. Verify Deployment

- [ ] Application loads correctly
- [ ] All assets load (check Network tab)
- [ ] Service Worker registers successfully
- [ ] API calls work correctly
- [ ] Authentication flow works
- [ ] Payment integration works
- [ ] PWA installation works
- [ ] Mobile responsiveness works
- [ ] All pages accessible

### 2. Performance Testing

Run Lighthouse audit:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://glassshop.com --view
```

Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

### 3. Security Testing

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CSP policy active
- [ ] XSS protection enabled
- [ ] CSRF protection working
- [ ] Input validation working
- [ ] Authentication secure

### 4. Smoke Testing

Test critical user flows:
- [ ] User registration
- [ ] User login
- [ ] Browse products
- [ ] Add to cart
- [ ] Checkout process
- [ ] Payment processing
- [ ] Order confirmation
- [ ] User dashboard
- [ ] Admin panel (if applicable)

### 5. Monitor Initial Traffic

Watch for:
- Error rates
- Performance metrics
- User behavior
- API response times
- Server resources

## Rollback Procedures

### Quick Rollback

If issues are detected:

1. **Revert to previous version:**
   ```bash
   # For Vercel
   vercel rollback
   
   # For Netlify
   netlify rollback
   
   # For S3/CloudFront
   aws s3 sync s3://backup-bucket/ s3://production-bucket/ --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

2. **Notify team and users**

3. **Investigate issues**

4. **Fix and redeploy**

### Gradual Rollout

For safer deployments:

1. Deploy to staging first
2. Test thoroughly
3. Deploy to production with canary release (10% traffic)
4. Monitor metrics
5. Gradually increase traffic
6. Full rollout when stable

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build:production
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_STRIPE_PUBLIC_KEY: ${{ secrets.VITE_STRIPE_PUBLIC_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### Build Fails

- Check Node.js version (18+)
- Clear node_modules and reinstall
- Check for TypeScript errors
- Verify environment variables

### Assets Not Loading

- Check CDN configuration
- Verify base URL in vite.config.ts
- Check CORS headers
- Verify file paths

### Service Worker Issues

- Clear browser cache
- Unregister old service workers
- Check service worker scope
- Verify HTTPS is enabled

### Performance Issues

- Enable compression (Gzip/Brotli)
- Configure CDN
- Optimize images
- Enable caching headers
- Check bundle size

## Support

For deployment issues:
- Check application logs
- Review error tracking dashboard
- Contact DevOps team
- Review documentation

---

**Last Updated:** 2024-11-08
**Version:** 1.0.0
