# Monitoring and Analytics Guide

This document describes the monitoring, analytics, and error tracking systems implemented in the GlassShop application.

## Overview

The application includes comprehensive monitoring capabilities:

- **Performance Monitoring**: Track Core Web Vitals and performance metrics
- **Error Tracking**: Capture and log errors with context
- **Analytics**: Track user interactions and page views
- **Health Checks**: Monitor application and API health
- **System Monitoring**: Track memory usage and system information

## Components

### 1. Performance Monitoring

Located in `src/utils/performance.ts`

**Features:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)
- Resource timing
- Navigation timing

**Usage:**

```typescript
import { measurePerformance, reportWebVitals } from '@/utils/performance';

// Measure current performance
const metrics = measurePerformance();

// Report web vitals
reportWebVitals((metrics) => {
  console.log('Performance metrics:', metrics);
});
```

### 2. Error Tracking

Located in `src/utils/errorTracking.ts`

**Features:**
- Automatic error capture
- Error severity levels
- Error context and metadata
- Error statistics
- Error export functionality

**Usage:**

```typescript
import { captureError, captureException, ErrorSeverity } from '@/utils/errorTracking';

// Capture an error
try {
  // Some code
} catch (error) {
  captureException(error, {
    component: 'ProductPage',
    action: 'Load Product',
    userId: user.id,
  });
}

// Capture a message
captureError('Something went wrong', {
  component: 'Checkout',
  action: 'Process Payment',
}, ErrorSeverity.HIGH);
```

### 3. Analytics

Located in `src/utils/analytics.ts`

**Features:**
- Event tracking
- Page view tracking
- User action tracking
- Conversion tracking
- Performance tracking
- Automatic error tracking

**Usage:**

```typescript
import { trackEvent, trackPageView, trackUserAction, trackConversion } from '@/utils/analytics';

// Track an event
trackEvent('Product', 'View', 'Product ID: 123', 1);

// Track page view
trackPageView('/products/123', 'Product Name');

// Track user action
trackUserAction('Add to Cart', 'Product ID: 123', 1);

// Track conversion
trackConversion('Purchase', 99.99);
```

### 4. Application Monitoring

Located in `src/utils/monitoring.ts`

**Features:**
- Health checks (API, storage, service worker, network)
- System information collection
- Memory usage tracking
- Resource timing
- Navigation timing

**Usage:**

```typescript
import { monitor } from '@/utils/monitoring';

// Perform health check
const health = await monitor.performHealthCheck();
console.log('Health status:', health.status);

// Get system info
const systemInfo = monitor.getSystemInfo();
console.log('System info:', systemInfo);

// Get memory usage
const memory = monitor.getMemoryUsage();
console.log('Memory usage:', memory);
```

## Monitoring Dashboard

A monitoring dashboard component is available for administrators to view real-time metrics.

**Location:** `src/components/MonitoringDashboard.tsx`

**Features:**
- Real-time health status
- Error statistics
- System information
- Memory usage visualization
- Manual refresh and data export

**Usage:**

```typescript
import { MonitoringDashboard } from '@/components/MonitoringDashboard';

// In your admin routes
<Route path="/admin/monitoring" element={<MonitoringDashboard />} />
```

## Configuration

### Environment Variables

```bash
# Enable analytics in production
VITE_ENABLE_ANALYTICS=true

# Analytics tracking ID
VITE_ANALYTICS_ID=your-analytics-id

# Log level (debug, info, warn, error)
VITE_LOG_LEVEL=error
```

### Initialization

Monitoring is automatically initialized in `src/main.tsx` for production builds:

```typescript
if (import.meta.env.PROD) {
  // Initialize error tracking
  errorTracker.initialize();

  // Report web vitals
  reportWebVitals((metrics) => {
    analytics.trackPerformance(metrics);
  });

  // Track initial page view
  analytics.trackPageView();
}
```

## API Endpoints

The monitoring system sends data to the following endpoints:

### Analytics Events
```
POST /api/v1/analytics/events
```

