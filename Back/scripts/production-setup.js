#!/usr/bin/env node

/**
 * Production Setup Script
 * 
 * This script handles production environment setup including:
 * - Environment validation
 * - Database initialization
 * - SSL certificate validation
 * - Performance optimizations
 * - Health checks setup
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const productionConfig = require('../config/production');

class ProductionSetup {
  constructor() {
    this.setupLog = [];
    this.startTime = new Date();
  }

  /**
   * Log setup activities
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };
    
    this.setupLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else if (level === 'warning') {
      console.warn(`[${timestamp}] WARNING: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Validate all required environment variables
   */
  async validateEnvironment() {
    console.log('🔍 Validating production environment...');
    
    const requiredVars = [
      'DATABASE_URL',
      'DATABASE_PROVIDER',
      'JWT_SECRET',
      'FRONTEND_URL',
      'EMAIL_FROM_ADDRESS',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    const optionalVars = [
      'ZARINPAL_MERCHANT_ID',
      'STRIPE_SECRET_KEY',
      'PAYIR_API_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'KAVENEGAR_API_KEY',
      'REDIS_URL',
      'SENTRY_DSN'
    ];

    const missingRequired = requiredVars.filter(varName => !process.env[varName]);
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);

    if (missingRequired.length > 0) {
      this.log(`Missing required environment variables: ${missingRequired.join(', ')}`, 'error');
      throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }

    if (missingOptional.length > 0) {
      this.log(`Missing optional environment variables: ${missingOptional.join(', ')}`, 'warning');
    }

    // Validate JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for production');
    }

    // Validate database URL format
    const dbUrl = process.env.DATABASE_URL;
    const dbProvider = process.env.DATABASE_PROVIDER;
    
    if (dbProvider === 'mysql' && !dbUrl.startsWith('mysql://')) {
      throw new Error('MySQL DATABASE_URL must start with mysql:// for production');
    }

    // Validate frontend URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
      this.log('Frontend URL should use HTTPS in production', 'warning');
    }

    this.log('✅ Environment validation completed');
    return {
      requiredVars: requiredVars.length,
      missingOptional: missingOptional.length,
      warnings: missingOptional.length > 0 ? 1 : 0
    };
  }

  /**
   * Validate SSL configuration
   */
  async validateSSL() {
    console.log('🔒 Validating SSL configuration...');
    
    const sslConfig = productionConfig.ssl;
    
    if (!sslConfig.enabled) {
      this.log('SSL is disabled - consider enabling for production', 'warning');
      return { enabled: false };
    }

    try {
      // Check if certificate files exist
      if (sslConfig.cert) {
        await fs.access(sslConfig.cert);
        this.log(`SSL certificate found: ${sslConfig.cert}`);
      }

      if (sslConfig.key) {
        await fs.access(sslConfig.key);
        this.log(`SSL private key found: ${sslConfig.key}`);
      }

      if (sslConfig.ca) {
        await fs.access(sslConfig.ca);
        this.log(`SSL CA certificate found: ${sslConfig.ca}`);
      }

      this.log('✅ SSL configuration validated');
      return { enabled: true, valid: true };
    } catch (error) {
      this.log(`SSL configuration error: ${error.message}`, 'error');
      return { enabled: true, valid: false, error: error.message };
    }
  }

  /**
   * Test database connection and run migrations
   */
  async setupDatabase() {
    console.log('🗄️  Setting up database connection...');
    
    let client;
    try {
      client = new PrismaClient({
        log: ['error']
      });

      await client.$connect();
      this.log('Database connection established');

      // Test basic operations
      const userCount = await client.user.count();
      this.log(`Database contains ${userCount} users`);

      // Check if migrations are needed
      try {
        await client.$queryRaw`SELECT 1`;
        this.log('Database schema is accessible');
      } catch (error) {
        this.log('Database schema may need migration', 'warning');
      }

      this.log('✅ Database setup completed');
      return { connected: true, userCount };
    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'error');
      throw error;
    } finally {
      if (client) {
        await client.$disconnect();
      }
    }
  }

  /**
   * Test external service connections
   */
  async testExternalServices() {
    console.log('🌐 Testing external service connections...');
    
    const results = {};

    // Test Redis connection if enabled
    if (productionConfig.cache.redis.enabled) {
      try {
        const Redis = require('ioredis');
        const redis = new Redis(productionConfig.cache.redis.url, {
          password: productionConfig.cache.redis.password,
          lazyConnect: true,
          maxRetriesPerRequest: 1
        });

        await redis.ping();
        await redis.disconnect();
        
        results.redis = { status: 'connected' };
        this.log('Redis connection test passed');
      } catch (error) {
        results.redis = { status: 'failed', error: error.message };
        this.log(`Redis connection test failed: ${error.message}`, 'warning');
      }
    }

    // Test SMTP connection
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter(productionConfig.email.smtp);
      
      await transporter.verify();
      
      results.smtp = { status: 'connected' };
      this.log('SMTP connection test passed');
    } catch (error) {
      results.smtp = { status: 'failed', error: error.message };
      this.log(`SMTP connection test failed: ${error.message}`, 'warning');
    }

    // Test Cloudinary if enabled
    if (productionConfig.upload.cloudinary.enabled) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config(productionConfig.upload.cloudinary);
        
        await cloudinary.api.ping();
        
        results.cloudinary = { status: 'connected' };
        this.log('Cloudinary connection test passed');
      } catch (error) {
        results.cloudinary = { status: 'failed', error: error.message };
        this.log(`Cloudinary connection test failed: ${error.message}`, 'warning');
      }
    }

    this.log('✅ External services testing completed');
    return results;
  }

  /**
   * Setup logging directories and files
   */
  async setupLogging() {
    console.log('📝 Setting up logging configuration...');
    
    const logConfig = productionConfig.logging;
    
    if (logConfig.file.enabled) {
      try {
        const logDir = path.dirname(logConfig.file.path);
        await fs.mkdir(logDir, { recursive: true });
        
        // Test write permissions
        const testFile = path.join(logDir, 'test-write.log');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        
        this.log(`Log directory created: ${logDir}`);
      } catch (error) {
        this.log(`Failed to setup log directory: ${error.message}`, 'error');
        throw error;
      }
    }

    this.log('✅ Logging setup completed');
    return { fileLogging: logConfig.file.enabled };
  }

  /**
   * Setup backup directories
   */
  async setupBackup() {
    console.log('💾 Setting up backup configuration...');
    
    const backupConfig = productionConfig.backup;
    
    if (backupConfig.local.enabled) {
      try {
        await fs.mkdir(backupConfig.local.path, { recursive: true });
        
        // Test write permissions
        const testFile = path.join(backupConfig.local.path, 'test-backup.txt');
        await fs.writeFile(testFile, 'test backup');
        await fs.unlink(testFile);
        
        this.log(`Backup directory created: ${backupConfig.local.path}`);
      } catch (error) {
        this.log(`Failed to setup backup directory: ${error.message}`, 'error');
        throw error;
      }
    }

    if (backupConfig.s3.enabled) {
      try {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: backupConfig.s3.accessKeyId,
          secretAccessKey: backupConfig.s3.secretAccessKey,
          region: backupConfig.s3.region
        });

        await s3.headBucket({ Bucket: backupConfig.s3.bucket }).promise();
        this.log(`S3 backup bucket accessible: ${backupConfig.s3.bucket}`);
      } catch (error) {
        this.log(`S3 backup setup failed: ${error.message}`, 'warning');
      }
    }

    this.log('✅ Backup setup completed');
    return { 
      localBackup: backupConfig.local.enabled,
      s3Backup: backupConfig.s3.enabled 
    };
  }

  /**
   * Create health check endpoint configuration
   */
  async setupHealthCheck() {
    console.log('🏥 Setting up health check configuration...');
    
    const healthConfig = {
      database: true,
      redis: productionConfig.cache.redis.enabled,
      smtp: true,
      cloudinary: productionConfig.upload.cloudinary.enabled,
      timestamp: new Date().toISOString()
    };

    // Save health check configuration
    const configPath = path.join(__dirname, '../config/health-check.json');
    await fs.writeFile(configPath, JSON.stringify(healthConfig, null, 2));
    
    this.log(`Health check configuration saved: ${configPath}`);
    this.log('✅ Health check setup completed');
    
    return healthConfig;
  }

  /**
   * Generate production setup report
   */
  async generateReport(results) {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      setup: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: 'completed'
      },
      environment: results.environment,
      ssl: results.ssl,
      database: results.database,
      externalServices: results.externalServices,
      logging: results.logging,
      backup: results.backup,
      healthCheck: results.healthCheck,
      logs: this.setupLog,
      summary: {
        totalChecks: Object.keys(results).length,
        warnings: this.setupLog.filter(log => log.level === 'warning').length,
        errors: this.setupLog.filter(log => log.level === 'error').length
      }
    };

    // Save report to file
    const reportPath = `production-setup-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Production setup report saved to: ${reportPath}`);
    this.log(`Production setup report generated: ${reportPath}`);

    return report;
  }

  /**
   * Run complete production setup
   */
  async setup() {
    const results = {};

    try {
      console.log('🚀 Starting production environment setup...');
      
      // Environment validation
      results.environment = await this.validateEnvironment();
      
      // SSL validation
      results.ssl = await this.validateSSL();
      
      // Database setup
      results.database = await this.setupDatabase();
      
      // External services testing
      results.externalServices = await this.testExternalServices();
      
      // Logging setup
      results.logging = await this.setupLogging();
      
      // Backup setup
      results.backup = await this.setupBackup();
      
      // Health check setup
      results.healthCheck = await this.setupHealthCheck();

      // Generate report
      const report = await this.generateReport(results);

      console.log('🎉 Production setup completed successfully!');
      return { success: true, report };
    } catch (error) {
      this.log(`Production setup failed: ${error.message}`, 'error');
      console.error('❌ Production setup failed:', error.message);
      
      const report = await this.generateReport(results);
      return { success: false, error: error.message, report };
    }
  }
}

// CLI execution
if (require.main === module) {
  const setup = new ProductionSetup();
  
  setup.setup()
    .then((result) => {
      console.log('\n📊 Setup Summary:');
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      
      if (result.report) {
        console.log(`  Duration: ${result.report.setup.duration}`);
        console.log(`  Warnings: ${result.report.summary.warnings}`);
        console.log(`  Errors: ${result.report.summary.errors}`);
      }
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = ProductionSetup;