import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProvider } from './context';
import { initializeOptimizations } from './utils/buildOptimizations';
import { initializeConfig } from './utils/config';
import { initializeSecurity, validateSecurityConfig } from './utils/securityInit';
import { registerServiceWorker } from './utils/serviceWorker';
import { analytics } from './utils/analytics';
import { errorTracker } from './utils/errorTracking';
import { reportWebVitals } from './utils/performance';
import './index.css';

// Initialize security features first
initializeSecurity();

// Validate security configuration
const securityStatus = validateSecurityConfig();
if (!securityStatus.isValid) {
  console.error('Security configuration errors:', securityStatus.errors);
}
if (securityStatus.warnings.length > 0) {
  console.warn('Security configuration warnings:', securityStatus.warnings);
}

// Initialize configuration and validate environment variables
initializeConfig();

// Initialize build optimizations for glass effects and performance
initializeOptimizations();

// Initialize monitoring and analytics in production
if (import.meta.env.PROD) {
  // Initialize error tracking
  errorTracker.initialize();

  // Register service worker for PWA functionality
  if (import.meta.env.VITE_ENABLE_PWA === 'true') {
    registerServiceWorker({
      onSuccess: () => {
        console.log('Service Worker registered successfully');
        analytics.trackEvent({
          category: 'PWA',
          action: 'Service Worker Registered',
          timestamp: Date.now(),
        });
      },
      onUpdate: () => {
        console.log('New content available; please refresh.');
        // Notify user about update
        window.dispatchEvent(
          new CustomEvent('swUpdate', { detail: { updateAvailable: true } })
        );
      },
      onError: (error) => {
        console.error('Service Worker registration failed:', error);
        errorTracker.captureError(error, {
          component: 'ServiceWorker',
          action: 'Registration',
        });
      },
    });
  }

  // Report web vitals to analytics
  reportWebVitals((metrics) => {
    analytics.trackPerformance(metrics);
  });

  // Track initial page view
  analytics.trackPageView();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
