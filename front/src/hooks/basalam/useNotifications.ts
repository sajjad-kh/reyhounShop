/**
 * useNotifications Hook
 * React hook for managing Basalam order notifications
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import NotificationService, { NotificationPreferences } from '../../services/basalam/NotificationService';

export const useNotifications = () => {
    const { addToast } = useToast();
    const [preferences, setPreferences] = useState<NotificationPreferences>(
        NotificationService.getPreferences()
    );

    // Initialize notification service with toast callback
    useEffect(() => {
        NotificationService.initialize(addToast);
    }, [addToast]);

    // Update preferences
    const updatePreferences = (updates: Partial<NotificationPreferences>) => {
        NotificationService.updatePreferences(updates);
        setPreferences(NotificationService.getPreferences());
    };

    // Reset preferences to defaults
    const resetPreferences = () => {
        NotificationService.resetPreferences();
        setPreferences(NotificationService.getPreferences());
    };

    // Request browser notification permission
    const requestPermission = async () => {
        return await NotificationService.requestPermission();
    };

    return {
        preferences,
        updatePreferences,
        resetPreferences,
        requestPermission,
        isBrowserNotificationSupported: NotificationService.isBrowserNotificationSupported(),
    };
};
