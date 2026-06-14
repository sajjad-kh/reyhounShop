import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { reviewService } from '../services/reviewService';
import { getImageUrl } from '../utils/constants';
import { formatDate } from '../utils/format';

interface Review {
    id: number;
    rating: number;
    comment?: string;
    isApproved: boolean;
    createdAt: string;

    product: {
        id: number;
        name: string;
        images?: {
            id: number;
            url: string;
        }[];
    };
}

export const ReviewsPage: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            const res = await reviewService.getMyReviews();

            console.log(res);

            setReviews(res ?? []); // 👈 مهم‌ترین fix
        } catch (error) {
            console.error(error);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="glass-spinner w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-5 px-3 sm:px-0">

            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    نظرات من
                </h1>

                <p className="text-sm text-text-secondary mt-1">
                    تاریخچه نظرات ثبت شده شما
                </p>
            </div>

                {(reviews?.length ?? 0) === 0 ? (
                    <GlassCard>
                    <div className="p-8 text-center text-text-secondary">
                        هنوز نظری ثبت نکرده‌اید.
                    </div>
                </GlassCard>
            ) : (








<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {reviews.map((review) => (
        <GlassCard key={review.id} className="overflow-hidden">

            <div className="flex flex-col sm:flex-row gap-3 p-4">

                {/* IMAGE */}
                <div className="sm:w-24 w-full h-40 sm:h-24">
                    {review.product?.images?.[0] && (
                        <img
                            src={getImageUrl(review.product.images[0].url)}
                            alt={review.product.name}
                            className="w-full h-full object-cover rounded-xl"
                        />
                    )}
                </div>

                {/* CONTENT */}
                <div className="flex-1 flex flex-col gap-3">

                    {/* TITLE + DATE */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-text-primary text-sm sm:text-base line-clamp-1">
                            {review.product?.name}
                        </h3>

                        {review.createdAt && (
                            <span className="text-xs text-text-secondary whitespace-nowrap">
                                {formatDate(review.createdAt)}
                            </span>
                        )}
                    </div>

                    {/* ROW: RATING + STARS + STATUS (UPDATED) */}
                    <div className="flex items-center justify-between">


                        {/* RIGHT: status */}
                        {review.isApproved ? (
                            <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                تایید شده
                            </span>
                        ) : (
                            <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                                در انتظار تایید
                            </span>
                        )}


                        
                        {/* LEFT: rating + stars */}
                        <div className="flex items-center gap-2">

                            <span className="font-bold text-amber-500">
                                {review.rating}
                            </span>

                            {/* STARS */}
                            <div className="flex text-amber-400 text-sm">
                                /5
                                {"★★★★★".split("").map((_, i) => (
                                    <span
                                        key={i}
                                        className={i < review.rating ? "opacity-100" : "opacity-20"}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>

                        </div>



                    </div>

                    {/* COMMENT */}
                    {review.comment && (
                        <p className="text-sm text-text-primary bg-white/5 rounded-lg p-2 line-clamp-3">
                            {review.comment}
                        </p>
                    )}

                </div>
            </div>
        </GlassCard>
    ))}
</div>






            )}
        </div>
    );
};