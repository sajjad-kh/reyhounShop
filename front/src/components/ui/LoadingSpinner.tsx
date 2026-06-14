import React from 'react';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'secondary' | 'accent';
    className?: string;
    label?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
};

const variantClasses = {
    primary: 'border-white/20 border-t-blue-500',
    secondary: 'border-white/20 border-t-purple-500',
    accent: 'border-white/20 border-t-pink-500',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className = '',
    label,
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div
                className={`
                    ${sizeClasses[size]}
                    ${variantClasses[variant]}
                    rounded-full
                    animate-spin
                `}
                role="status"
                aria-label={label || 'Loading'}
            />
            {label && (
                <span className="text-sm text-white/70 font-medium">
                    {label}
                </span>
            )}
        </div>
    );
};

export default LoadingSpinner;
