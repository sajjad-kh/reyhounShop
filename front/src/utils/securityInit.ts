/**
 * Security Initialization
 * Initialize security features on application startup
 */

import { preventClickjacking, validateCSP } from './security';
import { securityMonitor } from './securityMonitor';

/**
 * Initialize all security features
 */
export const initializeSecurity = (): void => {
    // Prevent clickjacking attacks
    preventClickjacking();

    // Validate CSP is configured
    if (!validateCSP()) {
        console.warn('Content Security Policy not configured. Application may be vulnerable to XSS attacks.');
    }

    // Initialize security monitoring
    securityMonitor.setupVisibilityMonitoring();

    // Disable right-click in production (optional - can be removed if not desired)
    if (import.meta.env.PROD) {
        document.addEventListener('contextmenu', (e) => {
            // Allow right-click on input fields for usability
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            e.preventDefault();
        });
    }

    // Disable text selection on sensitive elements (optional)
    if (import.meta.env.PROD) {
        document.addEventListener('selectstart', (e) => {
            // Allow selection in input fields and content areas
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.getAttribute('data-selectable') === 'true'
            ) {
                return;
            }
        });
    }

    // Clear sensitive data on page unload
    window.addEventListener('beforeunload', () => {
        // Clear any temporary sensitive data from memory
        // This is a placeholder - implement based on your needs
        if (sessionStorage.getItem('temp_sensitive_data')) {
            sessionStorage.removeItem('temp_sensitive_data');
        }
    });

    // Detect and warn about browser extensions that might interfere
    if (import.meta.env.DEV) {
        detectBrowserExtensions();
    }

    // Set up security event listeners
    setupSecurityEventListeners();

    console.log('Security features initialized');
};

/**
 * Detect potentially interfering browser extensions
 */
const detectBrowserExtensions = (): void => {
    // Check for common extension indicators
    const hasExtensions =
        document.documentElement.hasAttribute('data-extension') ||
        document.documentElement.hasAttribute('data-darkreader') ||
        window.hasOwnProperty('chrome') && (window as any).chrome?.runtime;

    if (hasExtensions) {
        console.info('Browser extensions detected. Some features may be affected.');
    }
};

/**
 * Set up security-related event listeners
 */
const setupSecurityEventListeners = (): void => {
    // Listen for visibility changes to pause sensitive operations
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden - pause sensitive operations
            window.dispatchEvent(new CustomEvent('securityPause'));
        } else {
            // Page is visible - resume operations
            window.dispatchEvent(new CustomEvent('securityResume'));
        }
    });

    // Listen for focus changes
    window.addEventListener('blur', () => {
        // Window lost focus
        window.dispatchEvent(new CustomEvent('securityBlur'));
    });

    window.addEventListener('focus', () => {
        // Window gained focus
        window.dispatchEvent(new CustomEvent('securityFocus'));
    });

    // Detect developer tools (basic detection)
    if (import.meta.env.PROD) {
        const devtools = { isOpen: false };
        const threshold = 160;

        setInterval(() => {
            if (
                window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold
            ) {
                if (!devtools.isOpen) {
                    devtools.isOpen = true;
                    console.warn('Developer tools detected');
                }
            } else {
                devtools.isOpen = false;
            }
        }, 1000);
    }
};

/**
 * Validate security configuration
 */
export const validateSecurityConfig = (): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
} => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if HTTPS is used in production
    if (import.meta.env.PROD && window.location.protocol !== 'https:') {
        errors.push('Application must be served over HTTPS in production');
    }

    // Check if CSP is configured
    if (!validateCSP()) {
        warnings.push('Content Security Policy not configured');
    }

    // Check if secure storage is available
    if (!window.crypto || !window.crypto.getRandomValues) {
        errors.push('Secure random number generation not available');
    }

    // Check if localStorage is available
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        warnings.push('localStorage not available - some features may not work');
    }

    // Check if sessionStorage is available
    try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
    } catch (e) {
        warnings.push('sessionStorage not available - some features may not work');
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
    };
};

/**
 * Get security status
 */
export const getSecurityStatus = (): {
    cspEnabled: boolean;
    httpsEnabled: boolean;
    secureContext: boolean;
    cookiesEnabled: boolean;
} => {
    return {
        cspEnabled: validateCSP(),
        httpsEnabled: window.location.protocol === 'https:',
        secureContext: window.isSecureContext,
        cookiesEnabled: navigator.cookieEnabled,
    };
};

export default {
    initializeSecurity,
    validateSecurityConfig,
    getSecurityStatus,
};
