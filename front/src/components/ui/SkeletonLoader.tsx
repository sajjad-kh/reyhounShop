import React from 'react';

export interface SkeletonLoaderProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'product';
    width?: string | number;
    height?: string | number;
    className?: string;
    count?: number;
    animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'rectangular',
    width,
    height,
    className = '',
    count = 1,
    animate = true,
}) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'text':
                return 'h-4 rounded';
            case 'circular':
                return 'rounded-full aspect-square';
            case 'rectangular':
                return 'rounded-lg';
            case 'card':
                return 'rounded-2xl h-64';
            case 'product':
                return 'rounded-2xl h-96';
            default:
                return 'rounded-lg';
        }
    };

    const getStyle = () => {
        const style: React.CSSProperties = {};
        if (width) style.width = typeof width === 'number' ? `${width}px` : width;
        if (height) style.height = typeof height === 'number' ? `${height}px` : height;
        return style;
    };

    const skeletonElement = (
        <div
            className={`
                glass-base
                bg-white/10
                ${animate ? 'shimmer' : ''}
                ${getVariantClasses()}
                ${className}
            `}
            style={getStyle()}
            role="status"
            aria-label="Loading content"
        />
    );

    if (count === 1) {
        return skeletonElement;
    }

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="mb-3">
                    {skeletonElement}
                </div>
            ))}
        </>
    );
};

// Preset skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className = '',
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
                <SkeletonLoader
                    key={index}
                    variant="text"
                    width={index === lines - 1 ? '70%' : '100%'}
                />
            ))}
        </div>
    );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`glass-card space-y-4 ${className}`}>
            <SkeletonLoader variant="rectangular" height={200} />
            <SkeletonLoader variant="text" width="80%" />
            <SkeletonLoader variant="text" width="60%" />
            <div className="flex gap-2 pt-2">
                <SkeletonLoader variant="rectangular" width={100} height={40} />
                <SkeletonLoader variant="rectangular" width={100} height={40} />
            </div>
        </div>
    );
};

export const SkeletonProductCard: React.FC<{ className?: string }> = ({
    className = '',
}) => {
    return (
        <div className={`glass-card space-y-4 ${className}`}>
            <SkeletonLoader variant="rectangular" height={250} />
            <div className="space-y-3">
                <SkeletonLoader variant="text" width="90%" />
                <SkeletonLoader variant="text" width="70%" />
                <div className="flex items-center justify-between pt-2">
                    <SkeletonLoader variant="text" width={80} height={24} />
                    <SkeletonLoader variant="circular" width={40} height={40} />
                </div>
            </div>
        </div>
    );
};

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
    size = 40,
    className = '',
}) => {
    return (
        <SkeletonLoader
            variant="circular"
            width={size}
            height={size}
            className={className}
        />
    );
};

export default SkeletonLoader;
