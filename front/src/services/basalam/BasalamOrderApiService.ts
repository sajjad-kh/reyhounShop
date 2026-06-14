/**
 * Basalam Order API Service
 * Handles all API calls related to Basalam orders
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
    OrderData,
    CreateOrderResponse,
    OrderFilters,
    OrderDetails,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    SyncOrderResponse,
    OrderListResponse,
    BasalamError,
    BasalamErrorType,
} from '../../types/basalam';

class BasalamOrderApiService {
    private apiClient: AxiosInstance;

    constructor() {
        this.apiClient = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add auth token interceptor
        this.apiClient.interceptors.request.use((config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Add response error interceptor
        this.apiClient.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                return Promise.reject(this.handleError(error));
            }
        );
    }

    /**
     * Handle API errors and convert to BasalamError
     */
    private handleError(error: AxiosError): BasalamError {
        // Network error
        if (!error.response) {
            return new BasalamError(
                BasalamErrorType.NETWORK_ERROR,
                'خطا در برقراری ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.',
                error
            );
        }

        const status = error.response.status;
        const data = error.response.data as any;

        // Authentication error
        if (status === 401) {
            return new BasalamError(
                BasalamErrorType.AUTH_ERROR,
                'لطفا دوباره وارد شوید.',
                data
            );
        }

        // Validation error
        if (status === 400) {
            return new BasalamError(
                BasalamErrorType.VALIDATION_ERROR,
                data?.message || 'اطلاعات وارد شده نامعتبر است.',
                data
            );
        }

        // Not found error
        if (status === 404) {
            return new BasalamError(
                BasalamErrorType.ORDER_NOT_FOUND,
                'سفارش مورد نظر یافت نشد.',
                data
            );
        }

        // Product unavailable
        if (status === 409 && data?.type === 'PRODUCT_UNAVAILABLE') {
            return new BasalamError(
                BasalamErrorType.PRODUCT_UNAVAILABLE,
                data?.message || 'محصول موجود نیست.',
                data
            );
        }

        // Payment failed
        if (status === 402 || (status === 400 && data?.type === 'PAYMENT_FAILED')) {
            return new BasalamError(
                BasalamErrorType.PAYMENT_FAILED,
                data?.message || 'پرداخت ناموفق بود.',
                data
            );
        }

        // Order creation failed
        if (status === 500 && data?.type === 'ORDER_CREATION_FAILED') {
            return new BasalamError(
                BasalamErrorType.ORDER_CREATION_FAILED,
                data?.message || 'خطا در ثبت سفارش. لطفا دوباره تلاش کنید.',
                data
            );
        }

        // Generic server error
        return new BasalamError(
            BasalamErrorType.NETWORK_ERROR,
            data?.message || 'خطای سرور. لطفا بعدا تلاش کنید.',
            data
        );
    }

    /**
     * Create a new order in Basalam
     */
    async createOrder(orderData: OrderData): Promise<CreateOrderResponse> {
        try {
            const response = await this.apiClient.post<CreateOrderResponse>(
                '/api/v1/basalam/orders',
                orderData
            );
            return response.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.ORDER_CREATION_FAILED,
                'خطا در ثبت سفارش. لطفا دوباره تلاش کنید.',
                error
            );
        }
    }

    /**
     * Initiate checkout with Basalam products
     */
    async checkout(checkoutData: {
        addressId: number;
        shippingMethodId: number;
        callbackUrl?: string;
    }): Promise<{
        orderId: number;
        basalamOrderId: number;
        paymentUrl: string;
        totalAmount: number;
    }> {
        try {
            const response = await this.apiClient.post(
                '/api/v1/basalam/checkout',
                checkoutData
            );
            return response.data.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.ORDER_CREATION_FAILED,
                'خطا در ثبت سفارش. لطفا دوباره تلاش کنید.',
                error
            );
        }
    }

    /**
     * Get list of orders with pagination and filtering
     */
    async getOrders(filters: OrderFilters = {}): Promise<OrderListResponse> {
        try {
            const response = await this.apiClient.get<OrderListResponse>(
                '/api/v1/basalam/orders',
                { params: filters }
            );
            return response.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.NETWORK_ERROR,
                'خطا در دریافت لیست سفارشات.',
                error
            );
        }
    }

    /**
     * Get detailed information about a specific order
     */
    async getOrderDetails(orderId: number): Promise<OrderDetails> {
        try {
            const response = await this.apiClient.get<OrderDetails>(
                `/api/v1/basalam/orders/${orderId}`
            );
            return response.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.ORDER_NOT_FOUND,
                'خطا در دریافت جزئیات سفارش.',
                error
            );
        }
    }

    /**
     * Verify payment after callback from payment gateway
     */
    async verifyPayment(
        orderId: number,
        paymentData: VerifyPaymentRequest
    ): Promise<VerifyPaymentResponse> {
        try {
            const response = await this.apiClient.post<VerifyPaymentResponse>(
                `/api/v1/basalam/orders/${orderId}/verify`,
                paymentData
            );
            return response.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.PAYMENT_FAILED,
                'خطا در تایید پرداخت.',
                error
            );
        }
    }

    /**
     * Sync order status with Basalam API
     */
    async syncOrderStatus(orderId: number): Promise<SyncOrderResponse> {
        try {
            const response = await this.apiClient.post<SyncOrderResponse>(
                `/api/v1/basalam/orders/${orderId}/sync`
            );
            return response.data;
        } catch (error) {
            if (error instanceof BasalamError) {
                throw error;
            }
            throw new BasalamError(
                BasalamErrorType.NETWORK_ERROR,
                'خطا در به‌روزرسانی وضعیت سفارش.',
                error
            );
        }
    }
}

export default new BasalamOrderApiService();
