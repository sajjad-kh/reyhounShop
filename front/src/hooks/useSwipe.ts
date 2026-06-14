import { useEffect, useRef, useState } from 'react';

export interface SwipeConfig {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
    preventDefaultTouchmoveEvent?: boolean;
}

export interface SwipeState {
    isSwiping: boolean;
    direction: 'left' | 'right' | 'up' | 'down' | null;
    deltaX: number;
    deltaY: number;
}

export const useSwipe = (config: SwipeConfig) => {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        threshold = 50,
        preventDefaultTouchmoveEvent = false,
    } = config;

    const [swipeState, setSwipeState] = useState<SwipeState>({
        isSwiping: false,
        direction: null,
        deltaX: 0,
        deltaY: 0,
    });

    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchEndRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent | TouchEvent) => {
        touchEndRef.current = null;
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
        setSwipeState({
            isSwiping: true,
            direction: null,
            deltaX: 0,
            deltaY: 0,
        });
    };

    const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
        if (preventDefaultTouchmoveEvent) {
            e.preventDefault();
        }

        if (!touchStartRef.current) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = currentX - touchStartRef.current.x;
        const deltaY = currentY - touchStartRef.current.y;

        setSwipeState({
            isSwiping: true,
            direction: Math.abs(deltaX) > Math.abs(deltaY)
                ? deltaX > 0 ? 'right' : 'left'
                : deltaY > 0 ? 'down' : 'up',
            deltaX,
            deltaY,
        });
    };

    const handleTouchEnd = () => {
        if (!touchStartRef.current) return;

        const deltaX = swipeState.deltaX;
        const deltaY = swipeState.deltaY;

        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
        const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

        if (isHorizontalSwipe && Math.abs(deltaX) > threshold) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        if (isVerticalSwipe && Math.abs(deltaY) > threshold) {
            if (deltaY > 0 && onSwipeDown) {
                onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
                onSwipeUp();
            }
        }

        touchStartRef.current = null;
        touchEndRef.current = null;
        setSwipeState({
            isSwiping: false,
            direction: null,
            deltaX: 0,
            deltaY: 0,
        });
    };

    const handlers = {
        onTouchStart: handleTouchStart as React.TouchEventHandler,
        onTouchMove: handleTouchMove as React.TouchEventHandler,
        onTouchEnd: handleTouchEnd as React.TouchEventHandler,
    };

    return { handlers, swipeState };
};

export const useSwipeElement = <T extends HTMLElement>(config: SwipeConfig) => {
    const elementRef = useRef<T>(null);
    const { handlers } = useSwipe(config);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleStart = (e: Event) => handlers.onTouchStart(e as unknown as React.TouchEvent);
        const handleMove = (e: Event) => handlers.onTouchMove(e as unknown as React.TouchEvent);
        const handleEnd = (e: Event) => handlers.onTouchEnd(e as unknown as React.TouchEvent);

        element.addEventListener('touchstart', handleStart);
        element.addEventListener('touchmove', handleMove);
        element.addEventListener('touchend', handleEnd);

        return () => {
            element.removeEventListener('touchstart', handleStart);
            element.removeEventListener('touchmove', handleMove);
            element.removeEventListener('touchend', handleEnd);
        };
    }, [handlers]);

    return elementRef;
};
