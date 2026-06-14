import React from 'react';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { GlassCard } from '../ui/GlassCard';

/**
 * Skeleton loader for Basalam Product Card
 */
export const BasalamProductCardSkeleton: React.FC<{ className?: string }> = ({
    className = ''
}) => {
    return (
        <GlassCard className={`space-y-4 h-full flex flex-col ${className}`}>
            {/* Product Image Skeleton */}
            <SkeletonLoader variant="rectangular" className="aspect-square rounded-xl" />

            {/* Product Info Skeleton */}
            <div className="flex-1 flex flex-col justify-between space-y-3">
                {/* Seller Name */}
                <SkeletonLoader variant="text" width="40%" height={16} />

                {/* Product Title */}
                <div className="space-y-2">
                    <SkeletonLoader variant="text" width="100%" height={20} />
                    <SkeletonLoader variant="text" width="80%" height={20} />
                </div>

                {/* Stock Status */}
                <div className="flex items-center space-x-2 space-x-reverse">
                    <SkeletonLoader variant="circular" width={8} height={8} />
                    <SkeletonLoader variant="text" width="30%" height={16} />
                </div>

                {/* Price and Actions */}
                <div className="space-y-3 mt-auto">
                    <SkeletonLoader variant="text" width="50%" height={24} />
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <SkeletonLoader variant="rectangular" width={100} height={36} className="rounded-lg" />
                        <SkeletonLoader variant="rectangular" className="flex-1 h-9 rounded-lg" />
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

/**
 * Skeleton loader for Order List Item
 */
export const BasalamOrderListItemSkeleton: React.FC<{ className?: string }> = ({
    className = ''
}) => {
    return (
        <GlassCard className={`${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4 space-x-reverse">
                        <SkeletonLoader variant="text" width={150} height={24} />
                        <SkeletonLoader variant="rectangular" width={100} height={28} className="rounded-lg" />
                    </div>
                    <div className="flex items-center space-x-4 space-x-reverse">
                        <SkeletonLoader variant="text" width={120} height={16} />
                        <SkeletonLoader variant="text" width={60} height={16} />
                    </div>
                </div>
                <div className="text-left space-y-2">
                    <SkeletonLoader variant="text" width={120} height={32} />
                    <SkeletonLoader variant="text" width={60} height={16} />
                </div>
            </div>
        </GlassCard>
    );
};

/**
 * Skeleton loader for Order Details Page
 */
export const BasalamOrderDetailsSkeleton: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <SkeletonLoader variant="rectangular" width={40} height={40} className="rounded-lg" />
                    <SkeletonLoader variant="text" width={250} height={36} />
                </div>
                <SkeletonLoader variant="rectangular" width={150} height={40} className="rounded-lg" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Header Card */}
                    <GlassCard className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <SkeletonLoader variant="text" width={120} height={16} />
                                <SkeletonLoader variant="text" width={200} height={24} />
                            </div>
                            <SkeletonLoader variant="rectangular" width={120} height={40} className="rounded-lg" />
                        </div>
                    </GlassCard>

                    {/* Order Items Card */}
                    <GlassCard className="space-y-4">
                        <SkeletonLoader variant="text" width={150} height={24} />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="glass-card bg-glass-light p-4 rounded-xl flex items-center space-x-4 space-x-reverse">
                                    <SkeletonLoader variant="rectangular" width={80} height={80} className="rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <SkeletonLoader variant="text" width="80%" height={20} />
                                        <SkeletonLoader variant="text" width="50%" height={16} />
                                        <SkeletonLoader variant="text" width="40%" height={16} />
                                    </div>
                                    <div className="space-y-2">
                                        <SkeletonLoader variant="text" width={80} height={20} />
                                        <SkeletonLoader variant="text" width={40} height={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Shipping Address Card */}
                    <GlassCard className="space-y-4">
                        <SkeletonLoader variant="text" width={150} height={24} />
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((i) => (
                                <SkeletonLoader key={i} variant="text" width="90%" height={20} />
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Payment Summary Card */}
                    <GlassCard className="space-y-4">
                        <SkeletonLoader variant="text" width={150} height={24} />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <SkeletonLoader variant="text" width={80} height={16} />
                                    <SkeletonLoader variant="text" width={100} height={16} />
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border-glass-light pt-4">
                            <div className="flex items-center justify-between">
                                <SkeletonLoader variant="text" width={60} height={24} />
                                <SkeletonLoader variant="text" width={120} height={32} />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Status History Card */}
                    <GlassCard className="space-y-4">
                        <SkeletonLoader variant="text" width={150} height={24} />
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start space-x-3 space-x-reverse">
                                    <SkeletonLoader variant="circular" width={16} height={16} />
                                    <div className="flex-1 space-y-2">
                                        <SkeletonLoader variant="text" width="70%" height={18} />
                                        <SkeletonLoader variant="text" width="50%" height={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

/**
 * Skeleton loader for Cart Items
 */
export const BasalamCartItemSkeleton: React.FC<{ className?: string }> = ({
    className = ''
}) => {
    return (
        <div className={`glass-card bg-glass-light p-4 rounded-xl flex items-center space-x-4 space-x-reverse ${className}`}>
            <SkeletonLoader variant="rectangular" width={80} height={80} className="rounded-lg" />
            <div className="flex-1 space-y-2">
                <SkeletonLoader variant="text" width="80%" height={18} />
                <SkeletonLoader variant="text" width="40%" height={16} />
                <SkeletonLoader variant="rectangular" width={120} height={32} className="rounded-lg" />
            </div>
            <div className="space-y-2">
                <SkeletonLoader variant="text" width={80} height={20} />
                <SkeletonLoader variant="text" width={40} height={14} />
            </div>
        </div>
    );
};
