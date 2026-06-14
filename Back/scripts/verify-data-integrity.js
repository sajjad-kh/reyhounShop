#!/usr/bin/env node

/**
 * Data Integrity Verification Script
 * 
 * This script performs comprehensive data integrity checks
 * including referential integrity, data consistency, and business rule validation.
 */

const { PrismaClient } = require('@prisma/client');

class DataIntegrityVerifier {
  constructor() {
    this.client = null;
    this.verificationLog = [];
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
   * Log verification activities
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };
    
    this.verificationLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`);
    } else if (level === 'warning') {
      console.warn(`[${timestamp}] WARNING: ${message}`);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Check referential integrity
   */
  async checkReferentialIntegrity() {
    console.log('🔗 Checking referential integrity...');
    
    const checks = [];

    try {
      // User -> Address relationship
      const orphanedAddresses = await this.client.address.count({
        where: {
          userId: null
        }
      });
      checks.push({
        check: 'User -> Address',
        orphaned: orphanedAddresses,
        status: orphanedAddresses === 0 ? 'OK' : 'ISSUE'
      });

      // Product -> Category relationship
      const orphanedProducts = await this.client.product.count({
        where: {
          categoryId: null
        }
      });
      checks.push({
        check: 'Product -> Category',
        orphaned: orphanedProducts,
        status: orphanedProducts === 0 ? 'OK' : 'ISSUE'
      });

      // Order -> User relationship
      const orphanedOrders = await this.client.order.count({
        where: {
          userId: null
        }
      });
      checks.push({
        check: 'Order -> User',
        orphaned: orphanedOrders,
        status: orphanedOrders === 0 ? 'OK' : 'ISSUE'
      });

      // OrderItem -> Order relationship
      const orphanedOrderItems = await this.client.orderItem.count({
        where: {
          orderId: null
        }
      });
      checks.push({
        check: 'OrderItem -> Order',
        orphaned: orphanedOrderItems,
        status: orphanedOrderItems === 0 ? 'OK' : 'ISSUE'
      });

      // OrderItem -> Product relationship
      const orphanedOrderItemProducts = await this.client.orderItem.count({
        where: {
          productId: null
        }
      });
      checks.push({
        check: 'OrderItem -> Product',
        orphaned: orphanedOrderItemProducts,
        status: orphanedOrderItemProducts === 0 ? 'OK' : 'ISSUE'
      });

      // Cart -> User relationship
      const orphanedCarts = await this.client.cart.count({
        where: {
          userId: null
        }
      });
      checks.push({
        check: 'Cart -> User',
        orphaned: orphanedCarts,
        status: orphanedCarts === 0 ? 'OK' : 'ISSUE'
      });

      // CartItem -> Cart relationship
      const orphanedCartItems = await this.client.cartItem.count({
        where: {
          cartId: null
        }
      });
      checks.push({
        check: 'CartItem -> Cart',
        orphaned: orphanedCartItems,
        status: orphanedCartItems === 0 ? 'OK' : 'ISSUE'
      });

      // Review -> User and Product relationships
      const orphanedReviews = await this.client.review.count({
        where: {
          OR: [
            { user: null },
            { product: null }
          ]
        }
      });
      checks.push({
        check: 'Review -> User/Product',
        orphaned: orphanedReviews,
        status: orphanedReviews === 0 ? 'OK' : 'ISSUE'
      });

      // Payment -> Order relationship
      const orphanedPayments = await this.client.payment.count({
        where: {
          order: null
        }
      });
      checks.push({
        check: 'Payment -> Order',
        orphaned: orphanedPayments,
        status: orphanedPayments === 0 ? 'OK' : 'ISSUE'
      });

      const issueCount = checks.filter(c => c.status === 'ISSUE').length;
      
      for (const check of checks) {
        if (check.status === 'OK') {
          this.log(`${check.check}: OK`);
        } else {
          this.log(`${check.check}: ${check.orphaned} orphaned records`, 'warning');
        }
      }

      console.log(`✅ Referential integrity check completed: ${issueCount} issues found`);
      return checks;
    } catch (error) {
      this.log(`Referential integrity check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check data consistency
   */
  async checkDataConsistency() {
    console.log('📊 Checking data consistency...');
    
    const checks = [];

    try {
      // Check for duplicate emails
      const duplicateEmails = await this.client.$queryRaw`
        SELECT email, COUNT(*) as count 
        FROM User 
        WHERE email IS NOT NULL 
        GROUP BY email 
        HAVING COUNT(*) > 1
      `;
      checks.push({
        check: 'Duplicate user emails',
        issues: duplicateEmails.length,
        status: duplicateEmails.length === 0 ? 'OK' : 'ISSUE',
        details: duplicateEmails
      });

      // Check for duplicate product slugs
      const duplicateSlugs = await this.client.$queryRaw`
        SELECT slug, COUNT(*) as count 
        FROM Product 
        WHERE slug IS NOT NULL 
        GROUP BY slug 
        HAVING COUNT(*) > 1
      `;
      checks.push({
        check: 'Duplicate product slugs',
        issues: duplicateSlugs.length,
        status: duplicateSlugs.length === 0 ? 'OK' : 'ISSUE',
        details: duplicateSlugs
      });

      // Check for negative stock values
      const negativeStock = await this.client.product.count({
        where: {
          stock: {
            lt: 0
          }
        }
      });
      checks.push({
        check: 'Negative stock values',
        issues: negativeStock,
        status: negativeStock === 0 ? 'OK' : 'ISSUE'
      });

      // Check for invalid price values
      const invalidPrices = await this.client.product.count({
        where: {
          OR: [
            { price: { lte: 0 } },
            { discountPrice: { lt: 0 } }
          ]
        }
      });
      checks.push({
        check: 'Invalid price values',
        issues: invalidPrices,
        status: invalidPrices === 0 ? 'OK' : 'ISSUE'
      });

      // Check for orders with zero total
      const zeroTotalOrders = await this.client.order.count({
        where: {
          totalPrice: {
            lte: 0
          }
        }
      });
      checks.push({
        check: 'Orders with zero/negative total',
        issues: zeroTotalOrders,
        status: zeroTotalOrders === 0 ? 'OK' : 'ISSUE'
      });

      // Check for cart items with zero quantity
      const zeroQuantityCartItems = await this.client.cartItem.count({
        where: {
          quantity: {
            lte: 0
          }
        }
      });
      checks.push({
        check: 'Cart items with zero/negative quantity',
        issues: zeroQuantityCartItems,
        status: zeroQuantityCartItems === 0 ? 'OK' : 'ISSUE'
      });

      // Check for order items with zero quantity
      const zeroQuantityOrderItems = await this.client.orderItem.count({
        where: {
          quantity: {
            lte: 0
          }
        }
      });
      checks.push({
        check: 'Order items with zero/negative quantity',
        issues: zeroQuantityOrderItems,
        status: zeroQuantityOrderItems === 0 ? 'OK' : 'ISSUE'
      });

      const issueCount = checks.filter(c => c.status === 'ISSUE').length;
      
      for (const check of checks) {
        if (check.status === 'OK') {
          this.log(`${check.check}: OK`);
        } else {
          this.log(`${check.check}: ${check.issues} issues found`, 'warning');
        }
      }

      console.log(`✅ Data consistency check completed: ${issueCount} issues found`);
      return checks;
    } catch (error) {
      this.log(`Data consistency check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check business rule compliance
   */
  async checkBusinessRules() {
    console.log('📋 Checking business rule compliance...');
    
    const checks = [];

    try {
      // Check for discount prices higher than regular prices
      const invalidDiscountPrices = await this.client.product.count({
        where: {
          AND: [
            { discountPrice: { not: null } },
            { 
              discountPrice: {
                gte: this.client.product.fields.price
              }
            }
          ]
        }
      });
      checks.push({
        check: 'Discount prices higher than regular prices',
        issues: invalidDiscountPrices,
        status: invalidDiscountPrices === 0 ? 'OK' : 'ISSUE'
      });

      // Check for reviews with invalid ratings
      const invalidRatings = await this.client.review.count({
        where: {
          OR: [
            { rating: { lt: 1 } },
            { rating: { gt: 5 } }
          ]
        }
      });
      checks.push({
        check: 'Reviews with invalid ratings (not 1-5)',
        issues: invalidRatings,
        status: invalidRatings === 0 ? 'OK' : 'ISSUE'
      });

      // Check for expired discounts still marked as active
      const expiredActiveDiscounts = await this.client.discount.count({
        where: {
          AND: [
            { isActive: true },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });
      checks.push({
        check: 'Expired discounts still marked as active',
        issues: expiredActiveDiscounts,
        status: expiredActiveDiscounts === 0 ? 'OK' : 'ISSUE'
      });

      // Check for orders with mismatched payment status
      const mismatchedPaymentStatus = await this.client.order.count({
        where: {
          AND: [
            { status: 'DELIVERED' },
            { paymentStatus: { not: 'SUCCESS' } }
          ]
        }
      });
      checks.push({
        check: 'Delivered orders without successful payment',
        issues: mismatchedPaymentStatus,
        status: mismatchedPaymentStatus === 0 ? 'OK' : 'ISSUE'
      });

      // Check for users with negative loyalty points
      const negativeLoyaltyPoints = await this.client.user.count({
        where: {
          loyaltyPoints: {
            lt: 0
          }
        }
      });
      checks.push({
        check: 'Users with negative loyalty points',
        issues: negativeLoyaltyPoints,
        status: negativeLoyaltyPoints === 0 ? 'OK' : 'ISSUE'
      });

      const issueCount = checks.filter(c => c.status === 'ISSUE').length;
      
      for (const check of checks) {
        if (check.status === 'OK') {
          this.log(`${check.check}: OK`);
        } else {
          this.log(`${check.check}: ${check.issues} issues found`, 'warning');
        }
      }

      console.log(`✅ Business rule compliance check completed: ${issueCount} issues found`);
      return checks;
    } catch (error) {
      this.log(`Business rule compliance check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check database performance indicators
   */
  async checkPerformanceIndicators() {
    console.log('⚡ Checking performance indicators...');
    
    const indicators = [];

    try {
      // Check table sizes
      const tables = [
        'user', 'product', 'order', 'orderItem', 'review',
        'activityLog', 'apiLog', 'errorLog'
      ];

      for (const table of tables) {
        try {
          const count = await this.client[table].count();
          indicators.push({
            metric: `${table} table size`,
            value: count,
            status: count < 100000 ? 'OK' : 'LARGE'
          });
          
          if (count >= 100000) {
            this.log(`Large table detected: ${table} has ${count} records`, 'warning');
          }
        } catch (error) {
          indicators.push({
            metric: `${table} table size`,
            status: 'ERROR',
            error: error.message
          });
        }
      }

      // Check for potential performance issues
      const largeCartItems = await this.client.cart.count({
        where: {
          items: {
            some: {}
          }
        }
      });
      
      const avgCartSize = largeCartItems > 0 ? 
        await this.client.cartItem.count() / largeCartItems : 0;
      
      indicators.push({
        metric: 'Average cart size',
        value: Math.round(avgCartSize * 100) / 100,
        status: avgCartSize > 50 ? 'LARGE' : 'OK'
      });

      // Check for old logs that might need cleanup
      const oldLogs = await this.client.apiLog.count({
        where: {
          timestamp: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      });
      
      indicators.push({
        metric: 'Old API logs (>30 days)',
        value: oldLogs,
        status: oldLogs > 10000 ? 'CLEANUP_NEEDED' : 'OK'
      });

      const warningCount = indicators.filter(i => 
        i.status === 'LARGE' || i.status === 'CLEANUP_NEEDED'
      ).length;
      
      for (const indicator of indicators) {
        if (indicator.status === 'OK') {
          this.log(`${indicator.metric}: ${indicator.value || 'OK'}`);
        } else if (indicator.status === 'ERROR') {
          this.log(`${indicator.metric}: ERROR - ${indicator.error}`, 'error');
        } else {
          this.log(`${indicator.metric}: ${indicator.value} (${indicator.status})`, 'warning');
        }
      }

      console.log(`✅ Performance indicators check completed: ${warningCount} warnings`);
      return indicators;
    } catch (error) {
      this.log(`Performance indicators check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate comprehensive verification report
   */
  async generateReport(referentialChecks, consistencyChecks, businessRuleChecks, performanceIndicators) {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      verification: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: 'completed'
      },
      referentialIntegrity: {
        checks: referentialChecks,
        totalChecks: referentialChecks.length,
        issuesFound: referentialChecks.filter(c => c.status === 'ISSUE').length
      },
      dataConsistency: {
        checks: consistencyChecks,
        totalChecks: consistencyChecks.length,
        issuesFound: consistencyChecks.filter(c => c.status === 'ISSUE').length
      },
      businessRules: {
        checks: businessRuleChecks,
        totalChecks: businessRuleChecks.length,
        issuesFound: businessRuleChecks.filter(c => c.status === 'ISSUE').length
      },
      performance: {
        indicators: performanceIndicators,
        totalIndicators: performanceIndicators.length,
        warningsFound: performanceIndicators.filter(i => 
          i.status === 'LARGE' || i.status === 'CLEANUP_NEEDED'
        ).length
      },
      logs: this.verificationLog,
      summary: {
        totalIssues: 
          referentialChecks.filter(c => c.status === 'ISSUE').length +
          consistencyChecks.filter(c => c.status === 'ISSUE').length +
          businessRuleChecks.filter(c => c.status === 'ISSUE').length,
        totalWarnings: performanceIndicators.filter(i => 
          i.status === 'LARGE' || i.status === 'CLEANUP_NEEDED'
        ).length,
        overallStatus: 'completed'
      }
    };

    // Save report to file
    const reportPath = `data-integrity-report-${Date.now()}.json`;
    await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Data integrity report saved to: ${reportPath}`);
    this.log(`Data integrity report generated: ${reportPath}`);

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
   * Run complete data integrity verification
   */
  async verify() {
    try {
      await this.initialize();
      
      console.log('🔍 Starting comprehensive data integrity verification...');
      
      const referentialChecks = await this.checkReferentialIntegrity();
      const consistencyChecks = await this.checkDataConsistency();
      const businessRuleChecks = await this.checkBusinessRules();
      const performanceIndicators = await this.checkPerformanceIndicators();

      const report = await this.generateReport(
        referentialChecks, 
        consistencyChecks, 
        businessRuleChecks, 
        performanceIndicators
      );

      console.log('🎉 Data integrity verification completed!');
      return report;
    } catch (error) {
      this.log(`Verification failed: ${error.message}`, 'error');
      console.error('❌ Verification failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
if (require.main === module) {
  const verifier = new DataIntegrityVerifier();
  
  verifier.verify()
    .then((report) => {
      console.log('\n📊 Verification Summary:');
      console.log(`  Duration: ${report.verification.duration}`);
      console.log(`  Total Issues: ${report.summary.totalIssues}`);
      console.log(`  Total Warnings: ${report.summary.totalWarnings}`);
      console.log(`  Referential Integrity: ${report.referentialIntegrity.issuesFound}/${report.referentialIntegrity.totalChecks} issues`);
      console.log(`  Data Consistency: ${report.dataConsistency.issuesFound}/${report.dataConsistency.totalChecks} issues`);
      console.log(`  Business Rules: ${report.businessRules.issuesFound}/${report.businessRules.totalChecks} issues`);
      console.log(`  Performance Warnings: ${report.performance.warningsFound}/${report.performance.totalIndicators} warnings`);
      
      process.exit(report.summary.totalIssues > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = DataIntegrityVerifier;