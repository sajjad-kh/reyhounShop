import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './context';
import './index.css';
import {initializeSecurity,validateSecurityConfig} from './utils/securityInit';
import { initializeConfig } from './utils/config';
import { initializeOptimizations } from './utils/buildOptimizations';

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
// Render App
// ------------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);