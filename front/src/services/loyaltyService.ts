import { api } from '../utils/api';

// 1 loyalty point = POINT_TO_RIAL rials (must match backend loyaltyService.POINT_TO_RIAL)
export const POINT_TO_RIAL = 1000;
export const pointsToRial = (points: number) => Math.max(0, Math.floor(points)) * POINT_TO_RIAL;
export const rialToPoints = (rial: number) =>
    Math.floor(Math.max(0, Math.floor(rial)) / POINT_TO_RIAL);

// ===================== Types =====================

export interface TierBenefits {
    discountPercent: number;
    freeShipping: boolean;
    freeShippingMinOrder: number;
    giftWrappingFree: boolean;
    birthdayPointsBonus: number;
    returnDays: number;
    annualGift: boolean;
    pointsMultiplier: number;
}

export interface LoyaltyTierRef {
    name: string;
    label: string;
    color: string | null;
    benefits?: TierBenefits | null;
}

export interface LoyaltyNextTierRef {
    name: string;
    label: string;
    minPoints: number;
}

export interface LoyaltyReferralReferred {
    name: string;
    status: string;
    pointsEarned: number;
    createdAt?: string;
    registeredAt?: string;
    firstOrderAt?: string | null;
}

export interface LoyaltyReferral {
    code: string;
    inviteUrl: string;
    referrals: LoyaltyReferralReferred[];
    totalReferred: number;
    totalEarned: number;
}

export interface AdminReferral {
    id: number | string;
    referrerId: number | string;
    referredId: number | string | null;
    status: string;
    referrerPoints: number;
    createdAt?: string;
    referrer?: { id: number | string; name?: string | null } | null;
    referred?: { id: number | string; name?: string | null } | null;
}

export interface LoyaltyPointsData {
    availablePoints: number;
    pendingPoints: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    lifetimeExpired: number;
    tier: LoyaltyTierRef | null;
    nextTier: LoyaltyNextTierRef | null;
    pointsToNext: number;
    expiringSoon: number;
    referral: LoyaltyReferral;
}

export type LoyaltyTransactionSourceType = 'earned' | 'redeemed';
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired';

export interface LoyaltyTransaction {
    id: number;
    points: number;
    type: LoyaltyTransactionType;
    source: string;
    description: string;
    reference?: string;
    orderId?: number;
    campaign?: string;
    rule?: string;
    balanceAfter?: number;
    expireDate?: string;
    createdAt: string;
}

export interface LoyaltyTransactionsResponse {
    transactions: LoyaltyTransaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface LoyaltyTier {
    id: number;
    name: string;
    label: string;
    minPoints: number;
    maxPoints: number | null;
    color: string;
    benefits: TierBenefits | null;
}

export type LoyaltyRewardType = 'DISCOUNT' | 'FREE_SHIPPING' | 'CREDIT' | 'COUPON';

export interface LoyaltyReward {
    id: number;
    title: string;
    description: string;
    requiredPoints: number;
    rewardType: LoyaltyRewardType;
    rewardValue: number;
    rewardValueType: string;
    active: boolean;
    limit: number | null;
    redeemedCount: number;
}

export interface LoyaltyForecast {
    amount: number;
    basePoints: number;
    multiplier: number;
    bonus: number;
    points: number;
}

export interface ExpiringTransaction {
    id: number;
    points: number;
    expireDate: string;
    description: string;
}

export interface LoyaltyExpiration {
    expiringTransactions: ExpiringTransaction[];
    totalExpiringPoints: number;
    policy: Record<string, unknown>;
}

export interface LoyaltyCampaign {
    id: number;
    title: string;
    description: string;
    multiplier: number;
    bonus: number;
    startDate: string;
    endDate: string;
    conditions: Record<string, unknown>;
}

export interface DailyLoginResponse {
    points?: number;
    skipped?: boolean;
    reason?: string;
}

export interface BirthdayResponse {
    points?: number;
    skipped?: boolean;
    reason?: string;
}

export interface LoyaltyAdminStats {
    totalIssued: number;
    totalRedeemed: number;
    totalExpired: number;
    activeUsers: number;
    totalTransactions: number;
    pendingPoints: number;
    tierDistribution: { tier: string; count: number }[];
}

export interface LoyaltyRule {
    id: number;
    event: string;
    points: number;
    conditions: Record<string, unknown>;
    active?: boolean;
    [key: string]: unknown;
}

export interface AdminTierInput {
    name: string;
    label: string;
    minPoints: number;
    maxPoints: number | null;
    color: string;
    benefits: TierBenefits;
}

export interface AdminRuleInput {
    event: string;
    points: number;
    conditions: Record<string, unknown>;
}

export interface AdminCampaignInput {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    multiplier: number;
    bonus: number;
    priority?: number;
    conditions: Record<string, unknown>;
    isActive?: boolean;
}

export interface AdminRewardInput {
    title: string;
    description: string;
    requiredPoints: number;
    rewardType: LoyaltyRewardType;
    rewardValue: number;
    rewardValueType: string;
    active?: boolean;
    limit?: number | null;
}

export interface AdminAdjustInput {
    userId: number;
    points: number;
    reason: string;
}

// ===================== Service =====================

interface ApiResult<T> {
    success: boolean;
    data?: T;
    message?: string;
}

class LoyaltyService {
    private static instance: LoyaltyService;

