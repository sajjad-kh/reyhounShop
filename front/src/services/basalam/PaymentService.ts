/**
 * Payment Service
 * Handles payment redirect logic and pending order management
 */

import { PendingOrderStorage } from '../../types/basalam';

class PaymentService {
    private pendingOrderKey = 'basalam_pending_order';

    /**
     * Save pending order to localStorage before redirect
     */
    savePendingOrder(orderId: number, orderNumber: string, expiresAt: string): void {
        const pendingOrder: PendingOrderStorage = {
            orderId,
            orderNumber,
            createdAt: new Date().toISOString(),
            expiresAt,
        };

        localStorage.setItem(this.pendingOrderKey, JSON.stringify(pendingOrder));
    }

    /**
     * Get pending order from localStorage
     */
    getPendingOrder(): PendingOrderStorage | null {
        try {
            const data = localStorage.getItem(this.pendingOrderKey);
            if (!data) return null;

            const pendingOrder: PendingOrderStorage = JSON.parse(data);

            // Check if order has expired
            if (this.isOrderExpired(pendingOrder.expiresAt)) {
                this.clearPendingOrder();
                return null;
            }

            return pendingOrder;
        } catch (error) {
            console.error('Error reading pending order:', error);
            return null;
        }
    }

    /**
     * Clear pending order from localStorage
     */
    clearPendingOrder(): void {
        localStorage.removeItem(this.pendingOrderKey);
    }

    /**
     * Check if payment URL has expired
     */
    isOrderExpired(expiresAt: string): boolean {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = new Date().getTime();
        return currentTime > expirationTime;
    }

    /**
     * Redirect user to payment URL
     */
    redirectToPayment(paymentUrl: string): void {
        // Use window.location.href for full page redirect
        window.location.href = paymentUrl;
    }

    /**
     * Get time remaining until expiration (in seconds)
     */
    getTimeRemaining(expiresAt: string): number {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = new Date().getTime();
        const remaining = Math.floor((expirationTime - currentTime) / 1000);
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Format time remaining as human-readable string
     */
    formatTimeRemaining(seconds: number): string {
        if (seconds <= 0) return 'منقضی شده';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes} دقیقه و ${remainingSeconds} ثانیه`;
        }
        return `${remainingSeconds} ثانیه`;
    }
}

export default new PaymentService();
