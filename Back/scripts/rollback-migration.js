#!/usr/bin/env node

/**
 * Database Rollback Script
 * 
 * This script provides rollback capabilities for database migrations
 * with backup restoration and data integrity verification.
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class DatabaseRollback {
  constructor() {
    this.client = null;
    this.rollbackLog = [];
    this.startTime = new Date();
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    console.log('🔄 Initializing database connection...');
    
    try {
      this.client = new PrismaClient({
        log: ['error']
      });

      await this.client.$connect();
      console.log('✅ Database connection established');
      this.log('Database connection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connection:', error.message);
      throw error;
    }
  }

  /**
   * Log rollback activities
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };
    
    this.rollbackLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Create database backup before rollback
   */
  async createBackup() {
    console.log('💾 Creating database backup...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = `backups/rollback-${timestamp}`;
      
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      // Export all tables
      const tables = [
        'user', 'address', 'category', 'product', 'productImage',
        'cart', 'cartItem', 'order', 'orderItem', 'review',
        'wishlist', 'discount', 'loyaltyTransaction', 'activityLog',
        'apiLog', 'errorLog', 'payment', 'paymentTransaction',
        'notification', 'notificationPreference'
      ];

      const backup = {};

      for (const table of tables) {
        try {
          const data = await this.client[table].findMany();
          backup[table] = data;
          
          // Save individual table backup
          await fs.writeFile(
            path.join(backupDir, `${table}.json`),
            JSON.stringify(data, null, 2)
          );
          
          this.log(`Backed up table '${table}': ${data.length} records`);
        } catch (error) {
          this.log(`Failed to backup table '${table}': ${error.message}`, 'error');
        }
      }

      // Save complete backup
      await fs.writeFile(
        path.join(backupDir, 'complete-backup.json'),
        JSON.stringify(backup, null, 2)
      );

      // Save backup metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        tables: Object.keys(backup),
        totalRecords: Object.values(backup).reduce((sum, data) => sum + data.length, 0),
        backupPath: backupDir
      };

      await fs.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      console.log(`✅ Backup created: ${backupDir}`);
      this.log(`Database backup created successfully: ${backupDir}`);
      
      return { backupDir, metadata };
    } catch (error) {
      this.log(`Backup creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Clear all data from database
   */
  async clearDatabase() {
    console.log('🗑️  Clearing database...');
    
    try {
      // Disable foreign key checks
      await this.client.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

      // Clear tables in reverse dependency order
      const clearOrder = [
        'notification',
        'notificationPreference',
        'paymentTransaction',
        'payment',
        'errorLog',
        'apiLog',
        'activityLog',
        'loyaltyTransaction',
        'discount',
        'wishlist',
        'review',
        'orderItem',
        'order',
        'cartItem',
        'cart',
        'productImage',
        'product',
        'category',
        'address',
        'user'
      ];

      let totalCleared = 0;

      for (const table of clearOrder) {
        try {
          const result = await this.client[table].deleteMany();
          totalCleared += result.count || 0;
          this.log(`Cleared table '${table}': ${result.count || 0} records`);
        } catch (error) {
          this.log(`Failed to clear table '${table}': ${error.message}`, 'warning');
        }
      }

      // Re-enable foreign key checks
      await this.client.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

      console.log(`✅ Database cleared: ${totalCleared} records removed`);
      this.log(`Database cleared successfully: ${totalCleared} records`);
      
      return totalCleared;
    } catch (error) {
      this.log(`Database clearing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath) {
    console.log(`📥 Restoring from backup: ${backupPath}`);
    
    try {
      // Load backup metadata
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

      console.log(`Restoring backup from: ${metadata.timestamp}`);
      console.log(`Total records to restore: ${metadata.totalRecords}`);

      // Disable foreign key checks
      await this.client.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

      // Restore tables in dependency order
      const restoreOrder = [
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

      let totalRestored = 0;

      for (const table of restoreOrder) {
        try {
          const tablePath = path.join(backupPath, `${table}.json`);
          
          // Check if table backup exists
          try {
            await fs.access(tablePath);
          } catch {
            this.log(`No backup found for table '${table}', skipping`);
            continue;
          }

          const data = JSON.parse(await fs.readFile(tablePath, 'utf8'));
          
          if (data.length === 0) {
            this.log(`Table '${table}': No data to restore`);
            continue;
          }

          // Restore data in batches
          const batchSize = 1000;
          let restored = 0;

          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            try {
              await this.client[table].createMany({
                data: batch,
                skipDuplicates: true
              });
              restored += batch.length;
            } catch (error) {
              // Fallback to individual inserts
              for (const record of batch) {
                try {
                  await this.client[table].create({ data: record });
                  restored++;
                } catch (individualError) {
                  this.log(`Failed to restore record in ${table}: ${individualError.message}`, 'warning');
                }
              }
            }
          }

          totalRestored += restored;
          this.log(`Restored table '${table}': ${restored}/${data.length} records`);
        } catch (error) {
          this.log(`Failed to restore table '${table}': ${error.message}`, 'error');
        }
      }

      // Re-enable foreign key checks
      await this.client.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

      console.log(`✅ Restore completed: ${totalRestored} records restored`);
      this.log(`Database restore completed: ${totalRestored} records`);
      
      return totalRestored;
    } catch (error) {
      this.log(`Restore failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Validate restored data
   */
  async validateRestore(originalMetadata) {
    console.log('🔍 Validating restored data...');
    
    try {
      const validation = {};
      let totalDiscrepancies = 0;

      for (const table of originalMetadata.tables) {
        try {
          const currentCount = await this.client[table].count();
          const originalPath = path.join(originalMetadata.backupPath, `${table}.json`);
          
          let originalCount = 0;
          try {
            const originalData = JSON.parse(await fs.readFile(originalPath, 'utf8'));
            originalCount = originalData.length;
          } catch {
            // Backup file might not exist
          }

          const discrepancy = originalCount - currentCount;
          validation[table] = {
            original: originalCount,
            current: currentCount,
            discrepancy,
            status: discrepancy === 0 ? 'OK' : 'MISMATCH'
          };

          if (discrepancy !== 0) {
            totalDiscrepancies += Math.abs(discrepancy);
            this.log(`Table '${table}': Count mismatch - Original: ${originalCount}, Current: ${currentCount}`, 'warning');
          } else {
            this.log(`Table '${table}': Validation passed - ${currentCount} records`);
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
      this.log(`Validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate rollback report
   */
  async generateReport(validation, metadata) {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      rollback: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: 'completed'
      },
      backup: metadata,
      validation,
      logs: this.rollbackLog,
      summary: {
        totalTables: Object.keys(validation).length,
        successfulTables: Object.values(validation).filter(v => v.status === 'OK').length,
        tablesWithIssues: Object.values(validation).filter(v => v.status !== 'OK').length
      }
    };

    // Save report to file
    const reportPath = `rollback-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Rollback report saved to: ${reportPath}`);
    this.log(`Rollback report generated: ${reportPath}`);

    return report;
  }

  /**
   * Cleanup connections
   */
  async cleanup() {
    try {
      if (this.client) {
        await this.client.$disconnect();
      }
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  /**
   * Run complete rollback
   */
  async rollback(backupPath = null) {
    try {
      await this.initialize();
      
      // Create backup before rollback
      const { backupDir, metadata } = await this.createBackup();
      
      // Clear current database
      await this.clearDatabase();

      // Restore from specified backup or find latest
      if (!backupPath) {
        // Find latest backup
        const backupsDir = 'backups';
        try {
          const backups = await fs.readdir(backupsDir);
          const rollbackBackups = backups
            .filter(name => name.startsWith('rollback-'))
            .sort()
            .reverse();
          
          if (rollbackBackups.length === 0) {
            throw new Error('No rollback backups found');
          }
          
          backupPath = path.join(backupsDir, rollbackBackups[0]);
          console.log(`Using latest backup: ${backupPath}`);
        } catch (error) {
          throw new Error(`Cannot find backup directory or backups: ${error.message}`);
        }
      }

      // Load original metadata
      const originalMetadataPath = path.join(backupPath, 'metadata.json');
      const originalMetadata = JSON.parse(await fs.readFile(originalMetadataPath, 'utf8'));

      // Restore from backup
      await this.restoreFromBackup(backupPath);

      // Validate restoration
      const validation = await this.validateRestore(originalMetadata);
      const report = await this.generateReport(validation, metadata);

      console.log('🎉 Rollback completed successfully!');
      return report;
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      console.error('❌ Rollback failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
if (require.main === module) {
  const backupPath = process.argv[2];
  const rollback = new DatabaseRollback();
  
  rollback.rollback(backupPath)
    .then((report) => {
      console.log('\n📊 Rollback Summary:');
      console.log(`  Duration: ${report.rollback.duration}`);
      console.log(`  Total Tables: ${report.summary.totalTables}`);
      console.log(`  Successful: ${report.summary.successfulTables}`);
      console.log(`  Issues: ${report.summary.tablesWithIssues}`);
      
      process.exit(report.summary.tablesWithIssues > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Rollback failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseRollback;