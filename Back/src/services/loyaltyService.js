const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LoyaltyService {
  /**
   * Get user's loyalty points balance
   */
  async getUserPoints(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.loyaltyPoints;
  }

  /**
   * Award loyalty points to user
   */
  async awardPoints(userId, points, reason, orderId = null) {
    if (points <= 0) {
      throw new Error('Points must be greater than 0');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update user's loyalty points balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            increment: points
          }
        }
      });

      // Create loyalty transaction record
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          userId,
          points,
          reason,
          orderId
        }
      });

      return {
        user: updatedUser,
        transaction
      };
    });

    return result;
  }

  /**
   * Deduct loyalty points from user (for redemption)
   */
  async deductPoints(userId, points, reason, orderId = null) {
    if (points <= 0) {
      throw new Error('Points must be greater than 0');
    }

    // Check if user has enough points
    const currentPoints = await this.getUserPoints(userId);
    if (currentPoints < points) {
      throw new Error('Insufficient loyalty points');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update user's loyalty points balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            decrement: points
          }
        }
      });

      // Create loyalty transaction record (negative points)
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          userId,
          points: -points,
          reason,
          orderId
        }
      });

      return {
        user: updatedUser,
        transaction
      };
    });

    return result;
  }

  /**
   * Calculate points earned from purchase amount
   */
  calculatePointsFromPurchase(purchaseAmount) {
    // Award 1 point for every 1000 IRR spent
    const pointsPerThousand = 1;
    const points = Math.floor(purchaseAmount / 1000) * pointsPerThousand;
    return points;
  }

  /**
   * Calculate discount amount from points redemption
   */
  calculateDiscountFromPoints(points) {
    // Each point is worth 100 IRR
    const pointValue = 100;
    return points * pointValue;
  }

  /**
   * Get minimum points required for redemption
   */
  getMinimumRedemptionPoints() {
    return 10; // Minimum 10 points (1000 IRR discount)
  }

  /**
   * Validate points redemption
   */
  async validatePointsRedemption(userId, points) {
    if (points < this.getMinimumRedemptionPoints()) {
      return {
        valid: false,
        error: `Minimum ${this.getMinimumRedemptionPoints()} points required for redemption`
      };
    }

    const currentPoints = await this.getUserPoints(userId);
    if (currentPoints < points) {
      return {
        valid: false,
        error: 'Insufficient loyalty points'
      };
    }

    const discountAmount = this.calculateDiscountFromPoints(points);
    return {
      valid: true,
      discountAmount,
      remainingPoints: currentPoints - points
    };
  }

  /**
   * Process points earning from order
   */
  async processOrderPointsEarning(orderId, userId, orderAmount) {
    const pointsEarned = this.calculatePointsFromPurchase(orderAmount);
    
    if (pointsEarned > 0) {
      const result = await this.awardPoints(
        userId,
        pointsEarned,
        'purchase',
        orderId
      );

      return {
        pointsEarned,
        newBalance: result.user.loyaltyPoints,
        transaction: result.transaction
      };
    }

    return {
      pointsEarned: 0,
      newBalance: await this.getUserPoints(userId),
      transaction: null
    };
  }

  /**
   * Process points redemption for discount
   */
  async processPointsRedemption(userId, points, orderId = null) {
    const validation = await this.validatePointsRedemption(userId, points);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const result = await this.deductPoints(
      userId,
      points,
      'discount_redemption',
      orderId
    );

    return {
      pointsRedeemed: points,
      discountAmount: validation.discountAmount,
      newBalance: result.user.loyaltyPoints,
      transaction: result.transaction
    };
  }

  /**
   * Get user's loyalty transaction history
   */
  async getUserTransactions(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null // 'earned' or 'redeemed'
    } = options;

    const skip = (page - 1) * limit;

    const where = { userId };
    
    if (type === 'earned') {
      where.points = { gt: 0 };
    } else if (type === 'redeemed') {
      where.points = { lt: 0 };
    }

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.loyaltyTransaction.count({ where })
    ]);

    return {
      transactions: transactions.map(this.formatTransaction),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get loyalty points statistics for user
   */
  async getUserLoyaltyStats(userId) {
    const [
      currentPoints,
      totalEarned,
      totalRedeemed,
      transactionCount
    ] = await Promise.all([
      this.getUserPoints(userId),
      prisma.loyaltyTransaction.aggregate({
        where: {
          userId,
          points: { gt: 0 }
        },
        _sum: { points: true }
      }),
      prisma.loyaltyTransaction.aggregate({
        where: {
          userId,
          points: { lt: 0 }
        },
        _sum: { points: true }
      }),
      prisma.loyaltyTransaction.count({
        where: { userId }
      })
    ]);

    return {
      currentPoints,
      totalEarned: totalEarned._sum.points || 0,
      totalRedeemed: Math.abs(totalRedeemed._sum.points || 0),
      transactionCount,
      availableDiscount: this.calculateDiscountFromPoints(currentPoints),
      canRedeem: currentPoints >= this.getMinimumRedemptionPoints()
    };
  }

  /**
   * Get system-wide loyalty statistics (admin)
   */
  async getSystemLoyaltyStats() {
    const [
      totalPointsIssued,
      totalPointsRedeemed,
      activeUsers,
      totalTransactions
    ] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: { points: { gt: 0 } },
        _sum: { points: true }
      }),
      prisma.loyaltyTransaction.aggregate({
        where: { points: { lt: 0 } },
        _sum: { points: true }
      }),
      prisma.user.count({
        where: { loyaltyPoints: { gt: 0 } }
      }),
      prisma.loyaltyTransaction.count()
    ]);

    return {
      totalPointsIssued: totalPointsIssued._sum.points || 0,
      totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
      activeUsers,
      totalTransactions,
      pointsInCirculation: (totalPointsIssued._sum.points || 0) + (totalPointsRedeemed._sum.points || 0)
    };
  }

  /**
   * Format transaction for response
   */
  formatTransaction(transaction) {
    return {
      id: transaction.id,
      points: transaction.points,
      reason: transaction.reason,
      orderId: transaction.orderId,
      createdAt: transaction.createdAt,
      type: transaction.points > 0 ? 'earned' : 'redeemed',
      description: this.getTransactionDescription(transaction.reason, transaction.points)
    };
  }

  /**
   * Get human-readable transaction description
   */
  getTransactionDescription(reason, points) {
    const descriptions = {
      'purchase': `Earned ${points} points from purchase`,
      'discount_redemption': `Redeemed ${Math.abs(points)} points for discount`,
      'bonus': `Bonus ${points} points awarded`,
      'refund': points > 0 ? `Refund: ${points} points restored` : `Refund: ${Math.abs(points)} points deducted`,
      'admin_adjustment': points > 0 ? `Admin awarded ${points} points` : `Admin deducted ${Math.abs(points)} points`
    };

    return descriptions[reason] || `${points > 0 ? 'Earned' : 'Redeemed'} ${Math.abs(points)} points`;
  }

  /**
   * Admin function to adjust user points
   */
  async adminAdjustPoints(userId, points, reason, adminId) {
    if (points === 0) {
      throw new Error('Points adjustment cannot be zero');
    }

    const adjustmentReason = `admin_adjustment: ${reason}`;
    
    if (points > 0) {
      return await this.awardPoints(userId, points, adjustmentReason);
    } else {
      return await this.deductPoints(userId, Math.abs(points), adjustmentReason);
    }
  }

  /**
   * Process refund points adjustment
   */
  async processRefundPointsAdjustment(orderId, userId, refundAmount) {
    // Find original points earned from this order
    const originalTransaction = await prisma.loyaltyTransaction.findFirst({
      where: {
        orderId,
        userId,
        reason: 'purchase',
        points: { gt: 0 }
      }
    });

    if (originalTransaction) {
      // Deduct the points that were originally earned
      const result = await this.deductPoints(
        userId,
        originalTransaction.points,
        'refund',
        orderId
      );

      return {
        pointsDeducted: originalTransaction.points,
        newBalance: result.user.loyaltyPoints,
        transaction: result.transaction
      };
    }

    return {
      pointsDeducted: 0,
      newBalance: await this.getUserPoints(userId),
      transaction: null
    };
  }

  /**
   * Get points expiration information
   * Points expire after 365 days from earning
   */
  async getPointsExpirationInfo(userId) {
    const expirationDays = 365;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - expirationDays);

    // Get points that will expire soon (within 30 days)
    const soonToExpireDate = new Date();
    soonToExpireDate.setDate(soonToExpireDate.getDate() - (expirationDays - 30));

    const [expiringTransactions, totalExpiringPoints] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: {
          userId,
          points: { gt: 0 },
          createdAt: {
            gte: expirationDate,
            lte: soonToExpireDate
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.loyaltyTransaction.aggregate({
        where: {
          userId,
          points: { gt: 0 },
          createdAt: {
            gte: expirationDate,
            lte: soonToExpireDate
          }
        },
        _sum: { points: true }
      })
    ]);

    return {
      expiringTransactions: expiringTransactions.map(transaction => ({
        ...this.formatTransaction(transaction),
        expiresAt: new Date(transaction.createdAt.getTime() + (expirationDays * 24 * 60 * 60 * 1000))
      })),
      totalExpiringPoints: totalExpiringPoints._sum.points || 0,
      expirationPolicy: `Points expire ${expirationDays} days after earning`
    };
  }

  /**
   * Process expired points (admin function)
   */
  async processExpiredPoints() {
    const expirationDays = 365;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - expirationDays);

    // Find all expired point transactions
    const expiredTransactions = await prisma.loyaltyTransaction.findMany({
      where: {
        points: { gt: 0 },
        createdAt: { lt: expirationDate }
      },
      include: {
        user: {
          select: { id: true, loyaltyPoints: true }
        }
      }
    });

    const results = [];

    for (const transaction of expiredTransactions) {
      try {
        // Check if these points are still available (not already redeemed)
        const currentPoints = await this.getUserPoints(transaction.userId);
        const pointsToExpire = Math.min(transaction.points, currentPoints);

        if (pointsToExpire > 0) {
          const result = await this.deductPoints(
            transaction.userId,
            pointsToExpire,
            'expiration',
            null
          );

          results.push({
            userId: transaction.userId,
            originalTransactionId: transaction.id,
            pointsExpired: pointsToExpire,
            newBalance: result.user.loyaltyPoints
          });
        }
      } catch (error) {
        console.error(`Error expiring points for user ${transaction.userId}:`, error);
      }
    }

    return {
      processedUsers: results.length,
      totalPointsExpired: results.reduce((sum, result) => sum + result.pointsExpired, 0),
      results
    };
  }

  /**
   * Get detailed transaction analytics
   */
  async getTransactionAnalytics(userId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const where = { userId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      earnedStats,
      redeemedStats,
      monthlyBreakdown
    ] = await Promise.all([
      // Earned points statistics
      prisma.loyaltyTransaction.aggregate({
        where: { ...where, points: { gt: 0 } },
        _sum: { points: true },
        _count: { id: true },
        _avg: { points: true }
      }),
      // Redeemed points statistics
      prisma.loyaltyTransaction.aggregate({
        where: { ...where, points: { lt: 0 } },
        _sum: { points: true },
        _count: { id: true },
        _avg: { points: true }
      }),
      // Monthly breakdown
      prisma.$queryRaw`
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
          SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as redeemed,
          COUNT(*) as transactions
        FROM LoyaltyTransaction 
        WHERE userId = ${userId}
        ${startDate ? `AND createdAt >= '${startDate}'` : ''}
        ${endDate ? `AND createdAt <= '${endDate}'` : ''}
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month DESC
        LIMIT 12
      `
    ]);

    return {
      earned: {
        total: earnedStats._sum.points || 0,
        transactions: earnedStats._count.id || 0,
        average: Math.round(earnedStats._avg.points || 0)
      },
      redeemed: {
        total: Math.abs(redeemedStats._sum.points || 0),
        transactions: redeemedStats._count.id || 0,
        average: Math.round(Math.abs(redeemedStats._avg.points || 0))
      },
      monthlyBreakdown: monthlyBreakdown.map(row => ({
        month: row.month,
        earned: Number(row.earned),
        redeemed: Number(row.redeemed),
        transactions: Number(row.transactions),
        net: Number(row.earned) - Number(row.redeemed)
      }))
    };
  }
}

module.exports = new LoyaltyService();