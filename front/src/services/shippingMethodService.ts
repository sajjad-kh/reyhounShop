import { api } from '../utils/api';
import { ShippingMethod, ShippingMethodStats, DateRange, OrderDetails, ShippingCostCalculation } from '../types/shipping';

/**
 * Shipping Method Service Error
 * Custom error class for shipping method operations
 */
export class ShippingMethodError extends Error {
    constructor(
        message: string,
        public code?: string,
        public canRetry: boolean = false,
        public usedCache: boolean = false
    ) {
        super(message);
        this.name = 'ShippingMethodError';
    }
}

/**
 * Shipping Method Service
 * Handles all API calls related to shipping methods with error handling and caching
 */
class ShippingMethodService {
    private readonly baseUrl = '/shipping-methods';
    private cachedMethods: ShippingMethod[] | null = null;
    private cacheTimestamp: number | null = null;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get cached shipping methods if available and not expired
     */
    private getCachedMethods(): ShippingMethod[] | null {
        if (!this.cachedMethods || !this.cacheTimestamp) {
            return null;
        }

        const isExpired = Date.now() - this.cacheTimestamp > this.CACHE_TTL;
        if (isExpired) {
            this.cachedMethods = null;
            this.cacheTimestamp = null;
            return null;
        }

        return this.cachedMethods;
    }

    /**
     * Set cached shipping methods
     */
    private setCachedMethods(methods: ShippingMethod[]): void {
        this.cachedMethods = methods;
        this.cacheTimestamp = Date.now();
    }

    /**
     * Handle API errors and convert to user-friendly messages
     */
    private handleError(error: any, operation: string): never {
        console.error(`Shipping method ${operation} error:`, error);

        // Extract error information
        const errorData = error.response?.data?.error;
        const message = errorData?.message || error.message || `خطا در ${operation}`;
        const code = errorData?.code || 'UNKNOWN_ERROR';
        const canRetry = errorData?.canRetry !== false;

        throw new ShippingMethodError(message, code, canRetry);
    }

    /**
     * Get all active shipping methods with fallback to cache
     */
    async getShippingMethods(useCache: boolean = true): Promise<ShippingMethod[]> {
        try {
            // Try to get from cache first if allowed
            if (useCache) {
                const cached = this.getCachedMethods();
                if (cached) {
                    console.log('Using cached shipping methods');
                    return cached;
                }
            }

            const response = await api.get<ShippingMethod[]>(this.baseUrl);
            const methods = response.data;
            console.log("api response:",methods)

            // Cache the results
            this.setCachedMethods(methods);

            return methods;
        } catch (error: any) {
            // If API fails, try to use cached data even if expired
            if (this.cachedMethods && this.cachedMethods.length > 0) {
                console.warn('API failed, using expired cache as fallback');
                // Return cached data but log the warning
                return this.cachedMethods;
            }

            this.handleError(error, 'دریافت روش‌های ارسال');
        }
    }

