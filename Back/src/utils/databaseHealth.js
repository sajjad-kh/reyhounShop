/**
 * Database Health Check Utility
 * Provides health monitoring and diagnostics for database connections
 */

const { databaseConfig } = require('../config/database');

class DatabaseHealthCheck {
  constructor() {
    this.prisma = null;
  }

  /**
   * Initialize with database client
   */
  initialize(prismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const results = {
      status: 'healthy',
      provider: databaseConfig.getProvider(),
      connectionInfo: databaseConfig.getConnectionInfo(),
      checks: {},
      timestamp: new Date().toISOString(),
    };

    try {
      // Test basic connection
      results.checks.connection = await this.checkConnection();
      
      // Test read operations
      results.checks.read = await this.checkReadOperations();
      
      // Test write operations
      results.checks.write = await this.checkWriteOperations();
      
      // Check database schema
      results.checks.schema = await this.checkSchema();
      
      // Performance metrics
      results.checks.performance = await this.checkPerformance();

      // Determine overall status
      const hasFailures = Object.values(results.checks).some(check => !check.success);
      results.status = hasFailures ? 'unhealthy' : 'healthy';

    } catch (error) {
      results.status = 'error';
      results.error = error.message;
    }

    return results;
  }

  /**
   * Check database connection
   */
  async checkConnection() {
    try {
      const startTime = Date.now();
      await this.prisma.$connect();
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: `${duration}ms`,
        message: 'Connection successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Connection failed',
      };
    }
  }

  /**
   * Check read operations
   */
  async checkReadOperations() {
    try {
      const startTime = Date.now();
      
      // Test reading from User table (should exist)
      const userCount = await this.prisma.user.count();
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: `${duration}ms`,
        userCount,
        message: 'Read operations successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Read operations failed',
      };
    }
  }

  /**
   * Check write operations
   */
  async checkWriteOperations() {
    try {
      const startTime = Date.now();
      
      // Create a test activity log entry
      const testLog = await this.prisma.activityLog.create({
        data: {
          action: 'health_check',
          entity: 'System',
          details: { test: true, timestamp: new Date() },
          ip: '127.0.0.1',
        },
      });

      // Clean up the test entry
      await this.prisma.activityLog.delete({
        where: { id: testLog.id },
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: `${duration}ms`,
        message: 'Write operations successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Write operations failed',
      };
    }
  }

  /**
   * Check database schema integrity
   */
  async checkSchema() {
    try {
      const startTime = Date.now();
      
      // Check if all required tables exist by querying them
      const tables = [
        'user', 'product', 'category', 'order', 'orderItem',
        'cart', 'cartItem', 'review', 'wishlist', 'discount',
        'loyaltyTransaction', 'activityLog', 'apiLog', 'errorLog',
        'payment', 'paymentTransaction', 'address', 'productImage',
        'notification', 'notificationPreference'
      ];

      const tableChecks = {};
      
      for (const table of tables) {
        try {
          await this.prisma[table].findFirst();
          tableChecks[table] = true;
        } catch (error) {
          tableChecks[table] = false;
        }
      }

      const duration = Date.now() - startTime;
      const missingTables = Object.entries(tableChecks)
        .filter(([, exists]) => !exists)
        .map(([table]) => table);

      return {
        success: missingTables.length === 0,
        duration: `${duration}ms`,
        tableChecks,
        missingTables,
        message: missingTables.length === 0 
          ? 'All tables exist' 
          : `Missing tables: ${missingTables.join(', ')}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Schema check failed',
      };
    }
  }

  /**
   * Check database performance
   */
  async checkPerformance() {
    try {
      const metrics = {};
      
      // Test query performance
      const startTime = Date.now();
      
      if (databaseConfig.isMySQL()) {
        // MySQL-specific performance queries
        const [processlist] = await this.prisma.$queryRaw`SHOW PROCESSLIST`;
        metrics.activeConnections = processlist ? 1 : 0;
        
        const [status] = await this.prisma.$queryRaw`SHOW STATUS LIKE 'Threads_connected'`;
        metrics.totalConnections = status?.Value || 'unknown';
      } else {
        // SQLite performance check
        const pragma = await this.prisma.$queryRaw`PRAGMA database_list`;
        metrics.databases = pragma.length;
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: `${duration}ms`,
        metrics,
        message: 'Performance check completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Performance check failed',
      };
    }
  }

  /**
   * Get quick status
   */
  async getQuickStatus() {
    try {
      await this.prisma.$connect();
      return {
        status: 'healthy',
        provider: databaseConfig.getProvider(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: databaseConfig.getProvider(),
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
const databaseHealthCheck = new DatabaseHealthCheck();

module.exports = {
  DatabaseHealthCheck,
  databaseHealthCheck,
};