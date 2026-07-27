import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyService } from '../services/loyaltyService';
import { useAuth } from '../context/AuthContext';
import type {
    LoyaltyTransactionSourceType,
    LoyaltyPointsData,
    AdminTierInput,
    AdminRuleInput,
    AdminCampaignInput,
    AdminRewardInput,
    AdminAdjustInput,
} from '../services/loyaltyService';

export const loyaltyKeys = {
    points: ['loyalty', 'points'] as const,
    transactions: (page: number, type?: LoyaltyTransactionSourceType) =>
        ['loyalty', 'transactions', page, type ?? 'all'] as const,
    tiers: ['loyalty', 'tiers'] as const,
    rewards: ['loyalty', 'rewards'] as const,
    referral: ['loyalty', 'referral'] as const,
    expiration: ['loyalty', 'expiration'] as const,
    campaigns: ['loyalty', 'campaigns'] as const,
    forecast: (amount: number) => ['loyalty', 'forecast', amount] as const,
    adminStats: ['loyalty', 'admin', 'stats'] as const,
    adminTiers: ['loyalty', 'admin', 'tiers'] as const,
    adminRules: ['loyalty', 'admin', 'rules'] as const,
    adminCampaigns: ['loyalty', 'admin', 'campaigns'] as const,
    adminRewards: ['loyalty', 'admin', 'rewards'] as const,
    adminReferrals: ['loyalty', 'admin', 'referrals'] as const,
};

// ===================== User hooks =====================

export const useLoyaltyPoints = (userId?: number | string) =>
    useQuery({
        queryKey: userId ? ['loyalty', 'points', String(userId)] : loyaltyKeys.points,
        queryFn: () => loyaltyService.getPoints(),
        refetchOnWindowFocus: true,
        staleTime: 0,
        refetchOnMount: true,
        enabled: !!userId,
    });

export const useLoyaltyTransactions = (page = 1, type?: LoyaltyTransactionSourceType) =>
    useQuery({
        queryKey: loyaltyKeys.transactions(page, type),
        queryFn: () => loyaltyService.getTransactions(page, 20, type),
        staleTime: 0,
        refetchOnMount: 'always',
    });

export const useLoyaltyTiers = () =>
    useQuery({ queryKey: loyaltyKeys.tiers, queryFn: () => loyaltyService.getTiers() });

export const useLoyaltyRewards = () =>
    useQuery({ queryKey: loyaltyKeys.rewards, queryFn: () => loyaltyService.getRewards() });

export const useReferral = () =>
    useQuery({ queryKey: loyaltyKeys.referral, queryFn: () => loyaltyService.getReferral() });

export const useLoyaltyExpiration = () =>
    useQuery({ queryKey: loyaltyKeys.expiration, queryFn: () => loyaltyService.getExpiration() });

export const useActiveCampaigns = () =>
    useQuery({ queryKey: loyaltyKeys.campaigns, queryFn: () => loyaltyService.getCampaigns() });

export const usePointForecast = (amount: number) =>
    useQuery({
        queryKey: loyaltyKeys.forecast(amount),
        queryFn: () => loyaltyService.getForecast(amount),
        enabled: amount > 0,
    });

export const useDailyLogin = () => {
    const qc = useQueryClient();
    const { state } = useAuth();
    const userId = state.user?.id;
    return useMutation({
        mutationFn: () => loyaltyService.dailyLogin(),
        onSuccess: (res) => {
            if (userId && res && !res.skipped && res.points) {
                const pts = res.points;
                const key = ['loyalty', 'points', String(userId)];
                qc.setQueryData<LoyaltyPointsData | undefined>(key, (prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        availablePoints: prev.availablePoints + pts,
                        lifetimeEarned: prev.lifetimeEarned + pts,
                    };
                });
                qc.invalidateQueries({ queryKey: key });
            }
            qc.invalidateQueries({ queryKey: loyaltyKeys.tiers });
            qc.invalidateQueries({ queryKey: ['loyalty', 'transactions'], refetchType: 'all' });
        },
    });
};

