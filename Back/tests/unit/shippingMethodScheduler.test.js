/**
 * Unit tests for ShippingMethodScheduler
 */

const shippingMethodScheduler = require('../../src/services/shippingMethodScheduler');
const shippingMethodService = require('../../src/services/shippingMethodService');

// Mock the shipping method service
jest.mock('../../src/services/shippingMethodService');

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((pattern, callback, options) => ({
    stop: jest.fn(),
  })),
}));

describe('ShippingMethodScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset scheduler state
    if (shippingMethodScheduler.isRunning) {
      shippingMethodScheduler.stop();
    }
  });

  afterEach(() => {
    if (shippingMethodScheduler.isRunning) {
      shippingMethodScheduler.stop();
    }
  });

  describe('start()', () => {
    it('should start the scheduler successfully', () => {
      shippingMethodService.shouldSync.mockResolvedValue(false);

      shippingMethodScheduler.start();

      expect(shippingMethodScheduler.isRunning).toBe(true);
    });

    it('should not start if already running', () => {
      shippingMethodService.shouldSync.mockResolvedValue(false);

      shippingMethodScheduler.start();
      const firstStart = shippingMethodScheduler.isRunning;

      shippingMethodScheduler.start();
      const secondStart = shippingMethodScheduler.isRunning;

      expect(firstStart).toBe(true);
      expect(secondStart).toBe(true);
    });
  });

  describe('stop()', () => {
    it('should stop the scheduler successfully', () => {
      shippingMethodService.shouldSync.mockResolvedValue(false);

      shippingMethodScheduler.start();
      expect(shippingMethodScheduler.isRunning).toBe(true);

      shippingMethodScheduler.stop();
      expect(shippingMethodScheduler.isRunning).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return scheduler status', () => {
      const status = shippingMethodScheduler.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncResult');
      expect(status).toHaveProperty('schedule');
      expect(status).toHaveProperty('timezone');
    });
  });

  describe('performSync()', () => {
    it('should perform sync successfully', async () => {
      const mockMethods = [
        { id: 1, name: 'Method 1' },
        { id: 2, name: 'Method 2' },
      ];

      shippingMethodService.syncFromBasalam.mockResolvedValue(mockMethods);

      await shippingMethodScheduler.performSync();

      expect(shippingMethodService.syncFromBasalam).toHaveBeenCalled();
      expect(shippingMethodScheduler.lastSyncResult).toBeDefined();
      expect(shippingMethodScheduler.lastSyncResult.success).toBe(true);
      expect(shippingMethodScheduler.lastSyncResult.methodCount).toBe(2);
    });

    it('should handle sync errors gracefully', async () => {
      const mockError = new Error('Sync failed');
      shippingMethodService.syncFromBasalam.mockRejectedValue(mockError);

      await shippingMethodScheduler.performSync();

      expect(shippingMethodScheduler.lastSyncResult).toBeDefined();
      expect(shippingMethodScheduler.lastSyncResult.success).toBe(false);
      expect(shippingMethodScheduler.lastSyncResult.error).toBe('Sync failed');
    });

    it('should prevent concurrent syncs', async () => {
      shippingMethodService.syncFromBasalam.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      // Start first sync
      const firstSync = shippingMethodScheduler.performSync();

      // Try to start second sync while first is running
      await shippingMethodScheduler.performSync();

      // Wait for first sync to complete
      await firstSync;

      // Should only call syncFromBasalam once
      expect(shippingMethodService.syncFromBasalam).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerManualSync()', () => {
    it('should trigger manual sync successfully', async () => {
      const mockMethods = [{ id: 1, name: 'Method 1' }];
      shippingMethodService.syncFromBasalam.mockResolvedValue(mockMethods);

      const result = await shippingMethodScheduler.triggerManualSync();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(shippingMethodService.syncFromBasalam).toHaveBeenCalled();
    });

    it('should throw error if sync is already in progress', async () => {
      shippingMethodService.syncFromBasalam.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      // Start first sync
      const firstSync = shippingMethodScheduler.performSync();

      // Try to trigger manual sync while first is running
      await expect(shippingMethodScheduler.triggerManualSync()).rejects.toThrow(
        'Sync already in progress'
      );

      // Wait for first sync to complete
      await firstSync;
    });
  });
});
