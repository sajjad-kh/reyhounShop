import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type PaymentStatus = 'loading' | 'success' | 'failed';

export const BasalamPaymentCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [orderId, setOrderId] = useState<number | null>(null);
    const [payId, setPayId] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        processCallback();
    }, []);

    const processCallback = () => {
        try {
            // Parse URL query parameters from backend redirect
            const callbackStatus = searchParams.get('status');
            const orderIdParam = searchParams.get('orderId');
            const payIdParam = searchParams.get('pay_id');
            const error = searchParams.get('error');
            const message = searchParams.get('message');

            console.log('[Payment Callback] Processing callback:', {
                status: callbackStatus,
                orderId: orderIdParam,
                pay_id: payIdParam,
                error,
            });

            // Validate required parameters
            if (!callbackStatus) {
                setStatus('failed');
                setErrorMessage('پارامترهای پرداخت ناقص است');
                return;
            }

            // Store pay_id for display
            if (payIdParam) {
                setPayId(payIdParam);
            }

            // Handle error from backend
            if (error || message) {
                setStatus('failed');
                setErrorMessage(message ? decodeURIComponent(message) : 'خطا در پردازش پرداخت');
                return;
            }

            // Process based on status
            if (callbackStatus === 'success') {
                if (orderIdParam) {
                    const parsedOrderId = parseInt(orderIdParam);
                    setOrderId(parsedOrderId);
                    setStatus('success');

                    // Redirect to order details after 3 seconds
                    setTimeout(() => {
                        navigate(`/basalam/orders/${parsedOrderId}`);
                    }, 3000);
                } else {
                    setStatus('failed');
                    setErrorMessage('شناسه سفارش یافت نشد');
                }
            } else if (callbackStatus === 'failed') {
                setStatus('failed');
                if (orderIdParam) {
                    setOrderId(parseInt(orderIdParam));
                }
                setErrorMessage('پرداخت ناموفق بود');
            } else {
                setStatus('failed');
                setErrorMessage('وضعیت پرداخت نامشخص است');
            }
        } catch (error: any) {
            console.error('[Payment Callback] Error processing callback:', error);
            setStatus('failed');
            setErrorMessage(error.message || 'خطا در پردازش نتیجه پرداخت');
        }
    };

    const handleRetry = () => {
        // Redirect back to checkout to try again
        navigate('/basalam/checkout');
    };

    const handleViewOrder = () => {
        if (orderId) {
            navigate(`/basalam/orders/${orderId}`);
        }
    };

    const handleBackToOrders = () => {
        navigate('/basalam/orders');
    };

    return (
        <div className="container mx-auto px-4 py-8 page-enter">
            <div className="max-w-2xl mx-auto">
                {/* Loading State */}
                {status === 'loading' && (
                    <GlassCard className="text-center py-16 scale-in">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center pulse-glow">
                            <LoadingSpinner size="lg" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">
                            در حال پردازش پرداخت...
                        </h2>
                        <p className="text-text-muted">
                            لطفا صبر کنید، در حال بررسی وضعیت پرداخت شما هستیم
                        </p>
                        <div className="mt-6 flex items-center justify-center space-x-2 space-x-reverse">
                            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </GlassCard>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <GlassCard className="text-center py-16 scale-in">
                        {/* Success Icon */}
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center scale-in" style={{ animationDelay: '0.2s' }}>
                            <svg
                                className="w-14 h-14 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-text-primary mb-2">
                            پرداخت موفق!
                        </h2>
                        <p className="text-text-muted mb-2">
                            سفارش شما با موفقیت ثبت شد و پرداخت تایید گردید
                        </p>
                        {orderId && (
                            <p className="text-sm text-text-muted mb-4">
                                شماره سفارش: {orderId}
                            </p>
                        )}
                        {payId && (
                            <p className="text-xs text-text-muted mb-8">
                                شناسه پرداخت: {payId}
                            </p>
                        )}

                        <div className="mb-6 p-4 bg-accent-primary/10 rounded-lg">
                            <p className="text-sm text-text-muted">
                                در حال انتقال به صفحه جزئیات سفارش...
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <GlassButton
                                variant="accent"
                                size="lg"
                                onClick={handleViewOrder}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                مشاهده جزئیات سفارش
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                size="lg"
                                onClick={handleBackToOrders}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                لیست سفارشات
                            </GlassButton>
                        </div>
                    </GlassCard>
                )}

                {/* Failed State */}
                {status === 'failed' && (
                    <GlassCard className="text-center py-16 scale-in">
                        {/* Error Icon */}
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center scale-in" style={{ animationDelay: '0.2s' }}>
                            <svg
                                className="w-14 h-14 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-text-primary mb-2">
                            پرداخت ناموفق
                        </h2>
                        <p className="text-text-muted mb-2">
                            متاسفانه پرداخت شما با خطا مواجه شد
                        </p>
                        {errorMessage && (
                            <p className="text-accent-error text-sm mb-8">
                                {errorMessage}
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <GlassButton
                                variant="accent"
                                size="lg"
                                onClick={handleRetry}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                تلاش مجدد
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                size="lg"
                                onClick={handleBackToOrders}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                بازگشت به سفارشات
                            </GlassButton>
                        </div>

                        {/* Additional Help */}
                        <div className="mt-8 glass-card bg-glass-light p-4 rounded-lg text-right fade-in-up" style={{ animationDelay: '0.4s' }}>
                            <div className="flex items-start space-x-3 space-x-reverse">
                                <svg className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-text-muted">
                                    در صورت کسر وجه از حساب شما، مبلغ ظرف 72 ساعت به حساب شما بازگردانده خواهد شد.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};
