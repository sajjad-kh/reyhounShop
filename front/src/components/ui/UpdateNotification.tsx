import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { cn } from '../../utils';

export interface UpdateNotificationProps {
    className?: string;
}

export const UpdateNotification = ({ className }: UpdateNotificationProps) => {
    const { isUpdateAvailable, updateApp } = usePWA();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    if (!isUpdateAvailable || isDismissed) {
        return null;
    }

    const handleUpdate = async () => {
        setIsUpdating(true);
        await updateApp();
    };

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    return (
        <div
            className={cn(
                'fixed top-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in-down',
                className
            )}
        >
            <GlassCard className="p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <svg
                            className="w-8 h-8 text-success-color"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-text-primary mb-1">
                            Update Available
                        </h3>
                        <p className="text-sm text-text-secondary mb-3">
                            A new version of GlassShop is available. Update now for the latest features and improvements.
                        </p>

                        <div className="flex space-x-2">
                            <GlassButton
                                variant="accent"
                                size="sm"
                                onClick={handleUpdate}
                                loading={isUpdating}
                            >
                                {isUpdating ? 'Updating...' : 'Update Now'}
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                size="sm"
                                onClick={handleDismiss}
                            >
                                Later
                            </GlassButton>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
