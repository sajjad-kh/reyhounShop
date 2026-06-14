import { useState } from 'react';

interface ReviewModalProps {
    isOpen: boolean;
    loading?: boolean;
    onClose: () => void;
    error?: string | null;
    onSubmit: (data: {
        rating: number;
        comment: string;
    }) => Promise<void> | void;
}

export default function ReviewModal({
    isOpen,
    loading = false,
    error,
    onClose,
    onSubmit,
}: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [comment, setComment] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating <= 3 && !comment.trim()) {
            setLocalError('برای امتیاز ۱ تا ۳ ستاره وارد کردن نظر الزامی است');
            return;
        }

        setLocalError(null);

        await onSubmit({
            rating,
            comment,
        });

        setRating(0);
        setComment('');
    };

    const displayError = error || localError;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal */}
            <div
                className="
                    relative
                    w-full
                    max-w-md
                    rounded-3xl
                    border border-white/10
                    bg-zinc-900/95
                    backdrop-blur-2xl
                    p-6
                    shadow-[0_20px_80px_rgba(0,0,0,0.55)]
                    animate-in fade-in zoom-in-95 duration-200
                "
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="
                        absolute top-4 left-4
                        w-8 h-8
                        rounded-full
                        bg-white/5
                        hover:bg-white/10
                        text-white/60
                        hover:text-white
                        transition
                    "
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center">
                    <div className="text-5xl mb-4">⭐</div>

                    <h2 className="text-xl font-bold text-white">
                        ثبت نظر شما
                    </h2>

                    <p className="mt-2 text-sm text-white/60 leading-7">
                        کیفیت محصول و تجربه خرید خود را ثبت کنید
                    </p>
                </div>


                {/* ERROR */}
                {displayError && (
                    <div className="mt-4 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
                        {displayError}
                    </div>
                )}


                {/* Rating */}
                <div className="mt-7 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="
                                text-4xl
                                transition-all
                                hover:scale-125
                            "
                        >
                            <span
                                className={
                                    star <= (hoveredStar || rating)
                                        ? 'text-yellow-400'
                                        : 'text-white/15'
                                }
                            >
                                ★
                            </span>
                        </button>
                    ))}
                </div>

                {/* Rating Text */}
                {rating > 0 && (
                    <div className="text-center mt-3">
                        <span className="text-yellow-400 text-sm">
                            {rating} از 5 ستاره
                        </span>
                    </div>
                )}

                {/* Comment */}
                <div className="mt-6">
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="نظر خود را بنویسید..."
                        className="
                            w-full
                            resize-none
                            rounded-2xl
                            border border-white/10
                            bg-white/5
                            px-4 py-3
                            text-white
                            text-sm
                            placeholder:text-white/30
                            outline-none
                            focus:border-yellow-400/40
                            focus:bg-white/[0.07]
                        "
                    />
                </div>


                {/* Footer */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="
                            flex-1
                            rounded-xl
                            border border-white/10
                            bg-white/5
                            py-3
                            text-white/70
                            hover:bg-white/10
                            transition
                        "
                    >
                        انصراف
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!rating || loading}
                        className="
                            flex-1
                            rounded-xl
                            bg-yellow-500
                            hover:bg-yellow-400
                            py-3
                            font-medium
                            text-black
                            transition
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                        "
                    >
                        {loading ? 'در حال ثبت...' : 'ثبت نظر'}
                    </button>
                </div>
            </div>
        </div>
    );
}