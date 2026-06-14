import React from 'react';

/**
 * Skeleton loader for order summary
 */
export const OrderSummarySkeleton: React.FC = () => {
    return (
        <div className="glass-card p-6 space-y-4 animate-pulse">
            {/* Title Skeleton */}
            <div className="h-6 bg-white/10 rounded w-32 mb-4" />

            {/* Items Skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-3 pb-3 border-b border-white/10">
                        {/* Image Skeleton */}
                        <div className="w-16 h-16 bg-white/10 rounded" />

                        {/* Content Skeleton */}
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                            <div className="h-3 bg-white/10 rounded w-1/2" />
                        </div>

                        {/* Price Skeleton */}
                        <div className="h-4 bg-white/10 rounded w-20" />
                    </div>
                ))}
            </div>

            {/* Summary Lines Skeleton */}
            <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between">
                    <div className="h-4 bg-white/10 rounded w-24" />
                    <div className="h-4 bg-white/10 rounded w-20" />
                </div>
                <div className="flex justify-between">
                    <div className="h-4 bg-white/10 rounded w-24" />
                    <div className="h-4 bg-white/10 rounded w-20" />
                </div>
                <div className="flex justify-between pt-3 border-t border-white/10">
                    <div className="h-5 bg-white/10 rounded w-28" />
                    <div className="h-5 bg-white/10 rounded w-24" />
                </div>
            </div>

            {/* Button Skeleton */}
            <div className="h-12 bg-white/10 rounded-lg mt-4" />
        </div>
    );
};
