import { useEffect, useRef } from 'react';
import { cn } from '../../utils';
import { useSwipe } from '../../hooks/useSwipe';

export interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'left' | 'right';
    className?: string;
}

export const MobileMenu = ({
    isOpen,
    onClose,
    children,
    position = 'right',
    className,
}: MobileMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Swipe to close
    const { handlers, swipeState } = useSwipe({
        onSwipeLeft: position === 'right' ? onClose : undefined,
        onSwipeRight: position === 'left' ? onClose : undefined,
        threshold: 100,
    });

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const focusableElements = menuRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleTab);
        firstElement?.focus();

        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    if (!isOpen) return null;

    const translateX = swipeState.isSwiping
        ? position === 'right'
            ? Math.min(0, swipeState.deltaX)
            : Math.max(0, swipeState.deltaX)
        : 0;

    return (
        <>
            {/* Overlay */}
            <div
                ref={overlayRef}
                className={cn(
                    'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Menu */}
            <div
                ref={menuRef}
                className={cn(
                    'fixed top-0 bottom-0 z-50 w-80 max-w-[85vw] glass-card overflow-y-auto transition-transform duration-300 ease-out',
                    position === 'right' ? 'right-0' : 'left-0',
                    isOpen
                        ? 'translate-x-0'
                        : position === 'right'
                            ? 'translate-x-full'
                            : '-translate-x-full',
                    className
                )}
                style={{
                    transform: swipeState.isSwiping
                        ? `translateX(${translateX}px)`
                        : undefined,
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Mobile menu"
                {...handlers}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-lg"
                    aria-label="Close menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Menu content */}
                <div className="pt-16 pb-6">
                    {children}
                </div>
            </div>
        </>
    );
};