export const useBirthday = () => {
    const qc = useQueryClient();
    const { state } = useAuth();
    const userId = state.user?.id;
    return useMutation({
        mutationFn: () => loyaltyService.claimBirthday(),
        onSuccess: (res) => {
            if (userId && res && !res.skipped && res.points) {
                const pts = res.points;
                const key = ['loyalty', 'points', String(userId)];
                qc.setQueryData<LoyaltyPointsData | undefined>(key, (prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        availablePoints: prev.availablePoints + pts,
                        lifetimeEarned: prev.lifetimeEarned + pts,
                    };
                });
                qc.invalidateQueries({ queryKey: key });
            }
            qc.invalidateQueries({ queryKey: loyaltyKeys.tiers });
            qc.invalidateQueries({ queryKey: ['loyalty', 'transactions'], refetchType: 'all' });
        },
    });
};

// ===================== Admin hooks =====================

export const useLoyaltyAdminStats = () =>
    useQuery({ queryKey: loyaltyKeys.adminStats, queryFn: () => loyaltyService.getAdminStats() });

export const useAdminTiers = () =>
    useQuery({ queryKey: loyaltyKeys.adminTiers, queryFn: () => loyaltyService.getAdminTiers() });

export const useAdminRules = () =>
    useQuery({ queryKey: loyaltyKeys.adminRules, queryFn: () => loyaltyService.getAdminRules() });

export const useAdminCampaigns = () =>
    useQuery({ queryKey: loyaltyKeys.adminCampaigns, queryFn: () => loyaltyService.getAdminCampaigns() });

export const useAdminRewards = () =>
    useQuery({ queryKey: loyaltyKeys.adminRewards, queryFn: () => loyaltyService.getRewards() });

export const useAdminReferrals = () =>
    useQuery({ queryKey: loyaltyKeys.adminReferrals, queryFn: () => loyaltyService.getAdminReferrals() });

export const useAdminAdjust = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminAdjustInput) => loyaltyService.adminAdjust(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminStats }),
    });
};

export const useAdminSeed = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => loyaltyService.adminSeed(),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminStats }),
    });
};

export const useAdminExpirePoints = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => loyaltyService.adminExpirePoints(),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminStats }),
    });
};

export const useAdminFinalize = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (orderId: number) => loyaltyService.adminFinalize(orderId),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminStats }),
    });
};

export const useCreateAdminTier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminTierInput) => loyaltyService.createAdminTier(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminTiers }),
    });
};

export const useUpdateAdminTier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<AdminTierInput> }) =>
            loyaltyService.updateAdminTier(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminTiers }),
    });
};

export const useCreateAdminRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminRuleInput) => loyaltyService.createAdminRule(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRules }),
    });
};

export const useUpdateAdminRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<AdminRuleInput> }) =>
            loyaltyService.updateAdminRule(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRules }),
    });
};

export const useCreateAdminCampaign = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminCampaignInput) => loyaltyService.createAdminCampaign(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminCampaigns }),
    });
};

export const useUpdateAdminCampaign = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<AdminCampaignInput> }) =>
            loyaltyService.updateAdminCampaign(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminCampaigns }),
    });
};

export const useDeleteAdminCampaign = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => loyaltyService.deleteAdminCampaign(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminCampaigns }),
    });
};

export const useCreateAdminReward = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminRewardInput) => loyaltyService.createAdminReward(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRewards }),
    });
};

export const useUpdateAdminReward = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<AdminRewardInput> }) =>
            loyaltyService.updateAdminReward(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRewards }),
    });
};

export const useDeleteAdminReward = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => loyaltyService.deleteAdminReward(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRewards }),
    });
};

export const useDeleteAdminTier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => loyaltyService.deleteAdminTier(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminTiers }),
    });
};

export const useDeleteAdminRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => loyaltyService.deleteAdminRule(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: loyaltyKeys.adminRules }),
    });
};
