import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import type { LoyaltyReward, LoyaltyRewardType } from '../../services/loyaltyService';

const REWARD_TYPE_LABELS: Record<LoyaltyRewardType, string> = {
    DISCOUNT: 'تخفیف',
    FREE_SHIPPING: 'ارسال رایگان',
    CREDIT: 'اعتبار',
    COUPON: 'کوپن',
};

interface RewardCardProps {
    reward: LoyaltyReward;
    userPoints: number;
}

export const RewardCard: React.FC<RewardCardProps> = ({
    reward,
    userPoints,
}) => {
    const affordable = reward.active && userPoints >= reward.requiredPoints;
    const label = REWARD_TYPE_LABELS[reward.rewardType] || reward.rewardType;

    return (
        <GlassCard className="flex flex-col p-5">
            <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="text-lg font-semibold text-text-primary">{reward.title}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-accent-primary/15 text-accent-primary whitespace-nowrap">
                    {label}
                </span>
            </div>
            <p className="text-sm text-text-secondary mb-4 flex-1">{reward.description}</p>
            <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">هزینه:</span>
                <span className="font-bold text-accent-primary">
                    {reward.requiredPoints.toLocaleString('fa-IR')} امتیاز
                </span>
            </div>
            {affordable && (
                <p className="mt-3 text-xs text-green-400">
                    امتیاز کافی دارید — در صفحه پرداخت خرج کنید
                </p>
            )}
        </GlassCard>
    );
};

export default RewardCard;
