import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';

export interface PaymentMethod {
    id: string;
    name: string;
    type: 'STRIPE' | 'ZARINPAL' | 'PAYIR';
    enabled: boolean;
}

export interface PaymentRequest {
    orderId: number;
    paymentMethod: string;
    amount: number;
    returnUrl: string;
}

export interface PaymentResponse {
    success: boolean;
    paymentUrl?: string;
    transactionId: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface PaymentVerification {
    transactionId: string;
    orderId: number;
    status: 'COMPLETED' | 'FAILED';
    amount: number;
}

export class PaymentService {
    private static instance: PaymentService;

    private constructor() { }

    public static getInstance(): PaymentService {
        if (!PaymentService.instance) {
            PaymentService.instance = new PaymentService();
        }
        return PaymentService.instance;
    }

    /**
     * Get available payment methods
     */
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        try {
            const response = await api.get<PaymentMethod[]>(API_ENDPOINTS.PAYMENT.METHODS);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch payment methods:', error);
            return [];
        }
    }

    /**
     * Process payment
     */
    async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
        try {
            const response = await api.post<PaymentResponse>(
                API_ENDPOINTS.PAYMENT.PROCESS,
                request
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Payment processing failed');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Verify payment
     */
    async verifyPayment(transactionId: string): Promise<PaymentVerification> {
        try {
            const response = await api.post<PaymentVerification>(
                API_ENDPOINTS.PAYMENT.VERIFY,
                { transactionId }
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Payment verification failed');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle payment errors
     */
    private handleError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'Payment service error');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
