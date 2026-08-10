import React from 'react';

type GlowSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
type GlowPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type GlowColor = 'accent' | 'success' | 'warning' | 'error' | 'purple';

function cn(...inputs: (string | undefined)[]) {
    return inputs.filter(Boolean).join(' ');
}

interface GlowCircleProps {
    size?: GlowSize;
    color?: GlowColor;
    position?: GlowPosition;
    opacity?: number;
    className?: string;
}

const sizeClasses: Record<GlowSize, string> = {
    xs: 'w-10 h-10',
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-40 h-40',
    '3xl': 'w-52 h-52',
};

const offsetMap: Record<GlowPosition, Record<GlowSize, string>> = {
    'top-right': { xs: 'top-1 right-1', sm: 'top-1 right-1', md: 'top-1 right-1', lg: 'top-1 right-1', xl: 'top-1 right-1', '2xl': 'top-1 right-1', '3xl': 'top-1 right-1' },
    'top-left': { xs: 'top-1 left-1', sm: 'top-1 left-1', md: 'top-1 left-1', lg: 'top-1 left-1', xl: 'top-1 left-1', '2xl': 'top-1 left-1', '3xl': 'top-1 left-1' },
    'bottom-right': { xs: 'bottom-1 right-1', sm: 'bottom-1 right-1', md: 'bottom-1 right-1', lg: 'bottom-1 right-1', xl: 'bottom-1 right-1', '2xl': 'bottom-1 right-1', '3xl': 'bottom-1 right-1' },
    'bottom-left': { xs: 'bottom-1 left-1', sm: 'bottom-1 left-1', md: 'bottom-1 left-1', lg: 'bottom-1 left-1', xl: 'bottom-2 left-2', '2xl': 'bottom-2 left-2', '3xl': 'bottom-2 left-2' },
};

const colorClasses: Record<GlowColor, string> = {
    accent: 'bg-accent-primary',
    success: 'bg-success-color',
    warning: 'bg-warning-color',
    error: 'bg-error-color',
    purple: 'bg-accent-secondary',
};

export const GlowCircle: React.FC<GlowCircleProps> = ({
    size = 'md',
    color = 'accent',
    position = 'top-right',
    opacity = 0.4,
    className,
}) => {
    const classes = cn(
        'absolute rounded-full blur-2xl pointer-events-none',
        sizeClasses[size],
        offsetMap[position][size],
        colorClasses[color],
        className
    );

    return <div className={classes} style={{ opacity }} aria-hidden="true" />;
};

export type { GlowSize, GlowPosition, GlowColor };
export default GlowCircle;
