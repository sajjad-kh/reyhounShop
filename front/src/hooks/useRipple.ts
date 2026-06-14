import { useState, useCallback, MouseEvent } from 'react';

interface RippleEffect {
    x: number;
    y: number;
    size: number;
    id: number;
}

export const useRipple = () => {
    const [ripples, setRipples] = useState<RippleEffect[]>([]);

    const createRipple = useCallback((event: MouseEvent<HTMLElement>) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const newRipple: RippleEffect = {
            x,
            y,
            size,
            id: Date.now(),
        };

        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
        }, 600);
    }, []);

    return { ripples, createRipple };
};
