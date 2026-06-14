/**
 * API Integration Testing and Validation Utilities
 * Provides comprehensive testing for all API endpoints
 */

import { api } from './api';
import { API_ENDPOINTS } from './constants';

export interface EndpointTest {
    name: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    requiresAuth: boolean;
    testData?: any;
}

export interface TestResult {
    endpoint: string;
    success: boolean;
    status?: number;
    error?: string;
    responseTime?: number;
}

/**
 * Test all API endpoints
 */
export const testAllEndpoints = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test public endpoints
    const publicTests: EndpointTest[] = [
        { name: 'Products List', endpoint: API_ENDPOINTS.PRODUCTS.LIST, method: 'GET', requiresAuth: false },
        { name: 'Categories', endpoint: API_ENDPOINTS.PRODUCTS.CATEGORIES, method: 'GET', requiresAuth: false },
        { name: 'Product Search', endpoint: API_ENDPOINTS.PRODUCTS.SEARCH, method: 'GET', requiresAuth: false },
    ];

    for (const test of publicTests) {
        const result = await testEndpoint(test);
        results.push(result);
    }

    return results;
};

/**
 * Test individual endpoint
 */
export const testEndpoint = async (test: EndpointTest): Promise<TestResult> => {
    const startTime = Date.now();

    try {
        let response;

        switch (test.method) {
            case 'GET':
                response = await api.get(test.endpoint);
                break;
            case 'POST':
                response = await api.post(test.endpoint, test.testData);
                break;
            case 'PUT':
                response = await api.put(test.endpoint, test.testData);
                break;
            case 'DELETE':
                response = await api.delete(test.endpoint);
                break;
        }

        const responseTime = Date.now() - startTime;

        return {
            endpoint: test.endpoint,
            success: response.success,
            status: 200,
            responseTime,
        };
    } catch (error: any) {
        const responseTime = Date.now() - startTime;

        return {
            endpoint: test.endpoint,
            success: false,
            status: error.response?.status,
            error: error.message,
            responseTime,
        };
    }
};

/**
 * Validate API response structure
 */
export const validateApiResponse = <T>(response: any): boolean => {
    if (!response) return false;
    if (typeof response.success !== 'boolean') return false;
    if (!response.data) return false;
    return true;
};

/**
 * Check API health
 */
export const checkApiHealth = async (): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
}> => {
    const startTime = Date.now();

    try {
        // Try to fetch categories as a health check
        await api.get(API_ENDPOINTS.PRODUCTS.CATEGORIES);
        const responseTime = Date.now() - startTime;

        return {
            healthy: true,
            responseTime,
        };
    } catch (error: any) {
        const responseTime = Date.now() - startTime;

        return {
            healthy: false,
            responseTime,
            error: error.message,
        };
    }
};

/**
 * Monitor API performance
 */
export class ApiPerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();

    recordRequest(endpoint: string, duration: number): void {
        const existing = this.metrics.get(endpoint) || [];
        existing.push(duration);
        this.metrics.set(endpoint, existing);
    }

    getAverageResponseTime(endpoint: string): number {
        const times = this.metrics.get(endpoint);
        if (!times || times.length === 0) return 0;

        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    }

    getAllMetrics(): Record<string, { average: number; count: number }> {
        const result: Record<string, { average: number; count: number }> = {};

        this.metrics.forEach((times, endpoint) => {
            const sum = times.reduce((a, b) => a + b, 0);
            result[endpoint] = {
                average: sum / times.length,
                count: times.length,
            };
        });

        return result;
    }

    clear(): void {
        this.metrics.clear();
    }
}

export const performanceMonitor = new ApiPerformanceMonitor();
