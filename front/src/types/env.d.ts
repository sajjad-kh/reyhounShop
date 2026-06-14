/// <reference types="vite/client" />

/**
 * Environment variable type definitions
 * Provides type safety for environment variables
 */

interface ImportMetaEnv {
    // API Configuration
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_TIMEOUT: string;

    // Authentication
    readonly VITE_JWT_SECRET_KEY: string;
    readonly VITE_TOKEN_EXPIRY: string;

    // Payment Gateways
    readonly VITE_STRIPE_PUBLIC_KEY: string;
    readonly VITE_ZARINPAL_MERCHANT_ID: string;
    readonly VITE_PAYIR_API_KEY: string;

    // App Configuration
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;
    readonly VITE_ENABLE_PWA: string;

    // Development Settings
    readonly VITE_ENABLE_DEVTOOLS: string;
    readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

    // Build flags
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    readonly MODE: 'development' | 'staging' | 'production';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Global type augmentation
declare global {
    const __DEV__: boolean;
    const __PROD__: boolean;
}

export { };
