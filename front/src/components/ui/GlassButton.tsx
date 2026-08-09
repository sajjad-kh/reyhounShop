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

        const baseClasses = 'glass-button relative overflow-hidden font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center';

        const variantClasses = {
            primary: 'bg-gradient-to-br from-accent-primary to-[#5670e0] text-white border-accent-primary/30 shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
            secondary: 'bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-sm text-text-secondary hover:text-text-primary border border-white/[0.08] hover:border-white/[0.2] transition-all duration-200',
            accent: 'bg-gradient-accent text-white border-transparent shadow-lg shadow-accent-secondary/20 hover:shadow-accent-secondary/30 hover:-translate-y-0.5 transition-all duration-200'
        };

        const sizeClasses = {
            sm: 'px-1.5 py-1 text-xs rounded-lg gap-1',
            md: 'px-4 py-2.5 text-base rounded-xl gap-2',
            lg: 'px-6 py-3 text-lg rounded-2xl gap-2'
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