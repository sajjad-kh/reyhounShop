// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        PROFILE: '/auth/profile',
        CHANGE_PASSWORD: '/auth/change-password',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_2FA: '/auth/verify-2fa',
        BALE_LOGIN: '/auth/bale/login',       
        BALE_STATUS: '/auth/bale/status',    
    },

    // Products
    PRODUCTS: {
        LIST: '/products',
        DETAIL: (id: number) => `/products/${id}`,
        SEARCH: '/products/search',
        CATEGORIES: '/products/categories',
        REVIEWS: (id: number) => `/products/${id}/reviews`,
        POPULAR_SEARCHES: '/products/popular-searches',
    },

    // Cart
    CART: {
        GET: '/cart',
        ADD: '/cart/items',
        UPDATE: '/cart/items',
        REMOVE: '/cart/items',
        CLEAR: '/cart/clear',
        APPLY_COUPON: '/cart/validate-discount',
    },

    // Orders
    ORDERS: {
        LIST: '/orders',
        CREATE: '/orders',
        DETAIL: (id: number) => `/orders/${id}`,
        CANCEL: (id: number) => `/orders/${id}/cancel`,
        TRACK: (trackingCode: string) => `/orders/track/${trackingCode}`,
        RESEND_PROOF: (id: number) => `/orders/${id}/resend-proof`,
        RECEIPT_PDF: (id: number) => `/orders/${id}/receipt.pdf`,
        REVISION: (id: number) => `/orders/${id}/revision`, 
        APPROVE_DESIGN: (id: number) => `/orders/${id}/approve-design`,
        CONFIRM_DELIVERY: (id: number) =>`/orders/${id}/confirm-delivery`,
    },

    // Shipping Methods
    SHIPPING_METHODS: {
        LIST: '/shipping-methods',
        DETAIL: (id: number) => `/shipping-methods/${id}`,
        PRODUCT_METHODS: (productId: number) => `/products/${productId}/shipping-methods`,
        CALCULATE_COST: '/shipping-methods/calculate-cost',
        SYNC: '/shipping-methods/sync',
        STATS: '/shipping-methods/stats',
    },

    // User
    USER: {
        PROFILE: '/user/profile',
        ADDRESSES: '/users/addresses',
        WISHLIST: '/user/wishlist',
        LOYALTY_POINTS: '/user/loyalty-points',
    },

    // Admin
    ADMIN: {
        DASHBOARD: '/admin/dashboard',
        PRODUCTS: '/admin/products',
        ORDERS: '/admin/orders',
        USERS: '/admin/users',
        SHIPPING: '/admin/shipping-methods',
        ANALYTICS: '/admin/analytics',
        CATEGORIES: '/categories',
        REVIEWS: '/admin/reviews',
        BASALAM_SYNC: '/admin/basalam/sync-product',
    },

    // Payment
    PAYMENT: {
        PROCESS: '/payment/process',
        VERIFY: '/payment/verify',
        METHODS: '/payment/methods',
    },




} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    CART_DATA: 'cart_data',
    THEME: 'theme',
    LANGUAGE: 'language',
} as const;

// App Configuration
export const APP_CONFIG = {
    NAME: import.meta.env.VITE_APP_NAME || 'Glassmorphism E-commerce',
    VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA === 'true',
    ENABLE_DEVTOOLS: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
} as const;

// Helper function to get full image URL
export const getImageUrl = (url: string | undefined | null): string => {
    // Handle undefined, null, or 'undefined' string
    if (!url || url === 'undefined' || url === 'null') {
        return '/placeholder.png';
    }

    // If URL is already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Get base URL without /api/v1
    const baseUrl = APP_CONFIG.API_BASE_URL.replace('/api/v1', '');

    // Ensure URL starts with /
    const path = url.startsWith('/') ? url : `/${url}`;

    const fullUrl = `${baseUrl}${path}`;

    return fullUrl;
};

// UI Constants
export const UI_CONSTANTS = {
    BREAKPOINTS: {
        XS: 475,
        SM: 640,
        MD: 768,
        LG: 1024,
        XL: 1280,
        '2XL': 1536,
    },
    ANIMATION_DURATION: {
        FAST: 200,
        NORMAL: 300,
        SLOW: 500,
    },
    DEBOUNCE_DELAY: 300,
    ITEMS_PER_PAGE: 12,
} as const;

// Order Status
export const ORDER_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED',
    PAYMENT_REJECTED: 'PAYMENT_REJECTED',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
} as const;

// User Roles
export const USER_ROLES = {
    CUSTOMER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];