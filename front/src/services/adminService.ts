import { api, ApiResponse, handleApiError } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { AdminAnalytics } from '../types/admin';
import { Product } from '../types/product';
import { Order } from '../types/order';
import { User } from '../types/auth';

import { OrderWithTimeline } from '../pages/admin/types';

// Basalam product data interface
export interface BasalamProductData {
    basalamId: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl?: string;
    categoryId: number;
}

// Response type for orders endpoint that may have nested structure
interface OrdersResponse {
    orders?: Order[];
    data?: {
        orders?: Order[];
    };
}

export const adminService = {
    // Dashboard Analytics
    getDashboardAnalytics: async (): Promise<ApiResponse<AdminAnalytics>> => {
        try {
            const response = await api.get<AdminAnalytics>(API_ENDPOINTS.ADMIN.ANALYTICS);

            // Ensure all required fields exist with safe defaults
            const safeData: AdminAnalytics = {
                stats: response.data?.stats || {
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    totalProducts: 0,
                    revenueGrowth: 0,
                    ordersGrowth: 0,
                    customersGrowth: 0,
                    productsGrowth: 0,
                },
                salesData: Array.isArray(response.data?.salesData) ? response.data.salesData : [],
                topProducts: Array.isArray(response.data?.topProducts) ? response.data.topProducts : [],
                recentOrders: Array.isArray(response.data?.recentOrders) ? response.data.recentOrders : [],
            };

            return {
                ...response,
                data: safeData,
            };
        } catch (error) {
            console.error('Error fetching dashboard analytics:', error);
            throw new Error(handleApiError(error));
        }
    },

    // Product Management
    getAllProducts: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<ApiResponse<Product[]>> => {
        try {
            const response = await api.get<any>(API_ENDPOINTS.ADMIN.PRODUCTS, { params });

            console.log('Raw admin products response:', response);

            // Handle the response structure from backend: { success: true, data: products[], pagination: {...} }
            let products: Product[] = [];

            if (response.data) {
                // Check if products are in response.data.data (nested structure)
                if (Array.isArray(response.data.data)) {
                    products = response.data.data;
                }
                // Check if products are directly in response.data
                else if (Array.isArray(response.data)) {
                    products = response.data;
                }
            }

            console.log('Processed products:', products);

            return {
                ...response,
                data: products,
                pagination: response.data?.pagination
            };
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new Error(handleApiError(error));
        }
    },

    createProduct: async (productData: any, images?: File[]): Promise<ApiResponse<Product>> => {
        try {
            // If images are provided, use FormData
            if (images && images.length > 0) {
                const formData = new FormData();

                // Append product data
                formData.append('name', productData.name || '');
                formData.append('description', productData.description || '');
                formData.append('price', productData.price?.toString() || '0');
                formData.append('discountPrice', productData.discountPrice?.toString() || '0');
                formData.append('stock', productData.stock?.toString() || '0');
                formData.append('categoryId', productData.categoryId?.toString() || '0');
                if (productData.lowStockAlert) {
                    formData.append('lowStockAlert', productData.lowStockAlert.toString());
                }

                // Append shipping method IDs
                if (productData.shippingMethodIds && Array.isArray(productData.shippingMethodIds)) {
                    productData.shippingMethodIds.forEach((id: number) => {
                        formData.append('shippingMethodIds', id.toString());
                    });
                }

                // Append images
                images.forEach(image => {
                    formData.append('images', image);
                });

                return await api.post<Product>(API_ENDPOINTS.ADMIN.PRODUCTS, formData);
            }

            // Otherwise use JSON
            return await api.post<Product>(API_ENDPOINTS.ADMIN.PRODUCTS, productData);
        } catch (error) {
            console.error('Error creating product:', error);
            throw new Error(handleApiError(error));
        }
    },

    updateProduct: async (id: number, productData: any, images?: File[]): Promise<ApiResponse<Product>> => {
        try {
            let response;

            // If images are provided, use FormData
            if (images && images.length > 0) {
                const formData = new FormData();

                // Append product data
                if (productData.name) formData.append('name', productData.name);
                if (productData.description) formData.append('description', productData.description);
                if (productData.price !== undefined) formData.append('price', productData.price.toString());
                if (productData.discountPrice !== undefined) formData.append('discountPrice', productData.discountPrice.toString());
                if (productData.stock !== undefined) formData.append('stock', productData.stock.toString());
                if (productData.categoryId) formData.append('categoryId', productData.categoryId.toString());
                if (productData.lowStockAlert) formData.append('lowStockAlert', productData.lowStockAlert.toString());

                // Append shipping method IDs
                if (productData.shippingMethodIds && Array.isArray(productData.shippingMethodIds)) {
                    productData.shippingMethodIds.forEach((id: number) => {
                        formData.append('shippingMethodIds', id.toString());
                    });
                }

                // Append images
                images.forEach(image => {
                    formData.append('images', image);
                });

                response = await api.put<Product>(`${API_ENDPOINTS.ADMIN.PRODUCTS}/${id}`, formData);
            } else {
                // Otherwise use JSON
                response = await api.put<Product>(`${API_ENDPOINTS.ADMIN.PRODUCTS}/${id}`, productData);
            }

            // Clear products list cache after update
            api.clearCache();

            return response;
        } catch (error) {
            console.error('Error updating product:', error);
            throw new Error(handleApiError(error));
        }
    },

    deleteProduct: async (id: number): Promise<ApiResponse<void>> => {
        try {
            console.log('Deleting product with ID:', id);
            console.log('Delete URL:', `${API_ENDPOINTS.ADMIN.PRODUCTS}/${id}`);
            const response = await api.delete<void>(`${API_ENDPOINTS.ADMIN.PRODUCTS}/${id}`);
            console.log('Delete response:', response);
            return response;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw new Error(handleApiError(error));
        }
    },

    bulkDeleteProducts: async (ids: number[]): Promise<ApiResponse<void>> => {
        try {
            console.log('Bulk deleting products with IDs:', ids);
            console.log('Bulk delete URL:', `${API_ENDPOINTS.ADMIN.PRODUCTS}/bulk-delete`);
            const response = await api.post<void>(`${API_ENDPOINTS.ADMIN.PRODUCTS}/bulk-delete`, { ids });
            console.log('Bulk delete response:', response);
            return response;
        } catch (error) {
            console.error('Error bulk deleting products:', error);
            throw new Error(handleApiError(error));
        }
    },

    getAllOrders: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
    }): Promise<ApiResponse<Order[]>> => {
        try {
            const response = await api.get<{ data: Order[] }>(
                API_ENDPOINTS.ADMIN.ORDERS,
                { params }
            );
            const orders = Array.isArray(response.data?.orders)
                ? response.data.orders
                : [];
            return {
                ...response,
                data: orders,
            };
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error(handleApiError(error));
        }
    },
    




    updateOrderStatus: async (
        orderId: number,
        status: string
    ): Promise<ApiResponse<Order>> => {
        try {
            return await api.patch<Order>(`${API_ENDPOINTS.ADMIN.ORDERS}/${orderId}/status`, {
                status,
            });
        } catch (error) {
            console.error('Error updating order status:', error);
            throw new Error(handleApiError(error));
        }
    },

    reviewOrderPayment: async (
        orderId: number,
        body: { decision: 'approve' | 'reject'; rejectionReason?: string }
    ): Promise<ApiResponse<{ order: Order }>> => {
        try {
            const response = await api.post<{ order: Order }>(
                `${API_ENDPOINTS.ADMIN.ORDERS}/${orderId}/payment-review`,
                body
            );

            const order = response.data?.order;

            if (!order) {
                throw new Error('Invalid server response');
            }

            return {
                success: true,
                data: { order },
            };
        } catch (error) {
            console.error('Error reviewing order payment:', error);
            throw new Error(handleApiError(error));
        }
    },

    // User Management
    getAllUsers: async (params?: {
        page?: number;
        limit?: number;
        role?: string;
        search?: string;
    }): Promise<ApiResponse<User[]>> => {
        try {
            const response = await api.get<User[]>(API_ENDPOINTS.ADMIN.USERS, { params });

            // Ensure data is always an array
            const safeData = Array.isArray(response.data) ? response.data : [];

            return {
                ...response,
                data: safeData,
            };
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new Error(handleApiError(error));
        }
    },

    updateUserRole: async (userId: number, role: string): Promise<ApiResponse<User>> => {
        try {
            return await api.patch<User>(`${API_ENDPOINTS.ADMIN.USERS}/${userId}/role`, { role });
        } catch (error) {
            console.error('Error updating user role:', error);
            throw new Error(handleApiError(error));
        }
    },

    deleteUser: async (userId: number): Promise<ApiResponse<void>> => {
        try {
            return await api.delete<void>(`${API_ENDPOINTS.ADMIN.USERS}/${userId}`);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error(handleApiError(error));
        }
    },

    // Product Image Management
    uploadProductImages: async (
        productId: number,
        files: File[]
    ): Promise<ApiResponse<any>> => {
        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });

            // Don't set Content-Type header - browser will set it automatically with boundary
            return await api.post<any>(
                `/products/${productId}/images`,
                formData
            );
        } catch (error) {
            console.error('Error uploading product images:', error);
            throw new Error(handleApiError(error));
        }
    },

    deleteProductImage: async (
        productId: number,
        imageId: number
    ): Promise<ApiResponse<void>> => {
        try {
            return await api.delete<void>(
                `/products/${productId}/images/${imageId}`
            );
        } catch (error) {
            console.error('Error deleting product image:', error);
            throw new Error(handleApiError(error));
        }
    },

    setMainProductImage: async (
        productId: number,
        imageId: number
    ): Promise<ApiResponse<any>> => {
        try {
            return await api.patch<any>(
                `/products/${productId}/images/${imageId}`,
                { isMain: true }
            );
        } catch (error) {
            console.error('Error setting main product image:', error);
            throw new Error(handleApiError(error));
        }
    },

    // Basalam Integration
    syncBasalamProduct: async (productData: BasalamProductData): Promise<ApiResponse<Product>> => {
        try {
            console.log('Syncing Basalam product:', productData);
            const response = await api.post<Product>(API_ENDPOINTS.ADMIN.BASALAM_SYNC, productData);
            console.log('Basalam sync response:', response);

            // Clear products list cache after sync
            api.clearCache();

            return response;
        } catch (error) {
            console.error('Error syncing Basalam product:', error);
            throw new Error(handleApiError(error));
        }
    },

    // Shipping Methods Management
    getShippingMethodStats: async (params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<ApiResponse<any>> => {
        try {
            const response = await api.get<any>(API_ENDPOINTS.SHIPPING_METHODS.STATS, { params });
            return response;
        } catch (error) {
            console.error('Error fetching shipping method stats:', error);
            throw new Error(handleApiError(error));
        }
    },

    syncShippingMethods: async (): Promise<ApiResponse<any>> => {
        try {
            const response = await api.post<any>(API_ENDPOINTS.SHIPPING_METHODS.SYNC);
            return response;
        } catch (error) {
            console.error('Error syncing shipping methods:', error);
            throw new Error(handleApiError(error));
        }
    },
    
    getOrderById: async (orderId: number): Promise<ApiResponse<Order>> => {
        try {
            const response = await api.get<Order>(
                `${API_ENDPOINTS.ADMIN.ORDERS}/${orderId}`
            );

            return response;
        } catch (error) {
            console.error('Error fetching order by id:', error);
            throw new Error(handleApiError(error));
        }
    },
};
