import { usePWA } from '../../hooks/usePWA';
import { cn } from '../../utils';

export interface OfflineIndicatorProps {
    className?: string;
}

export const OfflineIndicator = ({ className }: OfflineIndicatorProps) => {
    const { isOnline } = usePWA();

    if (isOnline) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed top-16 left-0 right-0 z-40 glass-card bg-warning-color/20 border-warning-color/30 py-2 px-4 text-center animate-slide-in-down',
                className
            )}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-center justify-center space-x-2">
                <svg
                    className="w-5 h-5 text-warning-color"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                    />
                </svg>
                <span className="text-sm font-medium text-text-primary">
                    You're offline. Some features may be limited.
                </span>
            </div>
        </div>
    );
};
