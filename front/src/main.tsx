import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './context';
import './index.css';

import {
  initializeSecurity,
  validateSecurityConfig,
} from './utils/securityInit';
import { initializeConfig } from './utils/config';
import { initializeOptimizations } from './utils/buildOptimizations';

// New imports
import { registerServiceWorker } from './utils/serviceWorker';
import { analytics } from './utils/analytics';
import { errorTracker } from './utils/errorTracking';
import { reportWebVitals } from './utils/performance';

// ------------------------
// Initialize Security
// ------------------------
initializeSecurity();

const securityStatus = validateSecurityConfig();

if (!securityStatus.isValid) {
  console.error('Security configuration errors:', securityStatus.errors);
}

if (securityStatus.warnings.length > 0) {
  console.warn('Security configuration warnings:', securityStatus.warnings);
}

// ------------------------
// Initialize Config
// ------------------------
initializeConfig();

// ------------------------
// Initialize Optimizations
// ------------------------
initializeOptimizations();

// ------------------------
// Production Only
// ------------------------
if (import.meta.env.PROD) {
  errorTracker.initialize();

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
        window.dispatchEvent(
          new CustomEvent('swUpdate', {
            detail: { updateAvailable: true },
          })
        );
      },
      onError: (error) => {
        console.error(error);
      },
    });
  }

  reportWebVitals((metrics) => {
    analytics.trackPerformance(metrics);
  });

  analytics.trackPageView();
}

// ------------------------
// Render App
// ------------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);