import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Gift } from 'lucide-react';
import { POINT_TO_RIAL, pointsToRial, rialToPoints } from '../../services/loyaltyService';

interface LoyaltyRedeemBoxProps {
    availablePoints: number;
    /** Max discount in rials the user may apply (order payable amount). */
    maxDiscountRial: number;
    pointsToUse: number;
    onChange: (points: number) => void;
}

export const LoyaltyRedeemBox: React.FC<LoyaltyRedeemBoxProps> = ({
    availablePoints,
    maxDiscountRial,
    pointsToUse,
    onChange,
}) => {
    if (availablePoints <= 0) return null;

    const maxPoints = Math.min(availablePoints, rialToPoints(maxDiscountRial));
    const safePoints = Math.max(0, Math.min(pointsToUse, maxPoints));
    const discount = pointsToRial(safePoints);

    return (
        <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-accent-primary" />
                <h3 className="text-base font-semibold text-text-primary">استفاده از امتیاز وفاداری</h3>
            </div>

            <p className="text-xs text-text-secondary mb-3">
                امتیاز در دسترس:{' '}
                <span className="font-bold text-text-primary">
                    {availablePoints.toLocaleString('fa-IR')}
                </span>{' '}
                (هر {POINT_TO_RIAL.toLocaleString('fa-IR')} امتیاز ={' '}
                {POINT_TO_RIAL.toLocaleString('fa-IR')} ریال)
            </p>

            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min={0}
                    max={maxPoints}
                    step={1}
                    value={safePoints}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 accent-accent-primary"
                />
                <input
                    type="number"
                    min={0}
                    max={maxPoints}
                    value={safePoints}
                    onChange={(e) => onChange(Number(e.target.value) || 0)}
                    className="w-24 glass-input bg-glass-light rounded-lg px-2 py-1 text-text-primary text-sm text-center"
                />
            </div>

            <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-text-secondary">تخفیف اعمال‌شده</span>
                <span className="font-bold text-green-400">
                    {discount > 0 ? `-${discount.toLocaleString('fa-IR')} ریال` : '۰ ریال'}
                </span>
            </div>

            {safePoints < maxPoints && maxPoints > 0 && (
                <button
                    type="button"
                    onClick={() => onChange(maxPoints)}
                    className="mt-2 text-xs text-accent-primary hover:underline"
                >
                    استفاده از حداکثر امتیاز ({maxPoints.toLocaleString('fa-IR')})
                </button>
            )}
        </GlassCard>
    );
};

export default LoyaltyRedeemBox;
