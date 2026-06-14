import React from 'react';
import { Tooltip } from './Tooltip';

export interface ConditionalTooltipProps {
    content: string;
    children: React.ReactNode;
    maxLength?: number;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const ConditionalTooltip: React.FC<ConditionalTooltipProps> = ({
    content,
    children,
    maxLength = 30,
    position = 'top',
    className
}) => {
    // Only show tooltip if content is longer than maxLength
    const shouldShowTooltip = content && content.length > maxLength;

    if (shouldShowTooltip) {
        return (
            <Tooltip content={content} position={position} className={className}>
                {children}
            </Tooltip>
        );
    }

    return <>{children}</>;
};