    private constructor() { }

    public static getInstance(): LoyaltyService {
        if (!LoyaltyService.instance) {
            LoyaltyService.instance = new LoyaltyService();
        }
        return LoyaltyService.instance;
    }

    private unwrap<T>(res: ApiResult<T>): T {
        if (res.success && res.data !== undefined) {
            return res.data;
        }
        throw new Error(res.message || 'خطا در دریافت اطلاعات وفاداری');
    }

    // ----- USER -----
    async getPoints(): Promise<LoyaltyPointsData> {
        const res = await api.get<LoyaltyPointsData>('/loyalty/points');
        return this.unwrap(res);
    }

    async getTransactions(
        page = 1,
        limit = 20,
        type?: LoyaltyTransactionSourceType
    ): Promise<LoyaltyTransactionsResponse> {
        const params: Record<string, unknown> = { page, limit };
        if (type) params.type = type;
        const res = await api.get<LoyaltyTransactionsResponse>('/loyalty/transactions', { params });
        return this.unwrap(res);
    }

    async getTiers(): Promise<LoyaltyTier[]> {
        const res = await api.get<LoyaltyTier[]>('/loyalty/tiers');
        return this.unwrap(res);
    }

    async getRewards(): Promise<LoyaltyReward[]> {
        const res = await api.get<LoyaltyReward[]>('/loyalty/rewards');
        return this.unwrap(res);
    }

    async getReferral(): Promise<LoyaltyReferral> {
        const res = await api.get<LoyaltyReferral>('/loyalty/referral');
        return this.unwrap(res);
    }

    async dailyLogin(): Promise<DailyLoginResponse> {
        const res = await api.post<DailyLoginResponse>('/loyalty/daily-login');
        return this.unwrap(res);
    }

    async claimBirthday(): Promise<BirthdayResponse> {
        const res = await api.post<BirthdayResponse>('/loyalty/birthday');
        return this.unwrap(res);
    }

    async getForecast(amount: number): Promise<LoyaltyForecast> {
        const res = await api.get<LoyaltyForecast>('/loyalty/forecast', { params: { amount } });
        return this.unwrap(res);
    }

    async getExpiration(): Promise<LoyaltyExpiration> {
        const res = await api.get<LoyaltyExpiration>('/loyalty/expiration');
        return this.unwrap(res);
    }

    async getCampaigns(): Promise<LoyaltyCampaign[]> {
        const res = await api.get<LoyaltyCampaign[]>('/loyalty/campaigns');
        return this.unwrap(res);
    }

    // ----- ADMIN -----
    async getAdminStats(): Promise<LoyaltyAdminStats> {
        const res = await api.get<LoyaltyAdminStats>('/loyalty/admin/stats');
        return this.unwrap(res);
    }

