import React from 'react';

export interface ShippingMethodSkeletonProps {
    count?: number;
    showCost?: boolean;
}

/**
 * Skeleton loader for shipping method cards
 */
export const ShippingMethodSkeleton: React.FC<ShippingMethodSkeletonProps> = ({
    count = 3,
    showCost = true,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="glass-card p-4 border-2 border-white/10 animate-pulse"
                >
                    <div className="flex items-start gap-3">
                        {/* Selection Indicator Skeleton */}
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-5 h-5 rounded bg-white/10" />
                        </div>

                        {/* Content Skeleton */}
                        <div className="flex-1 min-w-0 space-y-3">
                            {/* Name Skeleton */}
                            <div className="h-5 bg-white/10 rounded w-3/4" />

                            {/* Description Skeleton */}
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded w-full" />
                                <div className="h-3 bg-white/10 rounded w-5/6" />
                            </div>

                            {/* Cost Information Skeleton */}
                            {showCost && (
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-white/10" />
                                        <div className="h-3 bg-white/10 rounded w-24" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-white/10" />
                                        <div className="h-3 bg-white/10 rounded w-20" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};

/**
 * Skeleton loader for shipping method list view
 */
export const ShippingMethodListSkeleton: React.FC = () => {
    return (
        <div className="space-y-4">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-6 bg-white/10 rounded w-48 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-64 animate-pulse" />
                </div>
                <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ShippingMethodSkeleton count={4} />
            </div>
        </div>
    );
};
