import { useState, useEffect } from 'react';
import {
    registerServiceWorker,
    checkForUpdates,
    isOnline,
    onOnlineStatusChange,
} from '../utils/serviceWorker';

export interface PWAState {
    isInstalled: boolean;
    isUpdateAvailable: boolean;
    isOnline: boolean;
    canInstall: boolean;
}

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWA = () => {
    const [state, setState] = useState<PWAState>({
        isInstalled: false,
        isUpdateAvailable: false,
        isOnline: isOnline(),
        canInstall: false,
    });

    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Check if app is installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        // @ts-ignore
        const isIOSStandalone = window.navigator.standalone === true;

        setState((prev) => ({
            ...prev,
            isInstalled: isStandalone || isIOSStandalone,
        }));

        // Register service worker
        registerServiceWorker({
            onSuccess: () => {
                console.log('Service worker registered successfully');
            },
            onUpdate: () => {
                setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            },
            onError: (error) => {
                console.error('Service worker registration error:', error);
            },
        });

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setState((prev) => ({ ...prev, canInstall: true }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for app installed
        const handleAppInstalled = () => {
            setState((prev) => ({ ...prev, isInstalled: true, canInstall: false }));
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        // Listen for online/offline status
        const unsubscribe = onOnlineStatusChange((online) => {
            setState((prev) => ({ ...prev, isOnline: online }));
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            unsubscribe();
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) {
            console.warn('Install prompt not available');
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setState((prev) => ({ ...prev, canInstall: false }));
                setDeferredPrompt(null);
                return true;
            } else {
                console.log('User dismissed the install prompt');
                return false;
            }
        } catch (error) {
            console.error('Error showing install prompt:', error);
            return false;
        }
    };

    const updateApp = async () => {
        try {
            await checkForUpdates();
            window.location.reload();
        } catch (error) {
            console.error('Error updating app:', error);
        }
    };

    return {
        ...state,
        installApp,
        updateApp,
    };
};
