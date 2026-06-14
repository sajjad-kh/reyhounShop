import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { cn } from '../../utils';

export interface InstallPromptProps {
    className?: string;
}

export const InstallPrompt = ({ className }: InstallPromptProps) => {
    const { canInstall, installApp } = usePWA();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    if (!canInstall || isDismissed) {
        return null;
    }

    const handleInstall = async () => {
        setIsInstalling(true);
        const success = await installApp();
        setIsInstalling(false);

        if (success) {
            setIsDismissed(true);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    return (
        <div
            className={cn(
                'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in-up',
                className
            )}
        >
            <GlassCard className="p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <svg
                            className="w-10 h-10 text-accent-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                            Install GlassShop
                        </h3>
                        <p className="text-sm text-text-secondary mb-3">
                            Install our app for a better shopping experience with offline access and faster loading.
                        </p>

                        <div className="flex space-x-2">
                            <GlassButton
                                variant="accent"
                                size="sm"
                                onClick={handleInstall}
                                loading={isInstalling}
                                className="flex-1"
                            >
                                Install
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                size="sm"
                                onClick={handleDismiss}
                                className="flex-1"
                            >
                                Not Now
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
