import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

/**
 * Empty Cart State
 */
export const EmptyCartState: React.FC<{ onShopNow?: () => void }> = ({ onShopNow }) => {
    const navigate = useNavigate();

    const handleShopNow = () => {
        if (onShopNow) {
            onShopNow();
        } else {
            navigate('/basalam/products');
        }
    };

    return (
        <div className="py-16 text-center scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">سبد خرید شما خالی است</h3>
            <p className="text-text-muted text-sm mb-6">
                محصولات مورد نظر خود را به سبد اضافه کنید
            </p>
            <GlassButton onClick={handleShopNow} variant="accent" className="hover-lift">
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                شروع خرید
            </GlassButton>
        </div>
    );
};

/**
 * Empty Orders State
 */
export const EmptyOrdersState: React.FC<{ statusFilter?: string }> = ({ statusFilter }) => {
    const navigate = useNavigate();

    return (
        <GlassCard className="text-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">سفارشی یافت نشد</h3>
            <p className="text-text-muted text-sm mb-6">
                {statusFilter ? 'سفارشی با این وضعیت وجود ندارد' : 'هنوز سفارشی ثبت نکرده‌اید'}
            </p>
            <GlassButton onClick={() => navigate('/basalam/products')} className="hover-lift">
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                مشاهده محصولات
            </GlassButton>
        </GlassCard>
    );
};

/**
 * Empty Products State
 */
export const EmptyProductsState: React.FC = () => {
    return (
        <GlassCard className="text-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">محصولی یافت نشد</h3>
            <p className="text-text-muted text-sm">
                در حال حاضر محصولی برای نمایش وجود ندارد
            </p>
        </GlassCard>
    );
};

/**
 * Error State
 */
export const ErrorState: React.FC<{
    message?: string;
    onRetry?: () => void;
    onBack?: () => void;
}> = ({ message = 'خطایی رخ داده است', onRetry, onBack }) => {
    return (
        <GlassCard className="text-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-accent-error"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">خطا در بارگذاری</h3>
            <p className="text-accent-error text-sm mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                {onRetry && (
                    <GlassButton onClick={onRetry} variant="accent" className="hover-lift w-full sm:w-auto">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        تلاش مجدد
                    </GlassButton>
                )}
                {onBack && (
                    <GlassButton onClick={onBack} variant="secondary" className="hover-lift w-full sm:w-auto">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        بازگشت
                    </GlassButton>
                )}
            </div>
        </GlassCard>
    );
};

/**
 * No Search Results State
 */
export const NoSearchResultsState: React.FC<{
    searchQuery?: string;
    onClearSearch?: () => void;
}> = ({ searchQuery, onClearSearch }) => {
    return (
        <GlassCard className="text-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">نتیجه‌ای یافت نشد</h3>
            <p className="text-text-muted text-sm mb-6">
                {searchQuery ? (
                    <>
                        برای "<span className="font-medium text-text-primary">{searchQuery}</span>" نتیجه‌ای یافت نشد
                    </>
                ) : (
                    'جستجوی شما نتیجه‌ای نداشت'
                )}
            </p>
            {onClearSearch && (
                <GlassButton onClick={onClearSearch} variant="secondary" className="hover-lift">
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    پاک کردن جستجو
                </GlassButton>
            )}
        </GlassCard>
    );
};

/**
 * Loading State with Message
 */
export const LoadingState: React.FC<{ message?: string }> = ({
    message = 'در حال بارگذاری...'
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center pulse-glow">
                <div className="glass-spinner" />
            </div>
            <p className="text-text-primary font-medium">{message}</p>
            <div className="mt-4 flex items-center space-x-2 space-x-reverse">
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
};

/**
 * Network Error State
 */
export const NetworkErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
    return (
        <GlassCard className="text-center py-16 scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                    />
                </svg>
            </div>
            <h3 className="text-text-primary text-lg font-medium mb-2">خطا در اتصال</h3>
            <p className="text-text-muted text-sm mb-6">
                لطفا اتصال اینترنت خود را بررسی کنید
            </p>
            {onRetry && (
                <GlassButton onClick={onRetry} variant="accent" className="hover-lift">
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    تلاش مجدد
                </GlassButton>
            )}
        </GlassCard>
    );
};
