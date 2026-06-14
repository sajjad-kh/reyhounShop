import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';

export interface LoyaltyTransaction {
    id: number;
    userId: number;
    type: 'EARNED' | 'REDEEMED' | 'EXPIRED';
    points: number;
    description: string;
    orderId?: number;
    createdAt: string;
}

export interface LoyaltyBalance {
    totalPoints: number;
    availablePoints: number;
    pendingPoints: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
}

export interface RedeemPointsRequest {
    points: number;
    orderId?: number;
}

export interface RedeemPointsResponse {
    success: boolean;
    discountAmount: number;
    remainingPoints: number;
}

export class LoyaltyService {
    private static instance: LoyaltyService;

    private constructor() { }

    public static getInstance(): LoyaltyService {
        if (!LoyaltyService.instance) {
            LoyaltyService.instance = new LoyaltyService();
        }
        return LoyaltyService.instance;
    }

    /**
     * Get loyalty points balance
     */
    async getBalance(): Promise<LoyaltyBalance> {
        try {
            const response = await api.get<LoyaltyBalance>(API_ENDPOINTS.USER.LOYALTY_POINTS);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to fetch loyalty balance');
        } catch (error) {
            console.error('Failed to fetch loyalty balance:', error);
            throw error;
        }
    }

    /**
     * Get loyalty transaction history
     */
    async getTransactions(page: number = 1, limit: number = 20): Promise<LoyaltyTransaction[]> {
        try {
            const response = await api.get<LoyaltyTransaction[]>(
                `${API_ENDPOINTS.USER.LOYALTY_POINTS}/transactions`,
                { params: { page, limit } }
            );

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch loyalty transactions:', error);
            throw error;
        }
    }

    /**
     * Redeem loyalty points
     */
    async redeemPoints(request: RedeemPointsRequest): Promise<RedeemPointsResponse> {
        try {
            const response = await api.post<RedeemPointsResponse>(
                `${API_ENDPOINTS.USER.LOYALTY_POINTS}/redeem`,
                request
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to redeem points');
        } catch (error) {
            console.error('Failed to redeem points:', error);
            throw error;
        }
    }

    /**
     * Calculate discount from points
     */
    calculateDiscount(points: number, conversionRate: number = 0.01): number {
        return points * conversionRate;
    }

    /**
     * Calculate points from amount
     */
    calculatePoints(amount: number, earnRate: number = 1): number {
        return Math.floor(amount * earnRate);
    }
}

// Export singleton instance
export const loyaltyService = LoyaltyService.getInstance();
