import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'light' | 'medium' | 'heavy';
    hover?: boolean;
    blur?: 'light' | 'medium' | 'heavy';
    className?: string;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({
        children,
        variant = 'light',
        hover = false,
        blur = 'medium',
        className,
        ...props
    }, ref) => {
        // Use the existing glass-card class as base with custom variants
        const baseClasses = 'rounded-2xl border transition-all duration-300 ease-out p-6';

        const variantClasses = {
            light: 'glass-card',
            medium: 'glass-card bg-glass-medium',
            heavy: 'glass-card bg-glass-heavy border-border-glass-medium'
        };

        const blurClasses = {
            light: 'backdrop-blur-[8px]',
            medium: 'backdrop-blur-[12px]',
            heavy: 'backdrop-blur-[16px]'
        };

        const hoverClasses = hover
            ? 'glass-card-hover cursor-pointer hover:shadow-glass-hover hover:brightness-110 hover:-translate-y-1'
            : '';

        return (
            <div
                ref={ref}
                className={cn(
                    baseClasses,
                    variantClasses[variant],
                    blurClasses[blur],
                    hoverClasses,
                    className
                )}
                role="region"
                tabIndex={hover ? 0 : undefined}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };