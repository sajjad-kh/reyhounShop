import React from 'react';
import { cn } from '../../utils';

export interface LoadingOverlayProps {
    message?: string;
    fullScreen?: boolean;
    transparent?: boolean;
}

/**
 * Loading overlay component for blocking UI during operations
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    message = 'در حال بارگذاری...',
    fullScreen = false,
    transparent = false,
}) => {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center',
                fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0',
                transparent ? 'bg-black/30 backdrop-blur-sm' : 'bg-gradient-primary'
            )}
        >
            {/* Spinner */}
            <div className="relative">
                <div className="w-16 h-16 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animation-delay-150" />
            </div>

            {/* Message */}
            {message && (
                <p className="text-white/80 mt-4 text-center px-4">{message}</p>
            )}
        </div>
    );
};

/**
 * Inline loading indicator for smaller spaces
 */
export const InlineLoader: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
    message,
    size = 'md',
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-3',
    };

    return (
        <div className="flex items-center gap-3">
            <div
                className={cn(
                    'border-white/20 border-t-blue-400 rounded-full animate-spin',
                    sizeClasses[size]
                )}
            />
            {message && <span className="text-white/80 text-sm">{message}</span>}
        </div>
    );
};
