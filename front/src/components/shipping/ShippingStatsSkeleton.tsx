import React from 'react';

/**
 * Skeleton loader for shipping method statistics page
 */
export const ShippingStatsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Summary Card Skeleton */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-white/10">
                        <div className="w-8 h-8 bg-white/20 rounded" />
                    </div>
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-white/10 rounded w-32" />
                        <div className="h-8 bg-white/10 rounded w-24" />
                    </div>
                </div>
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1 */}
                <div className="glass-card p-6">
                    <div className="h-6 bg-white/10 rounded w-48 mb-4" />
                    <div className="h-80 bg-white/5 rounded-lg flex items-center justify-center">
                        <div className="w-48 h-48 rounded-full border-8 border-white/10" />
                    </div>
                </div>

                {/* Chart 2 */}
                <div className="glass-card p-6">
                    <div className="h-6 bg-white/10 rounded w-48 mb-4" />
                    <div className="h-80 bg-white/5 rounded-lg flex items-end justify-around gap-2 p-4">
                        {[60, 80, 40, 90, 50].map((height, index) => (
                            <div
                                key={index}
                                className="flex-1 bg-white/10 rounded-t"
                                style={{ height: `${height}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="glass-card p-6">
                <div className="h-6 bg-white/10 rounded w-32 mb-4" />
                <div className="space-y-3">
                    {/* Table Header */}
                    <div className="flex gap-4 pb-3 border-b border-white/10">
                        <div className="h-4 bg-white/10 rounded w-16" />
                        <div className="h-4 bg-white/10 rounded flex-1" />
                        <div className="h-4 bg-white/10 rounded w-24" />
                        <div className="h-4 bg-white/10 rounded w-24" />
                        <div className="h-4 bg-white/10 rounded w-32" />
                    </div>

                    {/* Table Rows */}
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex gap-4 py-3 border-b border-white/5">
                            <div className="h-4 bg-white/10 rounded w-16" />
                            <div className="h-4 bg-white/10 rounded flex-1" />
                            <div className="h-4 bg-white/10 rounded w-24" />
                            <div className="h-4 bg-white/10 rounded w-24" />
                            <div className="h-4 bg-white/10 rounded w-32" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
