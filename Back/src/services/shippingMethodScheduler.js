/**
 * Shipping Method Scheduler
 * Handles automatic synchronization of shipping methods from Basalam API
 */

const cron = require('node-cron');
const shippingMethodService = require('./shippingMethodService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ShippingMethodScheduler');

class ShippingMethodScheduler {
  constructor() {
    this.syncTask = null;
    this.isRunning = false;
    this.isSyncing = false;
    this.lastSyncResult = null;
  }

  /**
   * Start the scheduler
   * Runs sync every 24 hours at 2:00 AM
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    try {
      // Schedule sync to run every day at 2:00 AM
      // Cron format: minute hour day month weekday
      // '0 2 * * *' = At 2:00 AM every day
      this.syncTask = cron.schedule('0 2 * * *', async () => {
        await this.performSync();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });

      this.isRunning = true;
      logger.info('Shipping method scheduler started successfully', {
        schedule: 'Daily at 2:00 AM',
        timezone: process.env.TZ || 'UTC'
      });

      // Perform initial sync on startup if needed
      this.performInitialSync();
    } catch (error) {
      logger.error('Failed to start scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    try {
      if (this.syncTask) {
        this.syncTask.stop();
        this.syncTask = null;
      }

      this.isRunning = false;
      logger.info('Shipping method scheduler stopped successfully');
    } catch (error) {
      logger.error('Failed to stop scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Perform initial sync on startup if needed
   */
  async performInitialSync() {
    try {
      logger.info('Checking if initial sync is needed');

      const shouldSync = await shippingMethodService.shouldSync();

      if (shouldSync) {
        logger.info('Initial sync needed, starting sync...');
        await this.performSync();
      } else {
        logger.info('Initial sync not needed, last sync is recent');
      }
    } catch (error) {
      logger.error('Failed to perform initial sync check', {
        error: error.message,
        stack: error.stack
      });
      // Don't throw error, just log it - we don't want to prevent app startup
    }
  }

  /**
   * Perform the sync operation
   */
  async performSync() {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping this run');
      return;
    }

    this.isSyncing = true;
    const syncStartTime = Date.now();

    logger.info('Starting scheduled shipping method sync');

    try {
      // Perform the sync
      const syncedMethods = await shippingMethodService.syncFromBasalam();

      const syncDuration = Date.now() - syncStartTime;

      // Store sync result
      this.lastSyncResult = {
        success: true,
        timestamp: new Date(),
        duration: syncDuration,
        methodCount: syncedMethods.length,
        error: null
      };

      logger.info('Scheduled sync completed successfully', {
        methodCount: syncedMethods.length,
        duration: `${syncDuration}ms`,
        timestamp: this.lastSyncResult.timestamp
      });
    } catch (error) {
      const syncDuration = Date.now() - syncStartTime;

      // Store error result
      this.lastSyncResult = {
        success: false,
        timestamp: new Date(),
        duration: syncDuration,
        methodCount: 0,
        error: error.message
      };

      logger.error('Scheduled sync failed', {
        error: error.message,
        stack: error.stack,
        duration: `${syncDuration}ms`,
        timestamp: this.lastSyncResult.timestamp
      });

      // Don't throw error - we want the scheduler to continue running
      // The next scheduled run will try again
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manually trigger a sync (for testing or admin purposes)
   * @returns {Promise<Object>} Sync result
   */
  async triggerManualSync() {
    logger.info('Manual sync triggered');

    if (this.isSyncing) {
      const error = new Error('Sync already in progress');
      error.status = 409;
      throw error;
    }

    await this.performSync();

    return this.lastSyncResult;
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
      lastSyncResult: this.lastSyncResult,
      schedule: 'Daily at 2:00 AM',
      timezone: process.env.TZ || 'UTC'
    };
  }
}

// Export singleton instance
module.exports = new ShippingMethodScheduler();
