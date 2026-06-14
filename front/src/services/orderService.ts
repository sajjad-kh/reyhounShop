import { api, apiClient } from '../utils/api';
import { Order, CreateOrderRequest, OrderTrackingInfo } from '../types/order';
import { API_ENDPOINTS } from '../utils/constants';

export class OrderService {
    private static instance: OrderService;

    private constructor() { }

    public static getInstance(): OrderService {
        if (!OrderService.instance) {
            OrderService.instance = new OrderService();
        }
        return OrderService.instance;
    }

    /**
     * Get all orders for current user
     */
    async getOrders(): Promise<Order[]> {
        try {
            const response = await api.get<Order[]>(API_ENDPOINTS.ORDERS.LIST);

            if (response.success && response.data) {
                // Ensure data is an array
                return Array.isArray(response.data) ? response.data : [];
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // Return empty array instead of throwing to prevent page crash
            return [];
        }
    }

    /**
     * Get order by ID
     */
    async getOrderById(orderId: number): Promise<Order> {
        try {
            const response = await api.get<Order>(API_ENDPOINTS.ORDERS.DETAIL(orderId));

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to fetch order');
        } catch (error) {
            throw this.handleOrderError(error);
        }
    }

    /**
     * Create new order
     */
    async createOrder(request: CreateOrderRequest): Promise<Order> {
        try {
            const response = await api.post<Order>(API_ENDPOINTS.ORDERS.CREATE, request);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to create order');
        } catch (error) {
            throw this.handleOrderError(error);
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId: number): Promise<void> {
        try {
            const response = await api.post(API_ENDPOINTS.ORDERS.CANCEL(orderId));

            if (!response.success) {
                throw new Error('Failed to cancel order');
            }
        } catch (error) {
            throw this.handleOrderError(error);
        }
    }

    async resendPaymentProof(orderId: number, file: File): Promise<Order> {
        const formData = new FormData();
        formData.append('paymentProof', file);

        const response = await api.post<Order>(
            API_ENDPOINTS.ORDERS.RESEND_PROOF(orderId),
            formData
        );

        if (response.success && response.data) {
            return response.data;
        }

        throw new Error('ارسال مجدد رسید ناموفق بود');
    }

    async downloadReceiptPdf(orderId: number): Promise<void> {
        const response = await apiClient.get(
            API_ENDPOINTS.ORDERS.RECEIPT_PDF(orderId),
            { responseType: 'blob' }
        );

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${orderId}-receipt.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Track order by tracking code
     */
    async trackOrder(trackingCode: string): Promise<OrderTrackingInfo> {
        try {
            const response = await api.get<OrderTrackingInfo>(
                API_ENDPOINTS.ORDERS.TRACK(trackingCode)
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to track order');
        } catch (error) {
            throw this.handleOrderError(error);
        }
    }

    /**
     * Handle order errors
     */
    private handleOrderError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'Order operation failed');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }

    async sendDesignRevisionRequest(
        orderId: number,
        formData: FormData
    ): Promise<any> {
        try {
            const response = await api.post(
                API_ENDPOINTS.ORDERS.REVISION(orderId),
                formData
            );

            // چون api خودش data unwrap کرده
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to send revision request');
            }

            return response.data; // 👈 revisionMessage
        } catch (error) {
            throw this.handleOrderError(error);
        }
    }

    async approveDesign(orderId: number): Promise<any> {
        try {
            const response = await api.post(
                API_ENDPOINTS.ORDERS.APPROVE_DESIGN(orderId)
            );

            if (!response.success) {
                throw new Error(
                    response.error?.message ||
                    'Failed to approve design'
                );
            }

            return response.data;
        } catch (error: any) {
            throw this.handleOrderError(error);
        }
    }
    

    async confirmDelivery(orderId: number): Promise<any> {
        const response = await api.post(
            API_ENDPOINTS.ORDERS.CONFIRM_DELIVERY(orderId)
        );

        if (!response.success) {
            throw new Error(
                response.error?.message ||
                'Failed to confirm delivery'
            );
        }

        return response.data;
    }


    
    // async sendDesignRevisionRequest(orderId, formData) {
    //     return await api.post(
    //     `/orders/${orderId}/revision`,
    //     formData,
    //     {
    //         headers: {
    //         'Content-Type': 'multipart/form-data'
    //         }
    //     }
    //     );
    // }

}

// Export singleton instance
export const orderService = OrderService.getInstance();
