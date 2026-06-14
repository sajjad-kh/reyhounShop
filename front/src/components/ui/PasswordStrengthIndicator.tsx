import React from 'react';
import { cn } from '../../utils';
import {
    checkPasswordStrength,
    getPasswordStrengthLabel,
    getPasswordStrengthColor
} from '../../utils/passwordStrength';

interface PasswordStrengthIndicatorProps {
    password: string;
    className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
    password,
    className
}) => {
    const strength = checkPasswordStrength(password);

    if (!password) {
        return null;
    }

    return (
        <div className={cn('mt-2 space-y-2', className)}>
            {/* Strength Bar */}
            <div className="flex space-x-1">
                {[0, 1, 2, 3, 4].map((level) => (
                    <div
                        key={level}
                        className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            level <= strength.score
                                ? strength.score <= 1
                                    ? 'bg-red-400'
                                    : strength.score === 2
                                        ? 'bg-orange-400'
                                        : strength.score === 3
                                            ? 'bg-yellow-400'
                                            : 'bg-green-400'
                                : 'bg-glass-light'
                        )}
                    />
                ))}
            </div>

            {/* Strength Label */}
            <div className="flex items-center justify-between">
                <span className={cn('text-sm font-medium', getPasswordStrengthColor(strength.score))}>
                    {getPasswordStrengthLabel(strength.score)}
                </span>
                {strength.isValid && (
                    <span className="text-xs text-green-400">✓ Strong enough</span>
                )}
            </div>

            {/* Feedback */}
            {strength.feedback.length > 0 && (
                <ul className="text-xs text-text-muted space-y-1">
                    {strength.feedback.map((feedback, index) => (
                        <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-text-muted rounded-full mr-2" />
                            {feedback}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};