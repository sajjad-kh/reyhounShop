import { useEffect, useState } from 'react';
import { Toast } from '../../types/toast';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils';

interface ToastNotificationProps {
    toast: Toast;
}

export const ToastNotification = ({ toast }: ToastNotificationProps) => {
    const { removeToast } = useToast();
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const exitTimer = setTimeout(() => {
                setIsExiting(true);
            }, toast.duration - 300);

            return () => clearTimeout(exitTimer);
        }
    }, [toast.duration]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            removeToast(toast.id);
        }, 300);
    };

    const typeStyles = {
        success: 'border-green-400/30 bg-green-500/10',
        error: 'border-red-400/30 bg-red-500/10',
        warning: 'border-yellow-400/30 bg-yellow-500/10',
        info: 'border-blue-400/30 bg-blue-500/10',
    };

    const iconStyles = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    const iconColors = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
    };

    return (
        <div
            className={cn(
                'glass-base pointer-events-auto min-w-[320px] max-w-md p-4',
                'flex items-start gap-3',
                'transition-all duration-300 ease-out',
                typeStyles[toast.type],
                isExiting
                    ? 'opacity-0 translate-x-full scale-95'
                    : 'opacity-100 translate-x-0 scale-100 slide-in-right'
            )}
            role="alert"
            aria-live="assertive"
        >
            <div
                className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    'font-bold text-sm',
                    iconColors[toast.type]
                )}
            >
                {iconStyles[toast.type]}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium break-words">
                    {toast.message}
                </p>
            </div>

            {toast.dismissible && (
                <button
                    onClick={handleDismiss}
                    className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full',
                        'flex items-center justify-center',
                        'text-text-secondary hover:text-text-primary',
                        'hover:bg-white/10 transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                    )}
                    aria-label="Dismiss notification"
                >
                    ✕
                </button>
            )}
        </div>
    );
};
