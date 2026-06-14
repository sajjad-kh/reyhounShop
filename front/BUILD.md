# Build Configuration Guide

This document outlines the production build configuration and optimization strategies for the Glassmorphism E-commerce application.

## Build Scripts

### Development Build
```bash
npm run build:dev
```
- Builds the application in development mode
- Includes source maps for debugging
- No minification or optimization
- Useful for testing build process

### Staging Build
```bash
npm run build:staging
```
- Builds the application for staging environment
- Uses staging environment variables from `.env.staging`
- Includes moderate optimizations
- Enables dev tools for debugging

### Production Build
```bash
npm run build:production
```
- Builds the application for production deployment
- Full optimization and minification
- Removes console logs and debugger statements
- Generates compressed assets (gzip and brotli)
- No source maps for security

### Production Build with Checks
```bash
npm run build:production:check
```
- Runs TypeScript type checking
- Runs ESLint for code quality
- Builds for production
- Recommended before deployment

### Bundle Analysis
```bash
npm run build:analyze
```
- Builds for production
- Generates bundle size visualization at `dist/stats.html`
- Shows gzip and brotli compressed sizes
- Helps identify large dependencies

## Build Optimizations

### Code Splitting
The build configuration implements intelligent code splitting:

- **React Vendor**: React, React DOM, React Router
- **Chart Vendor**: Chart.js and React Chart.js 2
- **UI Vendor**: Lucide React icons
- **API Vendor**: Axios
- **Feature Chunks**: Admin, User, Product, Checkout pages
- **Services**: API services and utilities

### Asset Optimization

#### JavaScript
- **Minification**: Terser with aggressive compression
- **Tree Shaking**: Removes unused code
- **Dead Code Elimination**: Removes unreachable code
- **Console Removal**: Strips console.log in production
- **Variable Mangling**: Shortens variable names

#### CSS
- **Code Splitting**: Separate CSS files per chunk
- **Minification**: cssnano with optimized preset
- **Autoprefixer**: Browser compatibility prefixes
- **Glass Effects Preservation**: Maintains backdrop-filter properties

#### Images
- **Lazy Loading**: Images load on demand
- **Inline Small Assets**: Assets < 4KB inlined as base64
- **Organized Output**: Images in `assets/images/`
- **Content Hash**: Cache-busting with file hashes

### Compression

#### Gzip Compression
- Applied to files > 10KB
- ~70% size reduction
- Widely supported by browsers
- Files: `*.gz`

#### Brotli Compression
- Applied to files > 10KB
- ~80% size reduction (better than gzip)
- Modern browser support
- Files: `*.br`

### Performance Features

#### Module Preloading
- Preloads critical chunks
- Reduces initial load time
- Polyfill included for compatibility

#### Chunk Size Optimization
- Warning threshold: 1000KB
- Intelligent chunk splitting
- Prevents large bundle sizes

#### Modern Browser Target
- ES2020 syntax
- Smaller bundle size
- Better performance
- No legacy polyfills

## Environment Configuration

### Development (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

### Staging (.env.staging)
```env
VITE_API_BASE_URL=https://staging-api.yourdomain.com/api/v1
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=info
```

### Production (.env.production)
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
```

## Build Output Structure

```
dist/
├── index.html                          # Entry HTML
├── assets/
│   ├── js/
│   │   ├── index-[hash].js            # Main entry
│   │   ├── react-vendor-[hash].js     # React libraries
│   │   ├── chart-vendor-[hash].js     # Chart.js
│   │   ├── ui-vendor-[hash].js        # UI components
│   │   ├── api-vendor-[hash].js       # Axios
│   │   ├── vendor-[hash].js           # Other vendors
│   │   ├── admin-[hash].js            # Admin pages
│   │   ├── user-[hash].js             # User pages
│   │   ├── product-[hash].js          # Product pages
│   │   ├── checkout-[hash].js         # Checkout pages
│   │   └── services-[hash].js         # API services
│   ├── css/
│   │   └── index-[hash].css           # Compiled CSS
│   ├── images/
│   │   └── [name]-[hash].[ext]        # Optimized images
│   └── fonts/
│       └── [name]-[hash].[ext]        # Font files
├── manifest.json                       # PWA manifest
├── sw.js                              # Service worker
└── stats.html                         # Bundle analyzer (if generated)
```

## Glassmorphism Optimization

### CSS Custom Properties
Glass effects use CSS custom properties for optimal performance:
- Backdrop filters cached by browser
- Hardware acceleration enabled
- Smooth transitions with GPU

### Animation Performance
- Transform and opacity animations (GPU accelerated)
- Will-change hints for critical animations
- Reduced motion support for accessibility

### Glass Effect Preservation
The build process preserves critical glassmorphism properties:
- `backdrop-filter` and `-webkit-backdrop-filter`
- Transparency and blur values
- Border and shadow definitions
- Gradient backgrounds

## Performance Metrics

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Total Bundle Size**: < 500KB (gzipped)
- **Lighthouse Score**: > 90

### Optimization Checklist
- [x] Code splitting by route and vendor
- [x] Tree shaking and dead code elimination
- [x] CSS minification with cssnano
- [x] Asset compression (gzip + brotli)
- [x] Image optimization and lazy loading
- [x] Console log removal in production
- [x] Source map removal in production
- [x] Modern browser targeting (ES2020)
- [x] Chunk size optimization
- [x] Module preloading

## Deployment Checklist

Before deploying to production:

1. **Environment Variables**
   - [ ] Update `.env.production` with production API URL
   - [ ] Set production payment gateway keys
   - [ ] Disable dev tools
   - [ ] Set log level to 'error'

2. **Code Quality**
   - [ ] Run `npm run typecheck`
   - [ ] Run `npm run lint`
   - [ ] Fix all TypeScript errors
   - [ ] Fix all ESLint warnings

3. **Build**
   - [ ] Run `npm run build:production:check`
   - [ ] Verify build completes without errors
   - [ ] Check bundle sizes in output

4. **Testing**
   - [ ] Test production build locally: `npm run preview:production`
   - [ ] Verify all routes work
   - [ ] Test glassmorphism effects
   - [ ] Check responsive design
   - [ ] Test payment flows

5. **Analysis**
   - [ ] Run `npm run build:analyze`
   - [ ] Review bundle sizes in `dist/stats.html`
   - [ ] Identify large dependencies
   - [ ] Optimize if needed

6. **Deployment**
   - [ ] Upload `dist/` folder to hosting
   - [ ] Configure server for SPA routing
   - [ ] Enable gzip/brotli compression on server
   - [ ] Set proper cache headers
   - [ ] Configure HTTPS
   - [ ] Test production deployment

## Server Configuration

### Nginx Example
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/app/dist;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Enable brotli (if module installed)
    brotli on;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache Example
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## Troubleshooting

### Build Fails
- Check Node.js version (requires 18+ or 20+)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### Large Bundle Size
- Run `npm run build:analyze` to identify large dependencies
- Check for duplicate dependencies
- Consider lazy loading heavy components
- Review imported libraries

### Glass Effects Not Working
- Verify backdrop-filter support in target browsers
- Check CSS custom properties are preserved
- Ensure cssnano isn't removing critical properties
- Test in production build locally

### Performance Issues
- Enable compression on server (gzip/brotli)
- Verify cache headers are set correctly
- Check CDN configuration
- Review Lighthouse report for specific issues

## Additional Resources

- [Vite Build Documentation](https://vitejs.dev/guide/build.html)
- [Rollup Options](https://rollupjs.org/configuration-options/)
- [Terser Options](https://terser.org/docs/api-reference)
- [cssnano Documentation](https://cssnano.co/)