    /**
     * Get shipping method by ID
     */
    async getShippingMethodById(id: number): Promise<ShippingMethod> {
        try {
            const response = await api.get<ShippingMethod>(`${this.baseUrl}/${id}`);
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'دریافت جزئیات روش ارسال');
        }
    }

    /**
     * Get shipping methods available for a specific product with fallback
     */
    async getProductShippingMethods(productId: number): Promise<ShippingMethod[]> {
        try {
            const response = await api.get<ShippingMethod[]>(`/products/${productId}/shipping-methods`);
            return response.data;
        } catch (error: any) {
            // If product-specific methods fail, try to get all methods as fallback
            console.warn('Failed to get product shipping methods, trying all methods');
            try {
                return await this.getShippingMethods(true);
            } catch (fallbackError) {
                this.handleError(error, 'دریافت روش‌های ارسال محصول');
            }
        }
    }

    /**
     * Sync shipping methods from Basalam API (Admin only)
     */
    async syncShippingMethods(basalamToken: string): Promise<{
        syncedCount: number;
        methods: ShippingMethod[];
        usedCache?: boolean;
        warning?: string;
    }> {
        try {
            const response = await api.post<{
                syncedCount: number;
                methods: ShippingMethod[];
                usedCache?: boolean;
            }>(`${this.baseUrl}/sync`, { basalamToken });

            // Update cache with synced methods
            if (response.data.methods) {
                this.setCachedMethods(response.data.methods);
            }

            return response.data;
        } catch (error: any) {
            this.handleError(error, 'همگام‌سازی روش‌های ارسال');
        }
    }

    /**
     * Get shipping method usage statistics (Admin only)
     */
    async getUsageStatistics(dateRange?: DateRange): Promise<ShippingMethodStats[]> {
        try {
            const params = dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : {};
            const response = await api.get<ShippingMethodStats[]>(`${this.baseUrl}/stats`, { params });
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'دریافت آمار روش‌های ارسال');
        }
    }

    /**
     * Calculate shipping cost for an order
     */
    async calculateShippingCost(
        shippingMethodId: number,
        orderDetails: OrderDetails
    ): Promise<ShippingCostCalculation> {
        try {
            const response = await api.post<ShippingCostCalculation>(
                `${this.baseUrl}/${shippingMethodId}/calculate-cost`,
                orderDetails
            );
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'محاسبه هزینه ارسال');
        }
    }

    /**
     * Get scheduler status (Admin only)
     */
    async getSchedulerStatus(): Promise<{
        isRunning: boolean;
        isSyncing: boolean;
        lastSyncResult: any;
        schedule: string;
        timezone: string;
    }> {
        try {
            const response = await api.get<any>(`${this.baseUrl}/scheduler/status`);
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'دریافت وضعیت همگام‌سازی');
        }
    }

    /**
     * Manually trigger a sync (Admin only)
     */
    async triggerManualSync(): Promise<{
        success: boolean;
        timestamp: string;
        duration: number;
        methodCount: number;
        error?: string;
    }> {
        try {
            const response = await api.post<any>(`${this.baseUrl}/scheduler/trigger`);
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'اجرای همگام‌سازی دستی');
        }
    }

    /**
     * Clear cached shipping methods
     */
    clearCache(): void {
        this.cachedMethods = null;
        this.cacheTimestamp = null;
    }

    /**
     * Create a new internal shipping method (Admin only)
     */
    async createShippingMethod(data: {
        name: string;
        description?: string;
        baseCost: number;
        additionalCost: number;
        additionalDimensionsCost?: number;
        isPrivate?: boolean;
        isActive?: boolean;
    }): Promise<ShippingMethod> {
        try {
            const response = await api.post<ShippingMethod>(this.baseUrl, data);
            this.clearCache(); // Clear cache after creating
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'ایجاد روش ارسال');
        }
    }

    /**
     * Update a shipping method (Admin only)
     */
    async updateShippingMethod(
        id: number,
        data: Partial<{
            name: string;
            description: string;
            baseCost: number;
            additionalCost: number;
            additionalDimensionsCost: number;
            isPrivate: boolean;
            isActive: boolean;
        }>
    ): Promise<ShippingMethod> {
        try {
            const response = await api.put<ShippingMethod>(`${this.baseUrl}/${id}`, data);
            this.clearCache(); // Clear cache after updating
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'به‌روزرسانی روش ارسال');
        }
    }

    /**
     * Delete a shipping method (Admin only)
     */
    async deleteShippingMethod(id: number): Promise<void> {
        try {
            await api.delete(`${this.baseUrl}/${id}`);
            this.clearCache(); // Clear cache after deleting
        } catch (error: any) {
            this.handleError(error, 'حذف روش ارسال');
        }
    }

    /**
     * Get shipping methods by source
     */
    async getShippingMethodsBySource(source: 'basalam' | 'internal'): Promise<ShippingMethod[]> {
        try {
            const response = await api.get<ShippingMethod[]>(this.baseUrl, {
                params: { source }
            });
            return response.data;
        } catch (error: any) {
            this.handleError(error, 'دریافت روش‌های ارسال');
        }
    }
}

export const shippingMethodService = new ShippingMethodService();
export default shippingMethodService;
