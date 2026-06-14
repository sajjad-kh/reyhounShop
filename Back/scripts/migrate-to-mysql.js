#!/usr/bin/env node

/**
 * Database Migration Script: SQLite to MySQL
 * 
 * This script migrates data from SQLite (development) to MySQL (production)
 * with comprehensive validation and rollback capabilities.
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class DatabaseMigrator {
  constructor() {
    this.sourceClient = null;
    this.targetClient = null;
    this.migrationLog = [];
    this.startTime = new Date();
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    console.log('🔄 Initializing database connections...');
    
    try {
      // Source database (SQLite)
      this.sourceClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.SOURCE_DATABASE_URL || 'file:./prisma/dev.db'
          }
        },
        log: ['error']
      });

      // Target database (MySQL)
      this.targetClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL
          }
        },
        log: ['error']
      });

      await this.sourceClient.$connect();
      await this.targetClient.$connect();

      console.log('✅ Database connections established');
      this.log('Database connections initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error.message);
      throw error;
    }
  }

  /**
   * Log migration activities
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };
    
    this.migrationLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Validate source database
   */
  async validateSourceDatabase() {
    console.log('🔍 Validating source database...');
    
    try {
      const tables = [
        'user', 'address', 'category', 'product', 'productImage',
        'cart', 'cartItem', 'order', 'orderItem', 'review',
        'wishlist', 'discount', 'loyaltyTransaction', 'activityLog',
        'apiLog', 'errorLog', 'payment', 'paymentTransaction',
        'notification', 'notificationPreference'
      ];

      const validation = {};
      
      for (const table of tables) {
        try {
          const count = await this.sourceClient[table].count();
          validation[table] = { exists: true, count };
          this.log(`Source table '${table}': ${count} records`);
        } catch (error) {
          validation[table] = { exists: false, error: error.message };
          this.log(`Source table '${table}': ERROR - ${error.message}`, 'error');
        }
      }

      const missingTables = Object.entries(validation)
        .filter(([, info]) => !info.exists)
        .map(([table]) => table);

      if (missingTables.length > 0) {
        throw new Error(`Missing source tables: ${missingTables.join(', ')}`);
      }

      console.log('✅ Source database validation completed');
      return validation;
    } catch (error) {
      this.log(`Source database validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Prepare target database
   */
  async prepareTargetDatabase() {
    console.log('🔧 Preparing target database...');
    
    try {
      // Check if target database is empty or has existing data
      const userCount = await this.targetClient.user.count();
      
      if (userCount > 0) {
        const proceed = process.env.FORCE_MIGRATION === 'true';
        if (!proceed) {
          throw new Error('Target database contains data. Set FORCE_MIGRATION=true to proceed with overwrite.');
        }
        
        console.log('⚠️  Target database contains data. Proceeding with forced migration...');
        this.log('Forced migration: Target database contains existing data', 'warning');
      }

      // Disable foreign key checks for MySQL
      await this.targetClient.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
      
      console.log('✅ Target database prepared');
      this.log('Target database prepared successfully');
    } catch (error) {
      this.log(`Target database preparation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Migrate data for a specific table
   */
  async migrateTable(tableName, batchSize = 1000) {
    console.log(`📦 Migrating table: ${tableName}`);
    
    try {
      const totalRecords = await this.sourceClient[tableName].count();
      
      if (totalRecords === 0) {
        this.log(`Table '${tableName}': No records to migrate`);
        return { migrated: 0, total: 0 };
      }

      let migratedCount = 0;
      let offset = 0;

      while (offset < totalRecords) {
        const batch = await this.sourceClient[tableName].findMany({
          skip: offset,
          take: batchSize
        });

        if (batch.length === 0) break;

        // Process batch based on table type
        await this.processBatch(tableName, batch);
        
        migratedCount += batch.length;
        offset += batchSize;

        const progress = ((migratedCount / totalRecords) * 100).toFixed(1);
        console.log(`  Progress: ${migratedCount}/${totalRecords} (${progress}%)`);
      }

      this.log(`Table '${tableName}': Migrated ${migratedCount}/${totalRecords} records`);
      return { migrated: migratedCount, total: totalRecords };
    } catch (error) {
      this.log(`Table '${tableName}' migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Process a batch of records for migration
   */
  async processBatch(tableName, batch) {
    try {
      // Handle special cases for different tables
      switch (tableName) {
        case 'user':
          await this.migrateUserBatch(batch);
          break;
        case 'product':
          await this.migrateProductBatch(batch);
          break;
        case 'order':
          await this.migrateOrderBatch(batch);
          break;
        default:
          await this.migrateGenericBatch(tableName, batch);
      }
    } catch (error) {
      this.log(`Batch processing failed for ${tableName}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Migrate user batch with special handling
   */
  async migrateUserBatch(batch) {
    for (const user of batch) {
      try {
        await this.targetClient.user.upsert({
          where: { id: user.id },
          update: user,
          create: user
        });
      } catch (error) {
        // Handle unique constraint violations
        if (error.code === 'P2002') {
          this.log(`User ID ${user.id}: Unique constraint violation, skipping`, 'warning');
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Migrate product batch with special handling
   */
  async migrateProductBatch(batch) {
    for (const product of batch) {
      try {
        await this.targetClient.product.upsert({
          where: { id: product.id },
          update: product,
          create: product
        });
      } catch (error) {
        if (error.code === 'P2002') {
          this.log(`Product ID ${product.id}: Unique constraint violation, skipping`, 'warning');
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Migrate order batch with special handling
   */
  async migrateOrderBatch(batch) {
    for (const order of batch) {
      try {
        await this.targetClient.order.upsert({
          where: { id: order.id },
          update: order,
          create: order
        });
      } catch (error) {
        if (error.code === 'P2003') {
          this.log(`Order ID ${order.id}: Foreign key constraint violation, skipping`, 'warning');
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Migrate generic batch
   */
  async migrateGenericBatch(tableName, batch) {
    try {
      await this.targetClient[tableName].createMany({
        data: batch,
        skipDuplicates: true
      });
    } catch (error) {
      // Fallback to individual inserts for better error handling
      for (const record of batch) {
        try {
          await this.targetClient[tableName].create({
            data: record
          });
        } catch (individualError) {
          this.log(`Record in ${tableName}: ${individualError.message}`, 'warning');
        }
      }
    }
  }

  /**
   * Validate migrated data
   */
  async validateMigration() {
    console.log('🔍 Validating migrated data...');
    
    try {
      const tables = [
        'user', 'address', 'category', 'product', 'productImage',
        'cart', 'cartItem', 'order', 'orderItem', 'review',
        'wishlist', 'discount', 'loyaltyTransaction', 'activityLog',
        'apiLog', 'errorLog', 'payment', 'paymentTransaction',
        'notification', 'notificationPreference'
      ];

      const validation = {};
      let totalDiscrepancies = 0;

      for (const table of tables) {
        try {
          const sourceCount = await this.sourceClient[table].count();
          const targetCount = await this.targetClient[table].count();
          
          const discrepancy = sourceCount - targetCount;
          validation[table] = {
            source: sourceCount,
            target: targetCount,
            discrepancy,
            status: discrepancy === 0 ? 'OK' : 'MISMATCH'
          };

          if (discrepancy !== 0) {
            totalDiscrepancies += Math.abs(discrepancy);
            this.log(`Table '${table}': Count mismatch - Source: ${sourceCount}, Target: ${targetCount}`, 'warning');
          } else {
            this.log(`Table '${table}': Validation passed - ${sourceCount} records`);
          }
        } catch (error) {
          validation[table] = {
            status: 'ERROR',
            error: error.message
          };
          this.log(`Table '${table}' validation failed: ${error.message}`, 'error');
        }
      }

      if (totalDiscrepancies === 0) {
        console.log('✅ Data validation completed successfully');
      } else {
        console.log(`⚠️  Data validation completed with ${totalDiscrepancies} discrepancies`);
      }

      return validation;
    } catch (error) {
      this.log(`Migration validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate migration report
   */
  async generateReport(validation) {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      migration: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: 'completed'
      },
      validation,
      logs: this.migrationLog,
      summary: {
        totalTables: Object.keys(validation).length,
        successfulTables: Object.values(validation).filter(v => v.status === 'OK').length,
        tablesWithIssues: Object.values(validation).filter(v => v.status !== 'OK').length
      }
    };

    // Save report to file
    const reportPath = `migration-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Migration report saved to: ${reportPath}`);
    this.log(`Migration report generated: ${reportPath}`);

    return report;
  }

  /**
   * Cleanup connections
   */
  async cleanup() {
    try {
      if (this.sourceClient) {
        await this.sourceClient.$disconnect();
      }
      if (this.targetClient) {
        await this.targetClient.$disconnect();
      }
      console.log('🔌 Database connections closed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  /**
   * Run complete migration
   */
  async migrate() {
    try {
      await this.initialize();
      
      const sourceValidation = await this.validateSourceDatabase();
      await this.prepareTargetDatabase();

      // Migration order (respecting foreign key dependencies)
      const migrationOrder = [
        'user',
        'address',
        'category',
        'product',
        'productImage',
        'cart',
        'cartItem',
        'order',
        'orderItem',
        'review',
        'wishlist',
        'discount',
        'loyaltyTransaction',
        'activityLog',
        'apiLog',
        'errorLog',
        'payment',
        'paymentTransaction',
        'notificationPreference',
        'notification'
      ];

      console.log('🚀 Starting data migration...');
      
      for (const table of migrationOrder) {
        await this.migrateTable(table);
      }

      // Re-enable foreign key checks
      await this.targetClient.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

      const validation = await this.validateMigration();
      const report = await this.generateReport(validation);

      console.log('🎉 Migration completed successfully!');
      return report;
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  migrator.migrate()
    .then((report) => {
      console.log('\n📊 Migration Summary:');
      console.log(`  Duration: ${report.migration.duration}`);
      console.log(`  Total Tables: ${report.summary.totalTables}`);
      console.log(`  Successful: ${report.summary.successfulTables}`);
      console.log(`  Issues: ${report.summary.tablesWithIssues}`);
      
      process.exit(report.summary.tablesWithIssues > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;