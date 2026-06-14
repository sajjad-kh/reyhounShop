import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { GlassButton } from '../components/ui/GlassButton';

export const PaymentVerifyPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationResult, setVerificationResult] = useState<{
        success: boolean;
        orderId?: number;
        message?: string;
    } | null>(null);

    useEffect(() => {
        const verifyPayment = async () => {
            const transactionId = searchParams.get('transactionId') || searchParams.get('Authority');

            if (!transactionId) {
                setVerificationResult({
                    success: false,
                    message: 'Invalid payment verification link',
                });
                setIsVerifying(false);
                return;
            }

            try {
                const result = await paymentService.verifyPayment(transactionId);

                if (result.success && result.status === 'completed') {
                    setVerificationResult({
                        success: true,
                        orderId: result.orderId,
                        message: 'Payment completed successfully!',
                    });
                } else {
                    setVerificationResult({
                        success: false,
                        message: 'Payment verification failed. Please contact support.',
                    });
                }
            } catch (error) {
                setVerificationResult({
                    success: false,
                    message: error instanceof Error ? error.message : 'Payment verification failed',
                });
            } finally {
                setIsVerifying(false);
            }
        };

        verifyPayment();
    }, [searchParams]);

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="glass-card p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg
                            className="w-8 h-8 text-purple-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Verifying Payment...</h2>
                    <p className="text-white/60 mb-6">
                        Please wait while we verify your payment.
                    </p>
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-8 max-w-md w-full text-center">
                {verificationResult?.success ? (
                    <>
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Payment Successful!</h2>
                        <p className="text-white/60 mb-6">{verificationResult.message}</p>
                        <div className="space-y-3">
                            <GlassButton
                                variant="primary"
                                onClick={() =>
                                    navigate(`/orders/${verificationResult.orderId}`)
                                }
                                className="w-full"
                                ripple
                            >
                                View Order Details
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                onClick={() => navigate('/')}
                                className="w-full"
                            >
                                Continue Shopping
                            </GlassButton>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Payment Failed</h2>
                        <p className="text-white/60 mb-6">{verificationResult?.message}</p>
                        <div className="space-y-3">
                            <GlassButton
                                variant="primary"
                                onClick={() => navigate('/checkout')}
                                className="w-full"
                            >
                                Try Again
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                onClick={() => navigate('/')}
                                className="w-full"
                            >
                                Back to Home
                            </GlassButton>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
