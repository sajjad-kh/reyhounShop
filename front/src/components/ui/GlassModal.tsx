import { useEffect, useRef } from 'react';
import { ModalProps } from '../../types/modal';
import { cn } from '../../utils';

export const GlassModal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (closeOnEscape && e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, closeOnEscape]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop with blur */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/50',
                    'backdrop-filter backdrop-blur-md',
                    'transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0'
                )}
            />

            {/* Modal Content */}
            <div
                ref={modalRef}
                className={cn(
                    'glass-modal relative w-full',
                    sizeClasses[size],
                    'max-h-[90vh] overflow-y-auto',
                    'scale-in',
                    'focus:outline-none'
                )}
                tabIndex={-1}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        {title && (
                            <h2
                                id="modal-title"
                                className="text-xl font-semibold text-text-primary"
                            >
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={cn(
                                    'ml-auto w-8 h-8 rounded-full',
                                    'flex items-center justify-center',
                                    'text-text-secondary hover:text-text-primary',
                                    'hover:bg-white/10 transition-all',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                                )}
                                aria-label="Close modal"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};
