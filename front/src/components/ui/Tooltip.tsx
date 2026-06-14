import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils';

export interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className,
    delay = 300
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout>();
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            updatePosition();
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    const updatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        let x = 0;
        let y = 0;

        switch (position) {
            case 'top':
                x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
                y = triggerRect.top - tooltipRect.height - 8;
                break;
            case 'bottom':
                x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
                y = triggerRect.bottom + 8;
                break;
            case 'left':
                x = triggerRect.left - tooltipRect.width - 8;
                y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                break;
            case 'right':
                x = triggerRect.right + 8;
                y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                break;
        }

        // Keep tooltip within viewport
        const padding = 8;
        x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
        y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

        setCoords({ x, y });
    };

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                className="inline-block"
            >
                {children}
            </div>

            {isVisible && (
                <div
                    ref={tooltipRef}
                    className={cn(
                        'fixed z-[9999] px-3 py-2 text-sm text-white',
                        'bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg',
                        'pointer-events-none transition-opacity duration-200',
                        'max-w-xs break-words',
                        className
                    )}
                    style={{
                        left: `${coords.x}px`,
                        top: `${coords.y}px`,
                    }}
                >
                    {content}
                    {/* Arrow */}
                    <div
                        className={cn(
                            'absolute w-2 h-2 bg-gray-900/95 transform rotate-45',
                            position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
                            position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
                            position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
                            position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
                        )}
                    />
                </div>
            )}
        </>
    );
};
