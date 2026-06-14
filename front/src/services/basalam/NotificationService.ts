/**
 * Notification Service for Basalam Orders
 * Manages notifications for order status changes with user preferences
 * 
 * Features:
 * - Show toast notifications on order status changes
 * - User preferences for notification types
 * - Localized messages for different order statuses
 * - Integration with OrderSyncService
 */

import { OrderStatus } from '../../types/basalam';
import { ToastType } from '../../types/toast';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
    enabled: boolean;
    statusChanges: boolean;
    paymentUpdates: boolean;
    deliveryUpdates: boolean;
    soundEnabled: boolean;
}

export interface OrderStatusNotification {
    orderId: number;
    orderNumber?: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
}

// ============================================================================
// Constants
// ============================================================================

const PREFERENCES_STORAGE_KEY = 'basalam_notification_preferences';

const DEFAULT_PREFERENCES: NotificationPreferences = {
    enabled: true,
    statusChanges: true,
    paymentUpdates: true,
    deliveryUpdates: true,
    soundEnabled: false,
};

// Status change messages in Persian
const STATUS_MESSAGES: Record<OrderStatus, string> = {
    pending_payment: 'در انتظار پرداخت',
    paid: 'پرداخت موفق - سفارش ثبت شد',
    processing: 'در حال پردازش',
    shipped: 'ارسال شد',
    delivered: 'تحویل داده شد',
    cancelled: 'لغو شد',
};

// Map status to toast type
const STATUS_TOAST_TYPE: Record<OrderStatus, ToastType> = {
    pending_payment: 'info',
    paid: 'success',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'warning',
};

// ============================================================================
// Notification Service Class
// ============================================================================

class NotificationService {
    private preferences: NotificationPreferences;
    private addToastCallback?: (toast: { type: ToastType; message: string; duration?: number }) => void;

    constructor() {
        this.preferences = this.loadPreferences();
    }

    /**
     * Initialize the notification service with toast callback
     */
    initialize(addToast: (toast: { type: ToastType; message: string; duration?: number }) => void): void {
        this.addToastCallback = addToast;
    }

    /**
     * Load preferences from localStorage
     */
    private loadPreferences(): NotificationPreferences {
        try {
            const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_PREFERENCES, ...parsed };
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        }
        return DEFAULT_PREFERENCES;
    }

    /**
     * Save preferences to localStorage
     */
    private savePreferences(): void {
        try {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    }

    /**
     * Get current preferences
     */
    getPreferences(): NotificationPreferences {
        return { ...this.preferences };
    }

    /**
     * Update preferences
     */
    updatePreferences(updates: Partial<NotificationPreferences>): void {
        this.preferences = { ...this.preferences, ...updates };
        this.savePreferences();
    }

    /**
     * Reset preferences to defaults
     */
    resetPreferences(): void {
        this.preferences = { ...DEFAULT_PREFERENCES };
        this.savePreferences();
    }

    /**
     * Check if notifications should be shown for a status change
     */
    private shouldNotify(oldStatus: OrderStatus, newStatus: OrderStatus): boolean {
        if (!this.preferences.enabled) {
            return false;
        }

        // Check specific preference categories
        if (newStatus === 'paid' && !this.preferences.paymentUpdates) {
            return false;
        }

        if ((newStatus === 'shipped' || newStatus === 'delivered') && !this.preferences.deliveryUpdates) {
            return false;
        }

        if (!this.preferences.statusChanges) {
            return false;
        }

        return true;
    }

    /**
     * Show notification for order status change
     */
    notifyStatusChange(notification: OrderStatusNotification): void {
        if (!this.addToastCallback) {
            console.warn('NotificationService: Toast callback not initialized');
            return;
        }

        if (!this.shouldNotify(notification.oldStatus, notification.newStatus)) {
            return;
        }

        const statusMessage = STATUS_MESSAGES[notification.newStatus];
        const toastType = STATUS_TOAST_TYPE[notification.newStatus];

        const message = notification.orderNumber
            ? `سفارش ${notification.orderNumber}: ${statusMessage}`
            : `سفارش شما: ${statusMessage}`;

        this.addToastCallback({
            type: toastType,
            message,
            duration: 5000,
        });

        // Play sound if enabled
        if (this.preferences.soundEnabled) {
            this.playNotificationSound();
        }
    }

    /**
     * Show payment success notification
     */
    notifyPaymentSuccess(orderNumber: string): void {
        if (!this.addToastCallback || !this.preferences.enabled || !this.preferences.paymentUpdates) {
            return;
        }

        this.addToastCallback({
            type: 'success',
            message: `پرداخت سفارش ${orderNumber} با موفقیت انجام شد`,
            duration: 6000,
        });

        if (this.preferences.soundEnabled) {
            this.playNotificationSound();
        }
    }

    /**
     * Show payment failure notification
     */
    notifyPaymentFailure(orderNumber?: string): void {
        if (!this.addToastCallback || !this.preferences.enabled || !this.preferences.paymentUpdates) {
            return;
        }

        const message = orderNumber
            ? `پرداخت سفارش ${orderNumber} ناموفق بود`
            : 'پرداخت ناموفق بود';

        this.addToastCallback({
            type: 'error',
            message,
            duration: 6000,
        });
    }

    /**
     * Show order created notification
     */
    notifyOrderCreated(orderNumber: string): void {
        if (!this.addToastCallback || !this.preferences.enabled) {
            return;
        }

        this.addToastCallback({
            type: 'success',
            message: `سفارش ${orderNumber} با موفقیت ثبت شد`,
            duration: 5000,
        });
    }

    /**
     * Show delivery notification
     */
    notifyDelivery(orderNumber: string, trackingCode?: string): void {
        if (!this.addToastCallback || !this.preferences.enabled || !this.preferences.deliveryUpdates) {
            return;
        }

        const message = trackingCode
            ? `سفارش ${orderNumber} ارسال شد - کد رهگیری: ${trackingCode}`
            : `سفارش ${orderNumber} ارسال شد`;

        this.addToastCallback({
            type: 'info',
            message,
            duration: 7000,
        });

        if (this.preferences.soundEnabled) {
            this.playNotificationSound();
        }
    }

    /**
     * Show generic error notification
     */
    notifyError(message: string): void {
        if (!this.addToastCallback || !this.preferences.enabled) {
            return;
        }

        this.addToastCallback({
            type: 'error',
            message,
            duration: 5000,
        });
    }

    /**
     * Show generic info notification
     */
    notifyInfo(message: string): void {
        if (!this.addToastCallback || !this.preferences.enabled) {
            return;
        }

        this.addToastCallback({
            type: 'info',
            message,
            duration: 4000,
        });
    }

    /**
     * Play notification sound
     */
    private playNotificationSound(): void {
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    /**
     * Request browser notification permission (for future enhancement)
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Check if browser notifications are supported and permitted
     */
    isBrowserNotificationSupported(): boolean {
        return 'Notification' in window && Notification.permission === 'granted';
    }
}

// Export singleton instance
export default new NotificationService();
