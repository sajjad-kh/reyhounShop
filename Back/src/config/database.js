/**
 * Database Configuration Module
 * Handles SQLite (development) and MySQL (production) database connections
 */

const { PrismaClient } = require('@prisma/client');

class DatabaseConfig {
  constructor() {
    this.prisma = null;
    this.provider = process.env.DATABASE_PROVIDER || 'sqlite';
  }

  /**
   * Initialize Prisma client with appropriate configuration
   */
  async initialize() {
    try {
      const config = {
        log: process.env.NODE_ENV === 'development' ? 
          [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' }
          ] : 
          [{ emit: 'event', level: 'error' }],
        errorFormat: 'pretty',
      };

      // Add MySQL-specific configuration with connection pooling
      if (this.provider === 'mysql') {
        const url = new URL(process.env.DATABASE_URL);
        
        // Add connection pooling parameters
        url.searchParams.set('connection_limit', '10');
        url.searchParams.set('pool_timeout', '20');
        url.searchParams.set('socket_timeout', '60');
        
        config.datasources = {
          db: {
            url: url.toString(),
          },
        };
      }

      this.prisma = new PrismaClient(config);

      // Set up query logging and performance monitoring
      this.setupQueryLogging();

      // Test the connection
      await this.testConnection();
      
      console.log(`✅ Database connected successfully (${this.provider.toUpperCase()})`);
      return this.prisma;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      await this.prisma.$connect();
      
      // Test with a simple query
      if (this.provider === 'mysql') {
        await this.prisma.$queryRaw`SELECT 1`;
      } else {
        await this.prisma.$queryRaw`SELECT 1 as test`;
      }
      
      return true;
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient() {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      console.log('🔌 Database disconnected');
    }
  }

  /**
   * Get database provider information
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if using MySQL
   */
  isMySQL() {
    return this.provider === 'mysql';
  }

  /**
   * Check if using SQLite
   */
  isSQLite() {
    return this.provider === 'sqlite';
  }

  /**
   * Set up query logging and performance monitoring
   */
  setupQueryLogging() {
    if (!this.prisma) return;

    // Query performance monitoring
    this.prisma.$on('query', (e) => {
      const duration = e.duration;
      
      // Log slow queries (> 1000ms)
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, {
          query: e.query,
          params: e.params,
          duration: `${duration}ms`
        });
      }

      // Log all queries in development
      if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
        console.log(`📊 Query (${duration}ms):`, e.query);
      }
    });

    // Error logging
    this.prisma.$on('error', (e) => {
      console.error('❌ Database error:', e);
    });

    // Info logging
    this.prisma.$on('info', (e) => {
      console.info('ℹ️ Database info:', e.message);
    });

    // Warning logging
    this.prisma.$on('warn', (e) => {
      console.warn('⚠️ Database warning:', e.message);
    });
  }

  /**
   * Get query performance metrics
   */
  async getQueryMetrics() {
    if (!this.prisma) return null;

    try {
      // Get database statistics
      const stats = {
        connectionCount: await this.getConnectionCount(),
        slowQueries: await this.getSlowQueryCount(),
        avgResponseTime: await this.getAverageResponseTime(),
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Error getting query metrics:', error);
      return null;
    }
  }

  /**
   * Get connection count (MySQL specific)
   */
  async getConnectionCount() {
    if (this.provider !== 'mysql') return null;

    try {
      const result = await this.prisma.$queryRaw`SHOW STATUS LIKE 'Threads_connected'`;
      return result[0]?.Value || 0;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get slow query count from API logs
   */
  async getSlowQueryCount() {
    try {
      const slowQueries = await this.prisma.apiLog.count({
        where: {
          responseTime: {
            gt: 1000
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      return slowQueries;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get average response time from API logs
   */
  async getAverageResponseTime() {
    try {
      const result = await this.prisma.apiLog.aggregate({
        _avg: {
          responseTime: true
        },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          responseTime: {
            not: null
          }
        }
      });
      return Math.round(result._avg.responseTime || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Optimize database queries with prepared statements
   */
  async optimizeQueries() {
    if (this.provider === 'mysql') {
      try {
        // Enable query cache
        await this.prisma.$executeRaw`SET GLOBAL query_cache_type = ON`;
        await this.prisma.$executeRaw`SET GLOBAL query_cache_size = 67108864`; // 64MB
        
        console.log('✅ MySQL query optimization enabled');
      } catch (error) {
        console.warn('⚠️ Could not enable MySQL query optimization:', error.message);
      }
    }
  }

  /**
   * Get database connection info (without sensitive data)
   */
  getConnectionInfo() {
    const url = process.env.DATABASE_URL;
    
    if (this.provider === 'mysql') {
      // Parse MySQL URL to show connection info without password
      try {
        const urlObj = new URL(url);
        return {
          provider: this.provider,
          host: urlObj.hostname,
          port: urlObj.port || 3306,
          database: urlObj.pathname.slice(1),
          username: urlObj.username,
        };
      } catch (error) {
        return {
          provider: this.provider,
          url: 'Invalid URL format',
        };
      }
    } else {
      return {
        provider: this.provider,
        file: url.replace('file:', ''),
      };
    }
  }
}

// Create singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = {
  DatabaseConfig,
  databaseConfig,
};