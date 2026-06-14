import { forwardRef, HTMLAttributes, useMemo } from 'react';
import { cn } from '../../utils';
import { useResponsive } from '../../hooks/useResponsive';
import { isSlowConnection } from '../../utils/performance';

export interface OptimizedGlassCardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'light' | 'medium' | 'heavy';
    hover?: boolean;
    adaptiveBlur?: boolean; // Reduce blur on mobile/slow connections
    className?: string;
}

const OptimizedGlassCard = forwardRef<HTMLDivElement, OptimizedGlassCardProps>(
    ({
        children,
        variant = 'light',
        hover = false,
        adaptiveBlur = true,
        className,
        ...props
    }, ref) => {
        const { isMobile } = useResponsive();
        const isSlowConn = useMemo(() => isSlowConnection(), []);

        // Reduce blur intensity on mobile or slow connections
        const shouldReduceBlur = adaptiveBlur && (isMobile || isSlowConn);

        const baseClasses = 'rounded-2xl border transition-all duration-300 ease-out p-6';

        const variantClasses = {
            light: shouldReduceBlur
                ? 'bg-glass-light backdrop-blur-[6px] border-glass-border-light'
                : 'glass-card',
            medium: shouldReduceBlur
                ? 'bg-glass-medium backdrop-blur-[8px] border-glass-border-light'
                : 'glass-card bg-glass-medium',
            heavy: shouldReduceBlur
                ? 'bg-glass-heavy backdrop-blur-[10px] border-glass-border-medium'
                : 'glass-card bg-glass-heavy border-border-glass-medium',
        };

        const hoverClasses = hover && !isMobile
            ? 'glass-card-hover cursor-pointer hover:shadow-glass-hover hover:brightness-110 hover:-translate-y-1'
            : hover && isMobile
                ? 'cursor-pointer active:scale-95 active:brightness-90'
                : '';

        return (
            <div
                ref={ref}
                className={cn(
                    baseClasses,
                    variantClasses[variant],
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

OptimizedGlassCard.displayName = 'OptimizedGlassCard';

export { OptimizedGlassCard };
