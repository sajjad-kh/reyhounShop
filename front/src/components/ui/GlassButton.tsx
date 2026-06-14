import { forwardRef, ButtonHTMLAttributes, useState } from 'react';
import { cn } from '../../utils';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    ripple?: boolean;
    className?: string;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({
        children,
        variant = 'primary',
        size = 'md',
        loading = false,
        ripple = true,
        className,
        onClick,
        disabled,
        ...props
    }, ref) => {
        const [isRippling, setIsRippling] = useState(false);

        const baseClasses = 'glass-button relative overflow-hidden font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed';

        const variantClasses = {
            primary: 'bg-glass-medium hover:bg-glass-heavy text-text-primary border-border-glass-light',
            secondary: 'bg-glass-light hover:bg-glass-medium text-text-secondary border-border-glass-light',
            accent: 'bg-gradient-accent text-white border-transparent hover:brightness-110'
        };

        const sizeClasses = {
            sm: 'px-3 py-2 text-sm rounded-lg',
            md: 'px-4 py-2.5 text-base rounded-xl',
            lg: 'px-6 py-3 text-lg rounded-2xl'
        };

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (ripple && !disabled && !loading) {
                setIsRippling(true);
                setTimeout(() => setIsRippling(false), 600);
            }

            if (onClick && !disabled && !loading) {
                onClick(e);
            }
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseClasses,
                    variantClasses[variant],
                    sizeClasses[size],
                    ripple && 'ripple-effect',
                    isRippling && 'animate-pulse',
                    className
                )}
                onClick={handleClick}
                disabled={disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {loading ? (
                    <div className="flex items-center justify-center">
                        <div className="glass-spinner w-4 h-4 mr-2" />
                        <span>Loading...</span>
                    </div>
                ) : (
                    children
                )}

                {ripple && (
                    <span
                        className={cn(
                            'absolute inset-0 rounded-inherit pointer-events-none',
                            'before:content-[""] before:absolute before:top-1/2 before:left-1/2 before:w-0 before:h-0',
                            'before:rounded-full before:bg-white/30 before:transform before:-translate-x-1/2 before:-translate-y-1/2',
                            'before:transition-all before:duration-500',
                            isRippling && 'before:w-full before:h-full before:scale-150'
                        )}
                    />
                )}
            </button>
        );
    }
);

GlassButton.displayName = 'GlassButton';

export { GlassButton };