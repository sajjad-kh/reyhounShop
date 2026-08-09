import { api, ApiResponse, handleApiError } from '../utils/api';

export interface InventoryItem {
    id: number;
    name: string;
    stock: number;
    reservedStock: number;
    availableStock: number;
    lowStockAlert: number;
    isLowStock: boolean;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    stockValue: number;
    price: number;
    category: {
        id: number;
        name: string;
    };
    mainImage: string | null;
}

export interface InventoryStats {
    totalProducts: number;
    inStockProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalStockUnits: number;
    totalStockValue: number;
    stockDistribution: {
        inStock: string;
        lowStock: string;
        outOfStock: string;
    };
}

export interface InventoryQuery {
    lowStockOnly?: boolean;
    categoryId?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'stock' | 'reservedStock' | 'price';
    sortOrder?: 'asc' | 'desc';
}

export interface StockUpdate {
    stock: number;
    lowStockAlert?: number;
    reason?: string;
}

export const inventoryService = {
    getInventory: async (query: InventoryQuery = {}): Promise<ApiResponse<{ inventory: InventoryItem[]; pagination: any }>> => {
        try {
            const params = new URLSearchParams();
            if (query.lowStockOnly) params.append('lowStockOnly', 'true');
            if (query.categoryId) params.append('categoryId', String(query.categoryId));
            if (query.search) params.append('search', query.search);
            if (query.page) params.append('page', String(query.page));
            if (query.limit) params.append('limit', String(query.limit));
            if (query.sortBy) params.append('sortBy', query.sortBy);
            if (query.sortOrder) params.append('sortOrder', query.sortOrder);

            const response = await api.get(`/inventory?${params.toString()}`);
            return { success: true, data: response.data };
        } catch (error) {
            return handleApiError(error);
        }
    },

    getStats: async (): Promise<ApiResponse<InventoryStats>> => {
        try {
            const response = await api.get('/inventory/stats');
            return { success: true, data: response.data };
        } catch (error) {
            return handleApiError(error);
        }
    },

    getLowStockAlerts: async (): Promise<ApiResponse<InventoryItem[]>> => {
        try {
            const response = await api.get('/inventory/alerts');
            return { success: true, data: response.data };
        } catch (error) {
            return handleApiError(error);
        }
    },

    updateStock: async (productId: number, data: StockUpdate): Promise<ApiResponse<InventoryItem>> => {
        try {
            const response = await api.put(`/inventory/${productId}/stock`, data);
            return { success: true, data: response.data };
        } catch (error) {
            return handleApiError(error);
        }
    },

    bulkUpdateStock: async (updates: { productId: number; stock: number; lowStockAlert?: number; reason?: string }[]): Promise<ApiResponse<{ results: InventoryItem[]; errors: any[] }>> => {
        try {
            const response = await api.put('/inventory/bulk-update', { updates });
            return { success: true, data: response.data };
        } catch (error) {
            return handleApiError(error);
        }
    },
};