    async adminAdjust(input: AdminAdjustInput): Promise<void> {
        const res = await api.post('/loyalty/admin/adjust', input);
        this.unwrap(res);
    }

    async adminSeed(): Promise<void> {
        const res = await api.post('/loyalty/admin/seed');
        this.unwrap(res);
    }

    async adminExpirePoints(): Promise<void> {
        const res = await api.post('/loyalty/admin/expire-points');
        this.unwrap(res);
    }

    async adminFinalize(orderId: number): Promise<void> {
        const res = await api.post(`/loyalty/admin/finalize/${orderId}`);
        this.unwrap(res);
    }

    async getAdminTiers(): Promise<LoyaltyTier[]> {
        const res = await api.get<LoyaltyTier[]>('/loyalty/admin/tiers');
        return this.unwrap(res);
    }

    async createAdminTier(input: AdminTierInput): Promise<LoyaltyTier> {
        const res = await api.post<LoyaltyTier>('/loyalty/admin/tiers', input);
        return this.unwrap(res);
    }

    async updateAdminTier(id: number, input: Partial<AdminTierInput>): Promise<LoyaltyTier> {
        const res = await api.put<LoyaltyTier>(`/loyalty/admin/tiers/${id}`, input);
        return this.unwrap(res);
    }

    async getAdminRules(): Promise<LoyaltyRule[]> {
        const res = await api.get<LoyaltyRule[]>('/loyalty/admin/rules');
        return this.unwrap(res);
    }

    async createAdminRule(input: AdminRuleInput): Promise<LoyaltyRule> {
        const res = await api.post<LoyaltyRule>('/loyalty/admin/rules', input);
        return this.unwrap(res);
    }

    async updateAdminRule(id: number, input: Partial<AdminRuleInput>): Promise<LoyaltyRule> {
        const res = await api.put<LoyaltyRule>(`/loyalty/admin/rules/${id}`, input);
        return this.unwrap(res);
    }

    async getAdminCampaigns(): Promise<LoyaltyCampaign[]> {
        const res = await api.get<LoyaltyCampaign[]>('/loyalty/admin/campaigns');
        return this.unwrap(res);
    }

    async createAdminCampaign(input: AdminCampaignInput): Promise<LoyaltyCampaign> {
        const res = await api.post<LoyaltyCampaign>('/loyalty/admin/campaigns', input);
        return this.unwrap(res);
    }

    async updateAdminCampaign(id: number, input: Partial<AdminCampaignInput>): Promise<LoyaltyCampaign> {
        const res = await api.put<LoyaltyCampaign>(`/loyalty/admin/campaigns/${id}`, input);
        return this.unwrap(res);
    }

    async deleteAdminCampaign(id: number): Promise<void> {
        const res = await api.delete(`/loyalty/admin/campaigns/${id}`);
        this.unwrap(res);
    }

    async createAdminReward(input: AdminRewardInput): Promise<LoyaltyReward> {
        const res = await api.post<LoyaltyReward>('/loyalty/admin/rewards', input);
        return this.unwrap(res);
    }

    async updateAdminReward(id: number, input: Partial<AdminRewardInput>): Promise<LoyaltyReward> {
        const res = await api.put<LoyaltyReward>(`/loyalty/admin/rewards/${id}`, input);
        return this.unwrap(res);
    }

    async deleteAdminReward(id: number): Promise<void> {
        const res = await api.delete(`/loyalty/admin/rewards/${id}`);
        this.unwrap(res);
    }

    async deleteAdminTier(id: number): Promise<void> {
        const res = await api.delete(`/loyalty/admin/tiers/${id}`);
        this.unwrap(res);
    }

    async deleteAdminRule(id: number): Promise<void> {
        const res = await api.delete(`/loyalty/admin/rules/${id}`);
        this.unwrap(res);
    }

    async getAdminReferrals(): Promise<AdminReferral[]> {
        const res = await api.get<LoyaltyReferral[]>('/loyalty/admin/referrals');
        return this.unwrap(res);
    }
}

export const loyaltyService = LoyaltyService.getInstance();
