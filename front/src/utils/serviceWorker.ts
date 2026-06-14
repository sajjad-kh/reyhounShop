export interface ServiceWorkerConfig {
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onError?: (error: Error) => void;
}

export const registerServiceWorker = (config?: ServiceWorkerConfig) => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = '/sw.js';

            navigator.serviceWorker
                .register(swUrl)
                .then((registration) => {
                    console.log('Service Worker registered:', registration);

                    // Check for updates
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (!installingWorker) return;

                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // New update available
                                    console.log('New content available; please refresh.');
                                    config?.onUpdate?.(registration);
                                } else {
                                    // Content cached for offline use
                                    console.log('Content cached for offline use.');
                                    config?.onSuccess?.(registration);
                                }
                            }
                        };
                    };
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                    config?.onError?.(error);
                });
        });
    }
};

export const unregisterServiceWorker = () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error('Service Worker unregistration failed:', error);
            });
    }
};

export const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.update();
    }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
};

export const showNotification = async (
    title: string,
    options?: NotificationOptions
) => {
    const permission = await requestNotificationPermission();

    if (permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            ...options,
        });
    }
};

export const syncData = async (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            // @ts-ignore - Background Sync API
            await registration.sync.register(tag);
            console.log(`Background sync registered: ${tag}`);
        } catch (error) {
            console.error('Background sync registration failed:', error);
        }
    }
};

export const isOnline = (): boolean => {
    return navigator.onLine;
};

export const onOnlineStatusChange = (
    callback: (isOnline: boolean) => void
): (() => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
