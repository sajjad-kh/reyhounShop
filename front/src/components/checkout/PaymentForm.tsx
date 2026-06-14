import React from 'react';

interface PaymentFormProps {
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;
}

const paymentMethods = [
    {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay securely with Stripe',
        icon: '💳',
    },
    {
        id: 'zarinpal',
        name: 'Zarinpal',
        description: 'Iranian payment gateway',
        icon: '🇮🇷',
    },
    {
        id: 'payir',
        name: 'Pay.ir',
        description: 'Fast and secure payment',
        icon: '💰',
    },
];

export const PaymentForm: React.FC<PaymentFormProps> = ({
    paymentMethod,
    onPaymentMethodChange,
}) => {
    return (
        <div className="space-y-4">
            <p className="text-white/60 mb-6">
                Select your preferred payment method to complete the purchase
            </p>

            {paymentMethods.map((method) => (
                <div
                    key={method.id}
                    onClick={() => onPaymentMethodChange(method.id)}
                    className={`glass-card p-4 cursor-pointer transition-all duration-300 ${paymentMethod === method.id
                            ? 'ring-2 ring-purple-500 bg-white/20'
                            : 'hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl">{method.icon}</div>
                            <div>
                                <h3 className="text-white font-semibold">{method.name}</h3>
                                <p className="text-white/60 text-sm">{method.description}</p>
                            </div>
                        </div>

                        <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id
                                    ? 'border-purple-500 bg-purple-500'
                                    : 'border-white/30'
                                }`}
                        >
                            {paymentMethod === method.id && (
                                <svg
                                    className="w-4 h-4 text-white"
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
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {paymentMethod && (
                <div className="glass-card p-4 mt-6 bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-start gap-3">
                        <svg
                            className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div>
                            <p className="text-blue-400 text-sm font-medium">Secure Payment</p>
                            <p className="text-white/60 text-sm mt-1">
                                Your payment information is encrypted and secure. You will be
                                redirected to the payment gateway to complete your purchase.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
