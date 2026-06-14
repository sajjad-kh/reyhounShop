import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import {
    CheckCircle,
    XCircle,
    Trash2,
    RefreshCw,
    Search
} from 'lucide-react';
import { getImageUrl } from '../../utils/constants';
import { tokenHandler } from '../../utils/tokenHandler';

interface Review {
    id: number;
    rating: number;
    comment?: string;
    isApproved: boolean;
    createdAt: string;

    product?: {
        id: number;
        name: string;
        images?: { id: number; url: string }[];
    };

    user?: {
        id: number;
        name: string;
        email: string;
    };
}

const ReviewMethodsManagement: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'all' | 'approved' | 'pending'>('all');

    useEffect(() => {
        loadReviews();
    }, []);

    // ================= AUTH HEADERS (TOKENHANDLER ONLY) =================
    const getHeaders = () => {
        const token = tokenHandler.getToken();

        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        };
    };

    // ================= LOAD =================
    const loadReviews = async () => {
        try {
            setLoading(true);

            const res = await fetch('/api/v1/admin/reviews', {
                headers: getHeaders()
            });

            const data = await res.json();

            const safeReviews =
                data?.reviews ??
                data?.data?.reviews ??
                data?.data ??
                [];

            setReviews(Array.isArray(safeReviews) ? safeReviews : []);
        } catch (err) {
            console.error('loadReviews error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ================= ACTIONS (UNCHANGED) =================
    const approveReview = async (reviewId: number) => {
        try {
            await fetch(`/api/v1/admin/reviews/${reviewId}/moderate`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ isApproved: true })
            });

            loadReviews();
        } catch (err) {
            console.error(err);
        }
    };

    const rejectReview = async (reviewId: number) => {
        try {
            await fetch(`/api/v1/admin/reviews/${reviewId}/moderate`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ isApproved: false })
            });

            loadReviews();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteReview = async (reviewId: number) => {
        if (!confirm('حذف شود؟')) return;

        try {
            await fetch(`/api/v1/admin/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            loadReviews();
        } catch (err) {
            console.error(err);
        }
    };

    // ================= FILTER =================
    const filteredReviews = useMemo(() => {
        return reviews.filter((r) => {
            const matchesSearch =
                r.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
                r.comment?.toLowerCase().includes(search.toLowerCase()) ||
                r.user?.name?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus =
                status === 'all'
                    ? true
                    : status === 'approved'
                    ? r.isApproved
                    : !r.isApproved;

            return matchesSearch && matchesStatus;
        });
    }, [reviews, search, status]);

    // ================= UI =================
    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">مدیریت نظرات</h1>
                    <p className="text-sm text-gray-500">
                        بررسی، تایید و حذف نظرات کاربران
                    </p>
                </div>

                <GlassButton onClick={loadReviews} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </GlassButton>
            </div>

            {/* FILTERS */}
            <GlassCard className="p-4 flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو در محصول / کاربر / نظر..."
                        className="w-full pl-10 pr-4 py-2 border rounded-xl bg-transparent"
                    />
                </div>

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-4 py-2 border rounded-xl bg-transparent"
                >
                    <option value="all">همه</option>
                    <option value="approved">تایید شده</option>
                    <option value="pending">در انتظار</option>
                </select>
            </GlassCard>

            {/* TABLE (DESKTOP) + CARDS (MOBILE) */}
            <div className="space-y-4">

                {/* ================= TABLE (lg+) ================= */}
                <div className="hidden lg:block">
                    <GlassCard className="w-full overflow-hidden p-4">

                        <table className="w-full text-sm text-right" dir="rtl">

                            <thead className="border-b border-white/10 text-gray-400">
                                <tr>
                                    <th className="w-[350px] py-3 px-3">
                                        محصول
                                    </th>
                                    <th className="py-3 px-3">
                                        نظر
                                    </th>
                                    <th className="py-3 px-3 text-center">
                                        امتیاز
                                    </th>
                                    <th className="w-[220px] py-3 px-3">
                                        کاربر
                                    </th>
                                    <th className="w-[110px] py-3 px-3">
                                        وضعیت
                                    </th>
                                    <th className="w-[140px] py-3 px-3 text-center">
                                        عملیات
                                    </th>

                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">

                                {filteredReviews.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-white/5 transition align-top"
                                    >


                                        {/* product */}
                                        <td className="py-4 px-3">
                                            <div className="flex items-center gap-3">

                                                {r.product?.images?.[0] && (
                                                    <img
                                                        src={getImageUrl(
                                                            r.product.images[0].url
                                                        )}
                                                        className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                                                        alt=""
                                                    />
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-white break-words">
                                                        {r.product?.name || '-'}
                                                    </div>
                                                </div>

                                            </div>
                                        </td>

                                        {/* comment */}
                                        <td className="py-4 px-3 text-gray-300">
                                            <div className="max-w-xl break-words whitespace-pre-wrap leading-6">
                                                {r.comment || '-'}
                                            </div>
                                        </td>

                                        {/* rating */}
                                        <td className="py-4 px-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-amber-400">
                                                    {r.rating}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    /5
                                                </span>
                                            </div>
                                        </td>

                                        {/* user */}
                                        <td className="py-4 px-3">
                                            <div className="space-y-1">
                                                <div className="font-medium text-white">
                                                    {r.user?.name || '-'}
                                                </div>

                                                <div className="text-xs text-gray-500 break-all">
                                                    {r.user?.email}
                                                </div>
                                            </div>
                                        </td>

                                        {/* status */}
                                        <td className="py-4 px-3">
                                            {r.isApproved ? (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-400">
                                                    تایید شده
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400">
                                                    در انتظار
                                                </span>
                                            )}
                                        </td>

                                        {/* actions */}
                                        <td className="py-4 px-3">
                                            <div className="flex items-center justify-center gap-2">

                                                <button
                                                    onClick={() => approveReview(r.id)}
                                                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => rejectReview(r.id)}
                                                    className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => deleteReview(r.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                ))}

                            </tbody>

                        </table>

                    </GlassCard>
                </div>



                <div className="md:hidden flex flex-col gap-3 w-full">
                    {filteredReviews.map((review) => (
                        <GlassCard
                            key={review.id}
                            className="w-full p-4"
                        >
                            <div className="flex gap-3">

                                {/* Product Image */}
                                {review.product?.images?.[0] && (
                                    <img
                                        src={getImageUrl(
                                            review.product.images[0].url
                                        )}
                                        alt=""
                                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                                    />
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col">

                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate">
                                                {review.product?.name}
                                            </h3>

                                            <p className="text-sm text-gray-500 truncate">
                                                {review.user?.name}
                                            </p>
                                        </div>

                                        <span
                                            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                                                review.isApproved
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                        >
                                            {review.isApproved
                                                ? 'تایید شده'
                                                : 'در انتظار'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-bold text-amber-500">
                                            {review.rating}/5
                                        </span>

                                        <div className="flex text-amber-400 text-sm">
                                            {'★★★★★'
                                                .split('')
                                                .map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={
                                                            i < review.rating
                                                                ? ''
                                                                : 'opacity-20'
                                                        }
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                        </div>
                                    </div>

                                    {review.comment && (
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                            {review.comment}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-end gap-2 mt-3">

                                        <button
                                            onClick={() =>
                                                approveReview(review.id)
                                            }
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-green-100 text-green-700"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() =>
                                                rejectReview(review.id)
                                            }
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-100 text-orange-700"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() =>
                                                deleteReview(review.id)
                                            }
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                    </div>

                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>







            </div>







        </div>
    );
};

export default ReviewMethodsManagement;