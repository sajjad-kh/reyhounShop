import React from 'react';

export interface TruncatedTextProps {
    text: string;
    maxLength?: number;
    className?: string;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
    text,
    maxLength = 20,
    className = '',
    as: Component = 'span'
}) => {
    const shouldTruncate = text && text.length > maxLength;
    const displayText = shouldTruncate ? `${text.substring(0, maxLength)}...` : text;

    return (
        <Component
            className={`${className} ${shouldTruncate ? 'cursor-help' : ''}`}
            title={shouldTruncate ? text : undefined}
        >
            {displayText}
        </Component>
    );
};