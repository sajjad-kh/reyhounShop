#!/usr/bin/env node

/**
 * Database Migration Manager
 * 
 * This script provides a comprehensive interface for managing database migrations
 * including validation, migration, rollback, and integrity verification.
 */

const fs = require('fs').promises;
const path = require('path');
const DatabaseMigrator = require('./migrate-to-mysql');
const DatabaseRollback = require('./rollback-migration');
const DataIntegrityVerifier = require('./verify-data-integrity');

class MigrationManager {
  constructor() {
    this.logFile = `migration-manager-${Date.now()}.log`;
  }

  /**
   * Log activities to both console and file
   */
  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
    
    // Console output
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else if (level === 'warning') {
      console.warn(`[${timestamp}] WARNING: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }

    // File output
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    await this.log('🔍 Validating environment configuration...');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'DATABASE_PROVIDER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate database provider
    const provider = process.env.DATABASE_PROVIDER;
    if (!['sqlite', 'mysql'].includes(provider)) {
      throw new Error(`Invalid DATABASE_PROVIDER: ${provider}. Must be 'sqlite' or 'mysql'`);
    }

    // Validate database URL format
    const dbUrl = process.env.DATABASE_URL;
    if (provider === 'mysql' && !dbUrl.startsWith('mysql://')) {
      throw new Error('MySQL DATABASE_URL must start with mysql://');
    }
    if (provider === 'sqlite' && !dbUrl.startsWith('file:')) {
      throw new Error('SQLite DATABASE_URL must start with file:');
    }

    await this.log('✅ Environment configuration validated');
    return true;
  }

  /**
   * Create backup before any migration operation
   */
  async createPreMigrationBackup() {
    await this.log('💾 Creating pre-migration backup...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = `backups/pre-migration-${timestamp}`;
      
      await fs.mkdir(backupDir, { recursive: true });

      // Create backup using rollback utility
      const rollback = new DatabaseRollback();
      await rollback.initialize();
      
      const { metadata } = await rollback.createBackup();
      await rollback.cleanup();

      await this.log(`✅ Pre-migration backup created: ${backupDir}`);
      return backupDir;
    } catch (error) {
      await this.log(`❌ Pre-migration backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Run data integrity verification
   */
  async runIntegrityVerification(phase = 'pre-migration') {
    await this.log(`🔍 Running ${phase} data integrity verification...`);
    
    try {
      const verifier = new DataIntegrityVerifier();
      const report = await verifier.verify();
      
      const totalIssues = report.summary.totalIssues;
      const totalWarnings = report.summary.totalWarnings;
      
      if (totalIssues > 0) {
        await this.log(`⚠️  Data integrity verification found ${totalIssues} issues`, 'warning');
        
        if (phase === 'pre-migration' && totalIssues > 10) {
          throw new Error(`Too many data integrity issues (${totalIssues}) to proceed with migration safely`);
        }
      } else {
        await this.log('✅ Data integrity verification passed');
      }

      if (totalWarnings > 0) {
        await this.log(`ℹ️  Found ${totalWarnings} performance warnings`, 'info');
      }

      return report;
    } catch (error) {
      await this.log(`❌ Data integrity verification failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Execute database migration
   */
  async executeMigration() {
    await this.log('🚀 Executing database migration...');
    
    try {
      const migrator = new DatabaseMigrator();
      const report = await migrator.migrate();
      
      const issueCount = report.summary.tablesWithIssues;
      
      if (issueCount > 0) {
        await this.log(`⚠️  Migration completed with ${issueCount} table issues`, 'warning');
      } else {
        await this.log('✅ Migration completed successfully');
      }

      return report;
    } catch (error) {
      await this.log(`❌ Migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Validate migration results
   */
  async validateMigrationResults(migrationReport) {
    await this.log('🔍 Validating migration results...');
    
    try {
      // Check if all tables were migrated successfully
      const failedTables = Object.entries(migrationReport.validation)
        .filter(([, info]) => info.status !== 'OK')
        .map(([table]) => table);

      if (failedTables.length > 0) {
        await this.log(`❌ Migration validation failed for tables: ${failedTables.join(', ')}`, 'error');
        return false;
      }

      // Run post-migration integrity check
      const integrityReport = await this.runIntegrityVerification('post-migration');
      
      // Check if integrity issues increased significantly
      const criticalIssues = integrityReport.summary.totalIssues;
      if (criticalIssues > 5) {
        await this.log(`❌ Post-migration integrity check found ${criticalIssues} critical issues`, 'error');
        return false;
      }

      await this.log('✅ Migration validation passed');
      return true;
    } catch (error) {
      await this.log(`❌ Migration validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Execute rollback if migration fails
   */
  async executeRollback(backupPath) {
    await this.log(`🔄 Executing rollback to backup: ${backupPath}`);
    
    try {
      const rollback = new DatabaseRollback();
      const report = await rollback.rollback(backupPath);
      
      const issueCount = report.summary.tablesWithIssues;
      
      if (issueCount > 0) {
        await this.log(`⚠️  Rollback completed with ${issueCount} issues`, 'warning');
      } else {
        await this.log('✅ Rollback completed successfully');
      }

      return report;
    } catch (error) {
      await this.log(`❌ Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate comprehensive migration report
   */
  async generateFinalReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      operation: results.operation,
      success: results.success,
      environment: {
        provider: process.env.DATABASE_PROVIDER,
        nodeEnv: process.env.NODE_ENV
      },
      phases: results.phases,
      summary: results.summary,
      recommendations: []
    };

    // Add recommendations based on results
    if (results.preIntegrityReport?.summary.totalWarnings > 0) {
      report.recommendations.push('Consider cleaning up old logs and optimizing large tables');
    }

    if (results.migrationReport?.summary.tablesWithIssues > 0) {
      report.recommendations.push('Review migration logs for table-specific issues');
    }

    if (!results.success) {
      report.recommendations.push('Review error logs and consider manual data cleanup before retry');
    }

    // Save report
    const reportPath = `migration-final-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    await this.log(`📊 Final migration report saved to: ${reportPath}`);
    return report;
  }

  /**
   * Run complete migration process
   */
  async runMigration() {
    const results = {
      operation: 'migration',
      success: false,
      phases: {},
      summary: {}
    };

    try {
      await this.log('🎯 Starting complete migration process...');
      
      // Phase 1: Environment validation
      await this.validateEnvironment();
      results.phases.environmentValidation = { success: true };

      // Phase 2: Pre-migration backup
      const backupPath = await this.createPreMigrationBackup();
      results.phases.preBackup = { success: true, backupPath };

      // Phase 3: Pre-migration integrity check
      const preIntegrityReport = await this.runIntegrityVerification('pre-migration');
      results.phases.preIntegrityCheck = { success: true };
      results.preIntegrityReport = preIntegrityReport;

      // Phase 4: Execute migration
      const migrationReport = await this.executeMigration();
      results.phases.migration = { success: true };
      results.migrationReport = migrationReport;

      // Phase 5: Validate migration results
      const validationSuccess = await this.validateMigrationResults(migrationReport);
      results.phases.validation = { success: validationSuccess };

      if (!validationSuccess) {
        // Phase 6: Rollback if validation failed
        await this.log('❌ Migration validation failed, initiating rollback...', 'error');
        const rollbackReport = await this.executeRollback(backupPath);
        results.phases.rollback = { success: true };
        results.rollbackReport = rollbackReport;
        
        throw new Error('Migration failed validation and was rolled back');
      }

      results.success = true;
      results.summary = {
        totalDuration: migrationReport.migration.duration,
        tablesProcessed: migrationReport.summary.totalTables,
        issuesFound: migrationReport.summary.tablesWithIssues
      };

      await this.log('🎉 Migration process completed successfully!');
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      await this.log(`💥 Migration process failed: ${error.message}`, 'error');
    }

    // Generate final report
    const finalReport = await this.generateFinalReport(results);
    
    return {
      success: results.success,
      report: finalReport,
      logFile: this.logFile
    };
  }

  /**
   * Run rollback process
   */
  async runRollback(backupPath = null) {
    const results = {
      operation: 'rollback',
      success: false,
      phases: {}
    };

    try {
      await this.log('🔄 Starting rollback process...');
      
      // Phase 1: Environment validation
      await this.validateEnvironment();
      results.phases.environmentValidation = { success: true };

      // Phase 2: Pre-rollback backup
      const currentBackupPath = await this.createPreMigrationBackup();
      results.phases.preRollbackBackup = { success: true, backupPath: currentBackupPath };

      // Phase 3: Execute rollback
      const rollbackReport = await this.executeRollback(backupPath);
      results.phases.rollback = { success: true };
      results.rollbackReport = rollbackReport;

      // Phase 4: Post-rollback integrity check
      const postIntegrityReport = await this.runIntegrityVerification('post-rollback');
      results.phases.postIntegrityCheck = { success: true };
      results.postIntegrityReport = postIntegrityReport;

      results.success = true;
      await this.log('🎉 Rollback process completed successfully!');
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      await this.log(`💥 Rollback process failed: ${error.message}`, 'error');
    }

    // Generate final report
    const finalReport = await this.generateFinalReport(results);
    
    return {
      success: results.success,
      report: finalReport,
      logFile: this.logFile
    };
  }

  /**
   * Run integrity verification only
   */
  async runVerification() {
    try {
      await this.log('🔍 Starting data integrity verification...');
      
      await this.validateEnvironment();
      const report = await this.runIntegrityVerification('standalone');
      
      await this.log('✅ Data integrity verification completed');
      return {
        success: true,
        report,
        logFile: this.logFile
      };
    } catch (error) {
      await this.log(`❌ Data integrity verification failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        logFile: this.logFile
      };
    }
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  const backupPath = process.argv[3];
  
  const manager = new MigrationManager();
  
  let operation;
  
  switch (command) {
    case 'migrate':
      operation = manager.runMigration();
      break;
    case 'rollback':
      operation = manager.runRollback(backupPath);
      break;
    case 'verify':
      operation = manager.runVerification();
      break;
    default:
      console.error('Usage: node migration-manager.js <migrate|rollback|verify> [backup-path]');
      console.error('');
      console.error('Commands:');
      console.error('  migrate          - Run complete migration from SQLite to MySQL');
      console.error('  rollback [path]  - Rollback to specified backup (or latest if not specified)');
      console.error('  verify           - Run data integrity verification only');
      console.error('');
      console.error('Examples:');
      console.error('  node migration-manager.js migrate');
      console.error('  node migration-manager.js rollback backups/pre-migration-2025-11-04');
      console.error('  node migration-manager.js verify');
      process.exit(1);
  }
  
  operation
    .then((result) => {
      console.log('\n📊 Operation Summary:');
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      console.log(`  Log file: ${result.logFile}`);
      
      if (result.report) {
        console.log(`  Report file: Available in operation output`);
      }
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Operation failed:', error.message);
      process.exit(1);
    });
}

module.exports = MigrationManager;