**Payload:**
```json
[
  {
    "category": "User Action",
    "action": "Add to Cart",
    "label": "Product ID: 123",
    "value": 1,
    "timestamp": 1699459200000,
    "userId": "user123",
    "sessionId": "session456"
  }
]
```

### Error Tracking
```
POST /api/v1/analytics/errors
```

**Payload:**
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "url": "https://glassshop.com/products/123",
  "timestamp": 1699459200000,
  "userId": "user123",
  "sessionId": "session456",
  "userAgent": "Mozilla/5.0..."
}
```

## Integration with External Services

### Sentry Integration

```typescript
// In src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production',
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
  });
}
```

### Google Analytics Integration

```typescript
// In src/utils/analytics.ts
import ReactGA from 'react-ga4';

if (import.meta.env.VITE_ANALYTICS_ID) {
  ReactGA.initialize(import.meta.env.VITE_ANALYTICS_ID);
}
```

## Performance Thresholds

### Core Web Vitals

- **FCP (First Contentful Paint)**: < 1.8s (Good), < 3s (Needs Improvement)
- **LCP (Largest Contentful Paint)**: < 2.5s (Good), < 4s (Needs Improvement)
- **FID (First Input Delay)**: < 100ms (Good), < 300ms (Needs Improvement)
- **CLS (Cumulative Layout Shift)**: < 0.1 (Good), < 0.25 (Needs Improvement)
- **TTFB (Time to First Byte)**: < 800ms (Good), < 1800ms (Needs Improvement)

### Error Thresholds

- **Critical Errors**: Immediate alert
- **High Errors**: Alert if > 10 per hour
- **Medium Errors**: Alert if > 50 per hour
- **Low Errors**: Monitor only

## Alerts and Notifications

### Health Check Alerts

The system performs health checks every minute and alerts when:
- API is unreachable
- Storage is unavailable
- Service worker fails
- Network is offline

### Performance Alerts

Alerts are triggered when:
- FCP > 3s
- LCP > 4s
- CLS > 0.25
- Memory usage > 90%

### Error Alerts

Alerts are triggered when:
- Critical errors occur
- Error rate exceeds threshold
- Suspicious activity detected

## Debugging

### View Errors in Console

In development mode, all errors are logged to the console:

```typescript
if (import.meta.env.DEV) {
  console.error('[Tracked Error]', error);
}
```

### Export Errors

Use the monitoring dashboard to export errors as JSON:

```typescript
const errors = errorTracker.exportErrors();
// Download as JSON file
```

### View Performance Metrics

Open browser DevTools:
1. Go to Performance tab
2. Record a session
3. View Core Web Vitals in the summary

### Health Check Status

Access the health check endpoint:

```bash
curl https://glassshop.com/health
```

## Best Practices

1. **Track Important Events**: Focus on user actions that matter
2. **Add Context**: Include relevant context with errors
3. **Set Appropriate Severity**: Use correct severity levels
4. **Monitor Regularly**: Check monitoring dashboard daily
5. **Act on Alerts**: Respond to critical alerts immediately
6. **Review Metrics**: Weekly review of performance metrics
7. **Clean Up Data**: Regularly clear old errors and logs
8. **Test Monitoring**: Verify monitoring works in staging

## Troubleshooting

### Analytics Not Working

1. Check environment variables are set
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Verify analytics is enabled in production

### Errors Not Being Tracked

1. Check error tracker is initialized
2. Verify error tracking endpoint
3. Check browser console for errors
4. Test with manual error capture

### Performance Metrics Missing

1. Check browser supports Performance API
2. Verify PerformanceObserver is available
3. Check for browser extensions blocking
4. Test in different browsers

### Health Checks Failing

1. Verify API endpoint is accessible
2. Check network connectivity
3. Verify storage permissions
4. Check service worker registration

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Error Handling Best Practices](https://web.dev/error-handling/)
- [Analytics Best Practices](https://web.dev/analytics/)

---

**Last Updated:** 2024-11-08
**Version:** 1.0.0
