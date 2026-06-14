import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { GlassButton } from '../components/ui/GlassButton';

export const PaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { state: cartState, clearCart } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addressId = searchParams.get('addressId');
    const shippingMethodId = searchParams.get('shippingMethodId');
    const paymentMethod = searchParams.get('paymentMethod');

    useEffect(() => {
        if (!addressId || !shippingMethodId || !paymentMethod) {
            navigate('/checkout');
        }
    }, [addressId, shippingMethodId, paymentMethod, navigate]);

    const handlePayment = async () => {
        if (!addressId || !shippingMethodId || !paymentMethod) return;

        try {
            setIsProcessing(true);
            setError(null);

            // Create order
            const order = await orderService.createOrder({
                addressId: parseInt(addressId),
                shippingMethodId: parseInt(shippingMethodId),
                paymentMethod,
                discountCode: cartState.cart.discountCode,
            });

            // Process payment
            const paymentResponse = await paymentService.processPayment({
                orderId: order.id,
                paymentMethod,
                amount: order.finalAmount,
                returnUrl: `${window.location.origin}/payment/verify`,
            });

            if (paymentResponse.success && paymentResponse.paymentUrl) {
                // Clear cart before redirecting
                await clearCart();

                // Redirect to payment gateway
                window.location.href = paymentResponse.paymentUrl;
            } else {
                throw new Error('Payment initialization failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
            setIsProcessing(false);
        }
    };

    if (!addressId || !shippingMethodId || !paymentMethod) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-8 max-w-md w-full text-center">
                {error ? (
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
                        <p className="text-white/60 mb-6">{error}</p>
                        <div className="space-y-3">
                            <GlassButton
                                variant="primary"
                                onClick={() => navigate('/checkout')}
                                className="w-full"
                            >
                                Back to Checkout
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                onClick={handlePayment}
                                className="w-full"
                            >
                                Try Again
                            </GlassButton>
                        </div>
                    </>
                ) : (
                    <>
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
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">
                            {isProcessing ? 'Processing Payment...' : 'Ready to Pay'}
                        </h2>
                        <p className="text-white/60 mb-6">
                            {isProcessing
                                ? 'Please wait while we process your payment. You will be redirected to the payment gateway.'
                                : `Total amount: $${cartState.cart.finalAmount.toFixed(2)}`}
                        </p>

                        {!isProcessing && (
                            <div className="space-y-3">
                                <GlassButton
                                    variant="primary"
                                    onClick={handlePayment}
                                    className="w-full"
                                    ripple
                                >
                                    Proceed to Payment
                                </GlassButton>
                                <GlassButton
                                    variant="secondary"
                                    onClick={() => navigate('/checkout')}
                                    className="w-full"
                                >
                                    Back to Checkout
                                </GlassButton>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex items-center justify-center mt-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
