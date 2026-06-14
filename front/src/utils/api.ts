import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { secureStorage, validateJWTStructure, sanitizeObject, csrfToken } from './security';
import { STORAGE_KEYS } from './constants';

// API Response wrapper interface
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        requestId: string;
    };
}

// Retry configuration
interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Simple in-memory cache
class ApiCache {
    private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

    set(key: string, data: any, ttl: number = 300000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    get(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > cached.ttl;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clear(): void {
        this.cache.clear();
    }

    delete(key: string): void {
        this.cache.delete(key);
    }
}

const apiCache = new ApiCache();

// Retry helper function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error: AxiosError, retryCount: number, config: RetryConfig): boolean => {
    if (retryCount >= config.maxRetries) return false;
    if (!error.response) return true; // Network errors
    return config.retryableStatuses.includes(error.response.status);
};

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
    const client = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
        timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor for adding auth token, CSRF token, and cache checking
    client.interceptors.request.use(
        (config) => {
            // Add auth token with validation
            const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token && validateJWTStructure(token)) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Add CSRF token for state-changing requests
            if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
                config.headers['X-CSRF-Token'] = csrfToken.getToken();
            }

            // Add request ID for tracking
            config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Add security headers
            config.headers['X-Requested-With'] = 'XMLHttpRequest';

            // Remove Content-Type for FormData to let browser set it with boundary
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }

            // Sanitize request data for POST/PUT/PATCH (but not FormData)
            if (config.data && ['post', 'put', 'patch'].includes(config.method || '')) {
                // Don't sanitize FormData
                if (!(config.data instanceof FormData)) {
                    config.data = sanitizeObject(config.data);
                }
            }

            // Check cache for GET requests
            if (config.method === 'get' && config.url) {
                const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
                const cached = apiCache.get(cacheKey);
                if (cached) {
                    // Return cached response
                    return Promise.reject({
                        config,
                        response: { data: cached },
                        cached: true,
                    } as any);
                }
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor for handling errors, token refresh, and retry logic
    client.interceptors.response.use(
        (response: AxiosResponse) => {
            // Cache successful GET responses
            if (response.config.method === 'get' && response.config.url) {
                const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
                // Cache for 5 minutes by default
                apiCache.set(cacheKey, response.data, 300000);
            }

            return response;
        },
        async (error: AxiosError | any) => {
            // Handle cached responses
            if (error.cached) {
                return Promise.resolve(error.response);
            }

            const originalRequest: any = error.config;

            // Handle 401 Unauthorized - Token refresh
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                    if (refreshToken && validateJWTStructure(refreshToken)) {
                        const response = await client.post('/auth/refresh', {
                            refreshToken,
                        });

                        const { token } = response.data.data;
                        secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return client(originalRequest);
                    }
                } catch (refreshError) {
                    // Refresh failed, clear auth and redirect
                    secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                    secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
                    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

                    // Dispatch auth state change event
                    window.dispatchEvent(new CustomEvent('authStateChanged', {
                        detail: { user: null, isAuthenticated: false }
                    }));

                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            }

            // Retry logic for retryable errors
            const retryCount = originalRequest._retryCount || 0;
            if (shouldRetry(error, retryCount, DEFAULT_RETRY_CONFIG)) {
                originalRequest._retryCount = retryCount + 1;

                // Exponential backoff
                const delay = DEFAULT_RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
                await sleep(delay);

                console.log(`Retrying request (attempt ${retryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries})`);
                return client(originalRequest);
            }

            // Handle specific error codes
            if (error.response) {
                const status = error.response.status;

                switch (status) {
                    case 400:
                        console.error('Bad Request:', error.response.data);
                        break;
                    case 403:
                        console.error('Forbidden:', error.response.data);
                        // Dispatch event for forbidden access
                        window.dispatchEvent(new CustomEvent('apiError', {
                            detail: { type: 'forbidden', error: error.response.data }
                        }));
                        break;
                    case 404:
                        console.error('Not Found:', error.response.data);
                        break;
                    case 429:
                        console.error('Too Many Requests - Rate Limited');
                        window.dispatchEvent(new CustomEvent('apiError', {
                            detail: { type: 'rateLimit', error: error.response.data }
                        }));
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        console.error('Server Error:', error.response.data);
                        window.dispatchEvent(new CustomEvent('apiError', {
                            detail: { type: 'serverError', error: error.response.data }
                        }));
                        break;
                }
            } else if (error.request) {
                // Network error
                console.error('Network Error: No response received');
                window.dispatchEvent(new CustomEvent('apiError', {
                    detail: { type: 'network', error: 'Network connection failed' }
                }));
            }

            return Promise.reject(error);
        }
    );

    return client;
};

// Create the main API client instance
export const apiClient = createApiClient();

// Generic API methods with enhanced error handling
export const api = {
    get: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
        apiClient.get(url, config).then((response) => response.data),

    post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
        apiClient.post(url, data, config).then((response) => response.data),

    put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
        apiClient.put(url, data, config).then((response) => response.data),

    patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
        apiClient.patch(url, data, config).then((response) => response.data),

    delete: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
        apiClient.delete(url, config).then((response) => response.data),

    // Clear cache
    clearCache: (): void => {
        apiCache.clear();
    },

    // Clear specific cache entry
    clearCacheEntry: (url: string, params?: any): void => {
        const cacheKey = `${url}${JSON.stringify(params || {})}`;
        apiCache.delete(cacheKey);
    },
};

// Export error handler utility
export const handleApiError = (error: any): string => {
    if (error.response?.data?.error) {
        return error.response.data.error.message || 'An error occurred';
    }
    if (error.message) {
        return error.message;
    }
    return 'An unexpected error occurred';
};

export default api;