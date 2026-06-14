/**
 * Configuration Utility
 * Provides type-safe access to environment variables
 */

interface AppConfig {
    api: {
        baseUrl: string;
        timeout: number;
    };
    auth: {
        jwtSecretKey: string;
        tokenExpiry: string;
    };
    payment: {
        stripe: {
            publicKey: string;
        };
        zarinpal: {
            merchantId: string;
        };
        payir: {
            apiKey: string;
        };
    };
    app: {
        name: string;
        version: string;
        enablePWA: boolean;
    };
    dev: {
        enableDevtools: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    build: {
        isDevelopment: boolean;
        isProduction: boolean;
        mode: string;
    };
}

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key: string, fallback: string = ''): string => {
    return import.meta.env[key] || fallback;
};

/**
 * Parse boolean environment variable
 */
const parseBool = (value: string): boolean => {
    return value === 'true' || value === '1';
};

/**
 * Application configuration object
 */
export const config: AppConfig = {
    api: {
        baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api/v1'),
        timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '10000'), 10),
    },
    auth: {
        jwtSecretKey: getEnvVar('VITE_JWT_SECRET_KEY', 'dev-jwt-secret-key'),
        tokenExpiry: getEnvVar('VITE_TOKEN_EXPIRY', '24h'),
    },
    payment: {
        stripe: {
            publicKey: getEnvVar('VITE_STRIPE_PUBLIC_KEY', ''),
        },
        zarinpal: {
            merchantId: getEnvVar('VITE_ZARINPAL_MERCHANT_ID', ''),
        },
        payir: {
            apiKey: getEnvVar('VITE_PAYIR_API_KEY', ''),
        },
    },
    app: {
        name: getEnvVar('VITE_APP_NAME', 'Glassmorphism E-commerce'),
        version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
        enablePWA: parseBool(getEnvVar('VITE_ENABLE_PWA', 'true')),
    },
    dev: {
        enableDevtools: parseBool(getEnvVar('VITE_ENABLE_DEVTOOLS', 'false')),
        logLevel: (getEnvVar('VITE_LOG_LEVEL', 'error') as AppConfig['dev']['logLevel']),
    },
    build: {
        isDevelopment: import.meta.env.DEV,
        isProduction: import.meta.env.PROD,
        mode: import.meta.env.MODE,
    },
};

/**
 * Validate required configuration
 */
export const validateConfig = (): void => {
    const requiredVars = [
        'VITE_API_BASE_URL',
        'VITE_APP_NAME',
        'VITE_APP_VERSION',
    ];

    const missing = requiredVars.filter(
        (key) => !import.meta.env[key]
    );

    if (missing.length > 0 && config.build.isProduction) {
        console.error('Missing required environment variables:', missing);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing payment keys in production
    if (config.build.isProduction) {
        if (!config.payment.stripe.publicKey) {
            console.warn('Warning: Stripe public key not configured');
        }
        if (!config.payment.zarinpal.merchantId) {
            console.warn('Warning: Zarinpal merchant ID not configured');
        }
        if (!config.payment.payir.apiKey) {
            console.warn('Warning: PayIR API key not configured');
        }
    }
};

/**
 * Log configuration in development
 */
export const logConfig = (): void => {
    if (config.build.isDevelopment && config.dev.enableDevtools) {
        console.group('🔧 Application Configuration');
        console.log('Environment:', config.build.mode);
        console.log('API Base URL:', config.api.baseUrl);
        console.log('App Name:', config.app.name);
        console.log('App Version:', config.app.version);
        console.log('PWA Enabled:', config.app.enablePWA);
        console.log('Log Level:', config.dev.logLevel);
        console.groupEnd();
    }
};

/**
 * Initialize configuration
 */
export const initializeConfig = (): void => {
    validateConfig();
    logConfig();
};

export default config;
