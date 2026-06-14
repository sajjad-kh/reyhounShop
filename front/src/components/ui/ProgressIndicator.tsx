import React from 'react';

export interface ProgressIndicatorProps {
    value: number;
    max?: number;
    variant?: 'linear' | 'circular' | 'steps';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
    steps?: string[];
    currentStep?: number;
    className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    value,
    max = 100,
    variant = 'linear',
    size = 'md',
    showLabel = false,
    label,
    steps,
    currentStep = 0,
    className = '',
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    if (variant === 'steps' && steps) {
        return (
            <StepsProgress
                steps={steps}
                currentStep={currentStep}
                className={className}
            />
        );
    }

    if (variant === 'circular') {
        return (
            <CircularProgress
                percentage={percentage}
                size={size}
                showLabel={showLabel}
                label={label}
                className={className}
            />
        );
    }

    return (
        <LinearProgress
            percentage={percentage}
            size={size}
            showLabel={showLabel}
            label={label}
            className={className}
        />
    );
};

// Linear Progress Component
const LinearProgress: React.FC<{
    percentage: number;
    size: 'sm' | 'md' | 'lg';
    showLabel: boolean;
    label?: string;
    className: string;
}> = ({ percentage, size, showLabel, label, className }) => {
    const heightClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    return (
        <div className={`w-full ${className}`}>
            {(showLabel || label) && (
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/80 font-medium">
                        {label || 'Progress'}
                    </span>
                    <span className="text-sm text-white/60 font-medium">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div
                className={`
                    glass-base
                    bg-white/10
                    ${heightClasses[size]}
                    rounded-full
                    overflow-hidden
                `}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Circular Progress Component
const CircularProgress: React.FC<{
    percentage: number;
    size: 'sm' | 'md' | 'lg';
    showLabel: boolean;
    label?: string;
    className: string;
}> = ({ percentage, size, showLabel, label, className }) => {
    const sizeValues = {
        sm: { dimension: 60, strokeWidth: 4 },
        md: { dimension: 100, strokeWidth: 6 },
        lg: { dimension: 140, strokeWidth: 8 },
    };

    const { dimension, strokeWidth } = sizeValues[size];
    const radius = (dimension - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div className="relative" style={{ width: dimension, height: dimension }}>
                <svg
                    width={dimension}
                    height={dimension}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={dimension / 2}
                        cy={dimension / 2}
                        r={radius}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={dimension / 2}
                        cy={dimension / 2}
                        r={radius}
                        stroke="url(#gradient)"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6e8efb" />
                            <stop offset="100%" stopColor="#a777e0" />
                        </linearGradient>
                    </defs>
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold" style={{ fontSize: dimension / 5 }}>
                        {Math.round(percentage)}%
                    </span>
                </div>
            </div>
            {(showLabel || label) && (
                <span className="text-sm text-white/70 font-medium">
                    {label || 'Progress'}
                </span>
            )}
        </div>
    );
};

// Steps Progress Component
const StepsProgress: React.FC<{
    steps: string[];
    currentStep: number;
    className: string;
}> = ({ steps, currentStep, className }) => {
    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <React.Fragment key={index}>
                            {/* Step Circle */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <div
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center
                                        glass-base transition-all duration-300
                                        ${isCompleted
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                            : isCurrent
                                                ? 'bg-white/20 ring-2 ring-blue-500'
                                                : 'bg-white/10'
                                        }
                                    `}
                                >
                                    {isCompleted ? (
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    ) : (
                                        <span
                                            className={`
                                                text-sm font-semibold
                                                ${isCurrent ? 'text-white' : 'text-white/50'}
                                            `}
                                        >
                                            {index + 1}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`
                                        text-xs text-center font-medium max-w-[100px]
                                        ${isCurrent ? 'text-white' : 'text-white/60'}
                                    `}
                                >
                                    {step}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-0.5 mx-2 mb-8">
                                    <div
                                        className={`
                                            h-full transition-all duration-300
                                            ${isCompleted
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                : 'bg-white/10'
                                            }
                                        `}
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

export default ProgressIndicator;
