import React, { useState, useEffect, useMemo } from 'react';
import { ProductReview } from '../../types/product';
import { productService } from '../../services/productService';
import { cn } from '../../utils';
import { MessageCircle, ThumbsUp, Flag, Star } from 'lucide-react';

export interface ReviewsSectionProps {
    productId: number;
    averageRating: number;
    reviewCount: number;
    reviewsObj: Array<{ rating: number }>;
    className?: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
    productId,
    averageRating,
    reviewCount,
    reviewsObj,
    className
}) => {
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'reviews' | 'questions'>('reviews');

    const ratingDistribution = useMemo(() => {
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const reviewsList = Array.isArray(reviewsObj) ? reviewsObj : [];

        reviewsList.forEach(review => {
            const rating = review.rating;
            if (rating >= 1 && rating <= 5) {
                distribution[rating]++;
            }
        });

        return distribution;
    }, [reviewsObj]);

    const fetchReviews = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);
            setReviews(reviewsObj);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reviews');
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews(1);
    }, [productId, reviewsObj]);

    const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
        const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

        return (
            <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <svg
                        key={i}
                        className={cn(
                            sizeClass,
                            i < Math.floor(rating)
                                ? 'text-amber-400 fill-current'
                                : 'text-white/15'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden', className)}>
            {/* Tab Navigation */}
            <div className="border-b border-white/[0.06] px-4 sm:px-6">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={cn(
                            'py-3.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px',
                            activeTab === 'reviews'
                                ? 'border-accent-primary text-accent-primary'
                                : 'border-transparent text-white/40 hover:text-white/60'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            نظرات
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{reviewCount}</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={cn(
                            'py-3.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px',
                            activeTab === 'questions'
                                ? 'border-accent-primary text-accent-primary'
                                : 'border-transparent text-white/40 hover:text-white/60'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            سوالات
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">0</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
                {activeTab === 'reviews' && (
                    <div className="space-y-6">
                        {/* Rating Summary */}
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            {/* Big Rating */}
                            <div className="text-center sm:text-left flex-shrink-0">
                                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                                    {averageRating.toFixed(1)}
                                </div>
                                {renderStars(averageRating, 'md')}
                                <p className="text-xs text-white/30 mt-2">
                                    بر اساس {reviewCount} نظر
                                </p>
                            </div>

                            {/* Rating Distribution */}
                            <div className="flex-1 w-full space-y-2">
                                {[5, 4, 3, 2, 1].map(rating => {
                                    const count = ratingDistribution[rating];
                                    const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;

                                    return (
                                        <div key={rating} className="flex items-center gap-3">
                                            <span className="text-[11px] text-white/40 w-6 text-center">
                                                {rating}
                                            </span>
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-white/25 w-8 text-left">
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reviews List */}
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/[0.05]" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-white/[0.05] rounded w-1/4" />
                                                <div className="h-3 bg-white/[0.05] rounded w-1/2" />
                                                <div className="h-12 bg-white/[0.05] rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                                    <MessageCircle className="w-6 h-6 text-white/15" />
                                </div>
                                <h3 className="text-sm font-semibold text-white/60 mb-1">نظری ثبت نشده</h3>
                                <p className="text-xs text-white/30">اولین نفری باشید که نظر می‌دهد</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reviews.map(review => (
                                    <div key={review.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary/30 to-purple-500/30 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-white/70">
                                                    {review.user.name?.charAt(0) || '?'}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <h4 className="text-xs sm:text-sm font-semibold text-white/80 truncate">
                                                            {review.user.name}
                                                        </h4>
                                                        {review.verified && (
                                                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                                خریدار
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-white/25 flex-shrink-0">
                                                        {new Date(review.createdAt).toLocaleDateString('fa-IR')}
                                                    </span>
                                                </div>

                                                {renderStars(review.rating)}

                                                {review.title && (
                                                    <h5 className="text-xs sm:text-sm font-medium text-white/70 mt-2">
                                                        {review.title}
                                                    </h5>
                                                )}

                                                <p className="text-xs sm:text-sm text-white/45 leading-relaxed mt-2">
                                                    {review.comment}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                                                    <button className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                                                        <ThumbsUp className="w-3 h-3" />
                                                        مفید ({review.helpful})
                                                    </button>
                                                    <button className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                                                        <Flag className="w-3 h-3" />
                                                        گزارش
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="text-center py-8">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white/15" />
                        </div>
                        <h3 className="text-sm font-semibold text-white/60 mb-1">سوالی ثبت نشده</h3>
                        <p className="text-xs text-white/30">اولین نفری باشید که سوال می‌پرسد</p>
                    </div>
                )}
            </div>
        </div>
    );
};
