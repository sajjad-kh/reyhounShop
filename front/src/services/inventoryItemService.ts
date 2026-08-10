import { api } from '../utils/api';

export interface InventoryItemData {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  lowStockAlert: number;
  unit: string | null;
  costPrice: number | null;
  sellPrice: number | null;
  location: string | null;
  supplier: string | null;
  minOrderQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface InventoryMovement {
  id: number;
  inventoryItemId: number;
  type: string;
  quantity: number;
  note: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface InventoryItemStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalUnits: number;
}

export interface InventoryItemQuery {
  search?: string;
  lowStockOnly?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'quantity' | 'costPrice' | 'sellPrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateInventoryItem {
  name: string;
  sku?: string;
  description?: string;
  quantity?: number;
  lowStockAlert?: number;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  location?: string;
  supplier?: string;
  minOrderQty?: number;
}

export interface AdjustStock {
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
  quantity: number;
  note?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function apiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function apiError(error: any): ApiResponse<any> {
  const errData = error?.response?.data?.error;
  const msg = typeof errData === 'object' ? errData?.message : errData || error?.message || 'خطای غیرمنتظره';
  return { success: false, data: null as any, error: msg };
}

export const inventoryItemService = {
  getAll: async (query: InventoryItemQuery = {}): Promise<ApiResponse<{ items: InventoryItemData[]; pagination: { page: number; limit: number; total: number; pages: number } }>> => {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append('search', query.search);
      if (query.lowStockOnly) params.append('lowStockOnly', 'true');
      if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);

      const response = await api.get(`/inventory-items?${params.toString()}`);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  getById: async (id: number): Promise<ApiResponse<InventoryItemData & { movements: InventoryMovement[] }>> => {
    try {
      const response = await api.get(`/inventory-items/${id}`);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  getStats: async (): Promise<ApiResponse<InventoryItemStats>> => {
    try {
      const response = await api.get('/inventory-items/stats');
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  create: async (data: CreateInventoryItem): Promise<ApiResponse<InventoryItemData>> => {
    try {
      const response = await api.post('/inventory-items', data);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  update: async (id: number, data: Partial<CreateInventoryItem> & { isActive?: boolean }): Promise<ApiResponse<InventoryItemData>> => {
    try {
      const response = await api.put(`/inventory-items/${id}`, data);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  adjustStock: async (id: number, data: AdjustStock): Promise<ApiResponse<InventoryItemData>> => {
    try {
      const response = await api.post(`/inventory-items/${id}/adjust`, data);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    try {
      await api.delete(`/inventory-items/${id}`);
      return apiSuccess(null);
    } catch (error) {
      return apiError(error);
    }
  },

  getMovements: async (id: number, page: number = 1, limit: number = 10): Promise<ApiResponse<{ movements: InventoryMovement[]; pagination: { page: number; limit: number; total: number; pages: number } }>> => {
    try {
      const response = await api.get(`/inventory-items/${id}/movements?page=${page}&limit=${limit}`);
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  importFromExcel: async (file: File): Promise<ApiResponse<{ items: (InventoryItemData & { rowIndex: number; isDuplicate: boolean; duplicateType: string | null; existingId: number | null })[]; parseErrors: { row: number; name: string; error: string }[]; totalRows: number; validRows: number }>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/inventory-items/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },

  confirmImport: async (file: File, items: any[]): Promise<ApiResponse<{ success: number; errors: { name: string; error: string }[]; parseErrors: any[] }>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('confirm', 'true');
      formData.append('items', JSON.stringify(items));
      const response = await api.post('/inventory-items/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return apiSuccess(response.data);
    } catch (error) {
      return apiError(error);
    }
  },
};
