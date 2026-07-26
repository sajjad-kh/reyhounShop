import React from 'react';
import { GlassCard } from './GlassCard';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'secondary' | 'accent';
    className?: string;
    label?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-10 h-10 border-[3px]',
    xl: 'w-14 h-14 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = '',
    label,
    fullScreen = false,
}) => {
    const card = (
        <GlassCard className="p-8 text-center">
            <div
                className={`${sizeClasses[size]} border-[var(--glass-bg-light)] border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto ${label ? 'mb-4' : ''}`}
                role="status"
                aria-label={label || 'Loading'}
            />
            {label && <p className="text-text-secondary">{label}</p>}
        </GlassCard>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                {card}
            </div>
        );
    }

    return <div className={`flex items-center justify-center ${className}`}>{card}</div>;
};

export default LoadingSpinner;
