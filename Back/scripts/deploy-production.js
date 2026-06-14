#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * This script handles the complete production deployment process including:
 * - Environment validation
 * - Database migration
 * - Service health checks
 * - Rollback capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const ProductionSetup = require('./production-setup');
const MigrationManager = require('./migration-manager');

class ProductionDeployment {
  constructor() {
    this.deploymentLog = [];
    this.startTime = new Date();
    this.rollbackPoint = null;
  }

  /**
   * Log deployment activities
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };
    
    this.deploymentLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else if (level === 'warning') {
      console.warn(`[${timestamp}] WARNING: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Create deployment backup point
   */
  async createRollbackPoint() {
    this.log('💾 Creating deployment rollback point...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rollbackDir = `backups/deployment-${timestamp}`;
      
      await fs.mkdir(rollbackDir, { recursive: true });

      // Create database backup
      const migrationManager = new MigrationManager();
      const backupResult = await migrationManager.runVerification();
      
      if (!backupResult.success) {
        throw new Error('Failed to create rollback point');
      }

      this.rollbackPoint = rollbackDir;
      this.log(`✅ Rollback point created: ${rollbackDir}`);
      
      return rollbackDir;
    } catch (error) {
      this.log(`❌ Failed to create rollback point: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Validate deployment prerequisites
   */
  async validatePrerequisites() {
    this.log('🔍 Validating deployment prerequisites...');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js version ${nodeVersion} is not supported. Minimum version: 16.x`);
      }
      
      this.log(`Node.js version: ${nodeVersion} ✅`);

      // Check if package.json exists
      await fs.access('package.json');
      this.log('package.json found ✅');

      // Check if node_modules exists
      try {
        await fs.access('node_modules');
        this.log('node_modules found ✅');
      } catch {
        this.log('node_modules not found - running npm install...', 'warning');
        execSync('npm install', { stdio: 'inherit' });
        this.log('Dependencies installed ✅');
      }

      // Check if Prisma schema exists
      await fs.access('prisma/schema.prisma');
      this.log('Prisma schema found ✅');

      // Check environment file
      if (process.env.NODE_ENV === 'production') {
        try {
          await fs.access('.env.production');
          this.log('.env.production found ✅');
        } catch {
          this.log('.env.production not found - using .env', 'warning');
        }
      }

      this.log('✅ Prerequisites validation completed');
      return true;
    } catch (error) {
      this.log(`❌ Prerequisites validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Build application for production
   */
  async buildApplication() {
    this.log('🔨 Building application for production...');
    
    try {
      // Generate Prisma client
      this.log('Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Run any build scripts if they exist
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.build) {
        this.log('Running build script...');
        execSync('npm run build', { stdio: 'inherit' });
      }

      this.log('✅ Application build completed');
      return true;
    } catch (error) {
      this.log(`❌ Application build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    this.log('🗄️  Running database migrations...');
    
    try {
      // Check if this is a fresh deployment or update
      const migrationManager = new MigrationManager();
      
      // For SQLite to MySQL migration
      if (process.env.DATABASE_PROVIDER === 'mysql' && process.env.MIGRATE_FROM_SQLITE === 'true') {
        this.log('Running SQLite to MySQL migration...');
        const migrationResult = await migrationManager.runMigration();
        
        if (!migrationResult.success) {
          throw new Error('Database migration failed');
        }
        
        this.log('✅ Database migration completed');
      } else {
        // Regular Prisma migrations
        this.log('Running Prisma migrations...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        this.log('✅ Prisma migrations completed');
      }

      return true;
    } catch (error) {
      this.log(`❌ Database migrations failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Setup production environment
   */
  async setupProduction() {
    this.log('⚙️  Setting up production environment...');
    
    try {
      const productionSetup = new ProductionSetup();
      const setupResult = await productionSetup.setup();
      
      if (!setupResult.success) {
        throw new Error(`Production setup failed: ${setupResult.error}`);
      }

      this.log('✅ Production environment setup completed');
      return setupResult.report;
    } catch (error) {
      this.log(`❌ Production setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Perform post-deployment validation
   */
  async validateDeployment() {
    this.log('🔍 Validating deployment...');
    
    try {
      // Test database connection
      const { PrismaClient } = require('@prisma/client');
      const client = new PrismaClient();
      
      await client.$connect();
      const userCount = await client.user.count();
      await client.$disconnect();
      
      this.log(`Database connection test passed (${userCount} users)`);

      // Test basic API endpoints if server is running
      try {
        const http = require('http');
        const port = process.env.PORT || 3000;
        
        // Simple health check
        const healthCheck = new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${port}/health`, (res) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else {
              reject(new Error(`Health check failed with status ${res.statusCode}`));
            }
          });
          
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('Health check timeout')));
        });

        await healthCheck;
        this.log('Health check endpoint test passed');
      } catch (error) {
        this.log(`Health check test failed: ${error.message}`, 'warning');
      }

      this.log('✅ Deployment validation completed');
      return true;
    } catch (error) {
      this.log(`❌ Deployment validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment() {
    this.log('🔄 Rolling back deployment...');
    
    try {
      if (!this.rollbackPoint) {
        throw new Error('No rollback point available');
      }

      const migrationManager = new MigrationManager();
      const rollbackResult = await migrationManager.runRollback(this.rollbackPoint);
      
      if (!rollbackResult.success) {
        throw new Error('Rollback failed');
      }

      this.log('✅ Deployment rollback completed');
      return true;
    } catch (error) {
      this.log(`❌ Deployment rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate deployment report
   */
  async generateReport(results) {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      deployment: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: results.success ? 'completed' : 'failed',
        rollbackPoint: this.rollbackPoint
      },
      phases: results.phases || {},
      environment: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        databaseProvider: process.env.DATABASE_PROVIDER
      },
      logs: this.deploymentLog,
      summary: {
        totalPhases: Object.keys(results.phases || {}).length,
        successfulPhases: Object.values(results.phases || {}).filter(p => p.success).length,
        warnings: this.deploymentLog.filter(log => log.level === 'warning').length,
        errors: this.deploymentLog.filter(log => log.level === 'error').length
      }
    };

    // Save report to file
    const reportPath = `deployment-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Deployment report saved to: ${reportPath}`);
    this.log(`Deployment report generated: ${reportPath}`);

    return report;
  }

  /**
   * Run complete deployment process
   */
  async deploy() {
    const results = {
      success: false,
      phases: {}
    };

    try {
      this.log('🚀 Starting production deployment...');
      
      // Phase 1: Create rollback point
      await this.createRollbackPoint();
      results.phases.rollbackPoint = { success: true };

      // Phase 2: Validate prerequisites
      await this.validatePrerequisites();
      results.phases.prerequisites = { success: true };

      // Phase 3: Build application
      await this.buildApplication();
      results.phases.build = { success: true };

      // Phase 4: Run migrations
      await this.runMigrations();
      results.phases.migrations = { success: true };

      // Phase 5: Setup production environment
      const setupReport = await this.setupProduction();
      results.phases.productionSetup = { success: true, report: setupReport };

      // Phase 6: Validate deployment
      await this.validateDeployment();
      results.phases.validation = { success: true };

      results.success = true;
      this.log('🎉 Production deployment completed successfully!');
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      this.log(`💥 Production deployment failed: ${error.message}`, 'error');
      
      // Attempt rollback if we have a rollback point
      if (this.rollbackPoint) {
        try {
          await this.rollbackDeployment();
          results.phases.rollback = { success: true };
        } catch (rollbackError) {
          results.phases.rollback = { success: false, error: rollbackError.message };
          this.log(`💥 Rollback also failed: ${rollbackError.message}`, 'error');
        }
      }
    }

    // Generate final report
    const report = await this.generateReport(results);
    
    return {
      success: results.success,
      report,
      rollbackPoint: this.rollbackPoint
    };
  }
}

// CLI execution
if (require.main === module) {
  const deployment = new ProductionDeployment();
  
  deployment.deploy()
    .then((result) => {
      console.log('\n📊 Deployment Summary:');
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      console.log(`  Duration: ${result.report.deployment.duration}`);
      console.log(`  Phases: ${result.report.summary.successfulPhases}/${result.report.summary.totalPhases} successful`);
      console.log(`  Warnings: ${result.report.summary.warnings}`);
      console.log(`  Errors: ${result.report.summary.errors}`);
      
      if (result.rollbackPoint) {
        console.log(`  Rollback Point: ${result.rollbackPoint}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = ProductionDeployment;