import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils';
import type { LoyaltyPointsData, TierBenefits } from '../../services/loyaltyService';
import { Truck, Gift, Percent, CalendarDays, Star, RotateCcw, PackageCheck, Crown } from 'lucide-react';

interface LoyaltyProgressProps {
    data: LoyaltyPointsData;
    className?: string;
}

const BENEFIT_LABELS: { key: keyof TierBenefits; label: string; icon: React.ReactNode; format?: (v: unknown) => string }[] = [
    { key: 'discountPercent', label: 'تخفیف سفارش', icon: <Percent className="w-4 h-4" />, format: (v) => v ? `${v}%` : '' },
    { key: 'freeShipping', label: 'ارسال رایگان', icon: <Truck className="w-4 h-4" />, format: (v) => v ? 'فعال' : '' },
    { key: 'freeShippingMinOrder', label: 'حداقل سفارش ارسال رایگان', icon: <Truck className="w-4 h-4" />, format: (v) => v ? `${Number(v).toLocaleString('fa-IR')} ریال` : '' },
    { key: 'giftWrappingFree', label: 'بسته‌بندی هدیه رایگان', icon: <Gift className="w-4 h-4" />, format: (v) => v ? 'فعال' : '' },
    { key: 'birthdayPointsBonus', label: 'امتیاز اضافی تولد', icon: <CalendarDays className="w-4 h-4" />, format: (v) => v ? `+${v}` : '' },
    { key: 'returnDays', label: 'روزهای مهلت مرجوعی', icon: <RotateCcw className="w-4 h-4" />, format: (v) => v ? `${v} روز` : '' },
    { key: 'annualGift', label: 'هدیه سالانه', icon: <PackageCheck className="w-4 h-4" />, format: (v) => v ? 'فعال' : '' },
    { key: 'pointsMultiplier', label: 'ضریب امتیاز', icon: <Star className="w-4 h-4" />, format: (v) => v && Number(v) > 1 ? `${v}x` : '' },
];

function isBenefitActive(key: keyof TierBenefits, val: unknown): boolean {
    if (key === 'discountPercent' || key === 'birthdayPointsBonus' || key === 'returnDays') return Number(val) > 0;
    if (key === 'freeShippingMinOrder') return false;
    if (key === 'pointsMultiplier') return Number(val) > 1;
    return !!val;
}

export const LoyaltyProgress: React.FC<LoyaltyProgressProps> = ({ data, className }) => {
    const { tier, nextTier, availablePoints } = data;

    const current = availablePoints;
    const target = nextTier?.minPoints ?? current;
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;
    const remaining = nextTier ? Math.max(0, nextTier.minPoints - current) : 0;

    const barColor = tier?.color || '#a777e0';
    const benefits = tier?.benefits ?? null;

    return (
        <GlassCard className={cn('p-6', className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {tier ? (
                        <span
                            className="px-3 py-1 rounded-full text-sm font-semibold text-white flex items-center gap-1.5"
                            style={{ backgroundColor: tier.color || '#6e8efb' }}
                        >
                            <Crown className="w-3.5 h-3.5" />
                            {tier.label}
                        </span>
                    ) : (
                        <span className="text-text-secondary text-sm">بدون سطح</span>
                    )}
                </div>
                <div className="text-left">
                    <p className="text-text-secondary text-xs">امتیاز فعلی</p>
                    <p className="text-xl font-bold text-text-primary">
                        {current.toLocaleString('fa-IR')}
                    </p>
                </div>
            </div>

            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: barColor }}
                />
            </div>

            <div className="mt-3 text-sm">
                {nextTier ? (
                    <p className="text-text-secondary">
                        <span className="font-semibold text-accent-primary">
                            {remaining.toLocaleString('fa-IR')}
                        </span>{' '}
                        امتیاز تا سطح{' '}
                        <span className="font-semibold text-text-primary">{nextTier.label}</span>
                    </p>
                ) : (
                    <p className="text-accent-primary font-semibold">
                        شما در بالاترین سطح هستید
                    </p>
                )}
            </div>

            {benefits && (
                <div className="mt-4 pt-4 border-t border-border-glass-light">
                    <p className="text-sm font-semibold text-text-primary mb-2">مزایای سطح {tier?.label}:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {BENEFIT_LABELS.map(({ key, label, icon, format }) => {
                            const val = benefits[key];
                            const active = isBenefitActive(key, val);
                            const display = format?.(val);
                            if (!active && !display) return null;
                            return (
                                <div
                                    key={key}
                                    className={cn(
                                        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
                                        active
                                            ? 'bg-accent-primary/10 text-accent-primary'
                                            : 'bg-glass-light text-text-muted'
                                    )}
                                >
                                    {icon}
                                    <span>{display || label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </GlassCard>
    );
};

export default LoyaltyProgress;
