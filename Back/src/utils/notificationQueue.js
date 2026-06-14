const notificationService = require('../services/notificationService');

class NotificationQueue {
  constructor() {
    this.isProcessing = false;
    this.intervalId = null;
    this.retryIntervalId = null;
    this.cleanupIntervalId = null;
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      lastProcessedAt: null,
      lastError: null
    };
  }

  /**
   * Start the notification queue processor
   * @param {number} intervalMs - Processing interval in milliseconds (default: 30 seconds)
   */
  start(intervalMs = 30000) {
    if (this.intervalId) {
      console.log('Notification queue is already running');
      return;
    }

    console.log(`Starting notification queue processor with ${intervalMs}ms interval`);
    
    // Main processing interval
    this.intervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, intervalMs);

    // Retry failed notifications every 5 minutes
    this.retryIntervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.retryFailedNotifications();
      }
    }, 5 * 60 * 1000);

    // Cleanup old notifications daily
    this.cleanupIntervalId = setInterval(async () => {
      await this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);

    // Process immediately on start
    this.processQueue();
  }

  /**
   * Stop the notification queue processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = null;
    }
    
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    
    console.log('Notification queue processor stopped');
  }

  /**
   * Process pending notifications
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const result = await notificationService.processPendingNotifications();
      
      this.stats.totalProcessed += result.processed;
      this.stats.totalFailed += result.failed;
      this.stats.lastProcessedAt = new Date();
      
      if (result.error) {
        this.stats.lastError = result.error;
      }
      
      return result;
    } catch (error) {
      console.error('Error processing notification queue:', error);
      this.stats.lastError = error.message;
      return {
        processed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry failed notifications with exponential backoff
   */
  async retryFailedNotifications() {
    try {
      const result = await notificationService.retryFailedNotifications();
      console.log(`Retry process completed: ${result.retried} retried, ${result.permanentFailures} permanent failures`);
      return result;
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      return {
        retried: 0,
        permanentFailures: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications() {
    try {
      const cleanedCount = await notificationService.cleanupOldNotifications();
      console.log(`Cleaned up ${cleanedCount} old notifications`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  /**
   * Get queue status with detailed information
   * @returns {Object} Queue status information
   */
  async getStatus() {
    try {
      const deliveryStats = await notificationService.getDeliveryStats('24h');
      
      return {
        isRunning: !!this.intervalId,
        isProcessing: this.isProcessing,
        stats: this.stats,
        deliveryStats,
        intervals: {
          processing: !!this.intervalId,
          retry: !!this.retryIntervalId,
          cleanup: !!this.cleanupIntervalId
        }
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        isRunning: !!this.intervalId,
        isProcessing: this.isProcessing,
        stats: this.stats,
        error: error.message
      };
    }
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.intervalId ? Date.now() - this.stats.startTime : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      lastProcessedAt: null,
      lastError: null,
      startTime: Date.now()
    };
  }

  /**
   * Process queue immediately (manual trigger)
   */
  async processNow() {
    return await this.processQueue();
  }

  /**
   * Retry failed notifications immediately (manual trigger)
   */
  async retryNow() {
    return await this.retryFailedNotifications();
  }
}

module.exports = new NotificationQueue();