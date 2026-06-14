import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Pagination } from './Pagination';
import { ProductReview } from '../../types/product';
import { productService } from '../../services/productService';
import { cn } from '../../utils';

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
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState<'all' | 'reviews' | 'questions'>('all');

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
            console.log("reviewsObj",reviewsObj)
            setReviews(reviewsObj);
            // const response = await productService.getProductReviews(productId, page, 5);
            // setReviews(response.reviews);
            // console.log("responseeee",response)

            // setCurrentPage(response.pagination.page);
            // setTotalPages(response.pagination.totalPages);
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

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchReviews(page);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
        const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

        return (
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <svg
                        key={i}
                        className={cn(
                            sizeClass,
                            i < Math.floor(rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-text-muted'
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

    const tabs = [
        { id: 'all', label: 'Overview', count: null },
        { id: 'reviews', label: 'Reviews', count: reviewCount },
        { id: 'questions', label: 'Questions', count: 0 },
    ];

    return (
        <GlassCard className={cn('', className)}>
            {/* Tab Navigation */}
            <div className="border-b border-border-glass-light mb-6">
                <nav className="flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === tab.id
                                    ? 'border-accent-primary text-accent-primary'
                                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-glass-medium'
                            )}
                        >
                            {tab.label}
                            {tab.count !== null && (
                                <span className="ml-2 rounded-full p-2 text-xs">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'all' && (
                <div className="space-y-6">
                    {/* Rating Summary */}
                    <div className="flex items-start space-x-8">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-text-primary mb-2">
                                {averageRating.toFixed(1)}
                            </div>
                            {renderStars(averageRating, 'md')}
                            <div className="text-sm text-text-muted mt-1">
                                Based on {reviewCount} reviews
                            </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="flex-1 space-y-2">
                            {[5, 4, 3, 2, 1].map(rating => {
                                const count = ratingDistribution[rating];
                                const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;

                                return (
                                    <div key={rating} className="flex items-center space-x-3">
                                        <span className="text-sm text-text-secondary w-8">
                                            {rating}★
                                        </span>
                                        <div className="flex-1 h-2 bg-glass-light rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-text-muted w-12">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reviews' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="glass-card bg-glass-light p-4 animate-pulse">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-10 h-10 bg-glass-medium rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-glass-medium rounded w-1/4"></div>
                                            <div className="h-4 bg-glass-medium rounded w-1/2"></div>
                                            <div className="h-16 bg-glass-medium rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="text-accent-error mb-4">
                                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-text-secondary">{error}</p>
                            <GlassButton
                                variant="secondary"
                                className="mt-4"
                                onClick={() => fetchReviews(currentPage)}
                            >
                                Try Again
                            </GlassButton>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-text-muted mb-4">
                                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">No Reviews Yet</h3>
                            <p className="text-text-secondary mb-4">Be the first to review this product!</p>
                            <GlassButton variant="primary">
                                Write a Review
                            </GlassButton>
                        </div>
                    ) : (
                        <>
                            {/* Reviews List */}
                            <div className="space-y-4">
                                {reviews.map(review => (
                                    <div key={review.id} className="glass-card bg-glass-light p-6">
                                        <div className="flex items-start space-x-4">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center text-white font-semibold">
                                                {/* {review.user.name.toUpperCase()} */}
                                            </div>

                                            {/* Review Content */}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-text-primary">
                                                            {review.user.name}
                                                            {review.verified && (
                                                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Verified Purchase
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="flex items-center space-x-2">
                                                            {renderStars(review.rating)}
                                                            <span className="text-sm text-text-muted">
                                                                {new Date(review.createdAt).toLocaleDateString('fa-IR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Review Title */}
                                                {review.title && (
                                                    <h5 className="font-medium text-text-primary mb-2">
                                                        {review.title}
                                                    </h5>
                                                )}

                                                {/* Review Comment */}
                                                <p className="text-text-secondary mb-4 leading-relaxed">
                                                    {review.comment}
                                                </p>

                                                {/* Review Actions */}
                                                <div className="flex items-center space-x-4">
                                                    <button className="flex items-center space-x-1 text-sm text-text-muted hover:text-text-secondary transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                        </svg>
                                                        <span>Helpful ({review.helpful})</span>
                                                    </button>
                                                    <button className="text-sm text-text-muted hover:text-text-secondary transition-colors">
                                                        Report
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'questions' && (
                <div className="text-center py-8">
                    <div className="text-text-muted mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Questions Yet</h3>
                    <p className="text-text-secondary mb-4">Be the first to ask a question about this product!</p>
                    <GlassButton variant="primary">
                        Ask a Question
                    </GlassButton>
                </div>
            )}
        </GlassCard>
    );
};