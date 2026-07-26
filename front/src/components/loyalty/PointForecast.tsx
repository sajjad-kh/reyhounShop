import React from 'react';
import { usePointForecast } from '../../hooks/useLoyalty';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { cn } from '../../utils';

interface PointForecastProps {
    amount: number;
    className?: string;
}

export const PointForecast: React.FC<PointForecastProps> = ({ amount, className }) => {
    const { data, isLoading } = usePointForecast(amount);

    if (amount <= 0) return null;
    if (isLoading) return <LoadingSpinner size="sm" />;
    if (!data) return null;

    const hasBonus = data.bonus > 0 || data.multiplier > 1;

    return (
        <div
            className={cn(
                'glass-card bg-glass-light p-4 rounded-xl border border-accent-primary/20',
                className
            )}
        >
            <p className="text-sm text-text-secondary">
                این خرید{' '}
                <span className="font-bold text-accent-primary">
                    {data.points.toLocaleString('fa-IR')}
                </span>{' '}
                امتیاز برای شما می‌آورد
            </p>
            {hasBonus && (
                <p className="text-xs text-accent-primary/80 mt-1">
                    (پایه {data.basePoints.toLocaleString('fa-IR')} × ضریب {data.multiplier}
                    {data.bonus > 0 && ` + پاداش ${data.bonus.toLocaleString('fa-IR')}`})
                </p>
            )}
        </div>
    );
};

export default PointForecast;
