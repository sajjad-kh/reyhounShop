import React from 'react';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';

interface CheckoutStepsProps {
    currentStep: CheckoutStep;
}

const steps = [
    { id: 'address', label: 'آدرس', icon: '📍' },
    { id: 'shipping', label: 'ارسال', icon: '🚚' },
    { id: 'payment', label: 'پرداخت', icon: '💳' },
    { id: 'info', label: 'اطلاعات', icon: '✓' },
    { id: 'review', label: 'بررسی', icon: '✓' },
];

export const CheckoutSteps: React.FC<CheckoutStepsProps> = ({ currentStep }) => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = index < currentIndex;

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-110'
                                        : isCompleted
                                            ? 'bg-green-500'
                                            : 'bg-white/10'
                                        }`}
                                >
                                    {isCompleted ? '✓' : step.icon}
                                </div>
                                <span
                                    className={`mt-2 text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-white/60'
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {index < steps.length - 1 && (
                                <div className="flex-1 h-0.5 mx-4 mb-6">
                                    <div
                                        className={`h-full transition-all duration-300 ${index < currentIndex
                                            ? 'bg-green-500'
                                            : 'bg-white/10'
                                            }`}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
