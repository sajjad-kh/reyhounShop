const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ReviewService {
  /**
   * Submit a product review
   * @param {number} productId - Product ID
   * @param {number} userId - User ID
   * @param {Object} reviewData - Review data (rating, comment)
   * @returns {Promise<Object>} Created review
   */

  async createReview (productId, userId, reviewData) {
    const { rating, comment, orderId } = reviewData;

    if (!orderId) {
      throw new Error('ORDER_ID_REQUIRED');
    }

    if (rating <= 3 && (!comment || !comment.trim())) {
      throw new Error('COMMENT_REQUIRED');
    }

    const isCommentEmpty = !comment || !comment.trim();

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const deliveredOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId,
        orderId: Number(orderId),
        order: {
          userId,
          status: 'DELIVERED'
        }
      }
    });

    if (!deliveredOrderItem) {
      throw new Error('You can only review purchased products');
    }

    const existingReview = await prisma.review.findFirst({
      where: { productId, userId, orderId: Number(orderId) }
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product for this order');
    }

    return prisma.review.create({
      data: {
        product: { connect: { id: productId } },
        user: { connect: { id: userId } },
        order: { connect: { id: Number(orderId) } },
        rating,
        comment,
        isApproved: isCommentEmpty
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
  }


  async hasUserReviewed(productId, userId, orderId = null) {
    const where = { productId, userId };
    if (orderId) {
      where.orderId = Number(orderId);
    }

    const review = await prisma.review.findFirst({ where });
    return !!review;
  }

  async canReviewProduct(productId, userId, orderId) {
    if (!orderId) {
      return {
        canReview: false,
        reason: 'ORDER_ID_REQUIRED'
      };
    }

    const orderItem = await prisma.orderItem.findFirst({
      where: {
        productId,
        orderId: Number(orderId),
        order: {
          userId,
          status: 'DELIVERED'
        }
      }
    });

    if (!orderItem) {
      return {
        canReview: false,
        reason: 'ORDER_NOT_DELIVERED'
      };
    }

    const review = await prisma.review.findFirst({
      where: {
        productId,
        userId,
        orderId: Number(orderId)
      }
    });

    if (review) {
      return {
        canReview: false,
        reason: 'ALREADY_REVIEWED'
      };
    }

    return {
      canReview: true
    };
  }

  async getUserReview(productId, userId, orderId = null) {
    const where = { productId, userId };
    if (orderId) {
      where.orderId = Number(orderId);
    }

    return prisma.review.findFirst({ where });
  }

  async getReviewedProductIdsForOrder(orderId, userId) {
    const reviews = await prisma.review.findMany({
      where: {
        orderId: Number(orderId),
        userId: Number(userId)
      },
      select: { productId: true }
    });

    return reviews.map(r => r.productId);
  }

  /**
   * Get reviews for a product
   * @param {number} productId - Product ID
   * @param {Object} options - Query options (page, limit, approved, rating, sortBy, sortOrder)
   * @returns {Promise<Object>} Reviews with pagination
   */
  async getProductReviews(productId, options = {}) {
    const {
      page = 1,
      limit = 10,
      approved = true,
      rating = null, // Filter by specific rating (1-5)
      minRating = null, // Filter by minimum rating
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      productId
    };

    if (approved !== undefined) {
      where.isApproved = approved;
    }

    // Add rating filters
    if (rating !== null) {
      where.rating = rating;
    } else if (minRating !== null) {
      where.rating = {
        gte: minRating
      };
    }

    // Build orderBy clause
    const orderBy = {};
    if (sortBy === 'helpful') {
      // For now, sort by creation date as we don't have helpful votes
      // In a real system, you might have a helpful votes system
      orderBy.createdAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.review.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Approve or reject a review (admin only)
   * @param {number} reviewId - Review ID
   * @param {boolean} isApproved - Approval status
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} Updated review
   */


  async moderateReview(reviewId, isApproved, adminUserId) {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Update review approval status
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        isApproved,
        approvedAt: new Date(),
        approvedBy: adminUserId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Log the moderation activity
    await prisma.activityLog.create({
      data: {
        userId: adminUserId,
        action: isApproved ? 'review.approved' : 'review.rejected',
        entity: 'Review',
        entityId: reviewId,
        details: {
          reviewId,
          productId: review.productId,
          reviewUserId: review.userId,
          isApproved
        }
      }
    });

    return updatedReview;
  }

  /**
   * Get pending reviews for admin moderation
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Pending reviews with pagination
   */
  async getPendingReviews(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { isApproved: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: {
                  isMain: true
                },
                take: 1
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.review.count({ where: { isApproved: false } })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getAllReviews(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          product: {
            include: {
              images: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.review.count()
    ]);

    return {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Calculate product rating statistics
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Rating statistics
   */
  async getProductRatingStats(productId) {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true
      },
      select: {
        rating: true,
        createdAt: true
      }
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          1: { count: 0, percentage: 0 },
          2: { count: 0, percentage: 0 },
          3: { count: 0, percentage: 0 },
          4: { count: 0, percentage: 0 },
          5: { count: 0, percentage: 0 }
        },
        recentReviews: 0,
        qualityScore: 0
      };
    }

    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    // Calculate rating distribution with percentages
    const ratingDistribution = {
      1: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      3: { count: 0, percentage: 0 },
      4: { count: 0, percentage: 0 },
      5: { count: 0, percentage: 0 }
    };

    ratings.forEach(rating => {
      ratingDistribution[rating].count++;
    });

    // Calculate percentages
    Object.keys(ratingDistribution).forEach(rating => {
      const count = ratingDistribution[rating].count;
      ratingDistribution[rating].percentage = Math.round((count / reviews.length) * 100);
    });

    // Calculate recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReviews = reviews.filter(review => review.createdAt >= thirtyDaysAgo).length;

    // Calculate quality score (weighted average considering recency and distribution)
    const qualityScore = this.calculateQualityScore(ratings, reviews.length, recentReviews);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution,
      recentReviews,
      qualityScore: Math.round(qualityScore * 10) / 10
    };
  }

  /**
   * Calculate quality score for product ratings
   * @param {Array} ratings - Array of ratings
   * @param {number} totalReviews - Total number of reviews
   * @param {number} recentReviews - Number of recent reviews
   * @returns {number} Quality score (0-5)
   */
  calculateQualityScore(ratings, totalReviews, recentReviews) {
    if (totalReviews === 0) return 0;

    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    // Base score is the average rating
    let qualityScore = averageRating;
    
    // Adjust for number of reviews (more reviews = more reliable)
    const reviewCountFactor = Math.min(totalReviews / 50, 1); // Cap at 50 reviews for full weight
    qualityScore = qualityScore * (0.7 + 0.3 * reviewCountFactor);
    
    // Adjust for recent activity (recent reviews indicate current relevance)
    const recentActivityFactor = Math.min(recentReviews / 10, 1); // Cap at 10 recent reviews
    qualityScore = qualityScore * (0.9 + 0.1 * recentActivityFactor);
    
    return Math.min(qualityScore, 5); // Cap at 5
  }

  /**
   * Get review summary by rating for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Review summary by rating
   */
  async getReviewSummaryByRating(productId) {
    const summaryData = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        isApproved: true
      },
      _count: {
        rating: true
      },
      orderBy: {
        rating: 'desc'
      }
    });

    const totalReviews = summaryData.reduce((sum, item) => sum + item._count.rating, 0);

    const summary = summaryData.map(item => ({
      rating: item.rating,
      count: item._count.rating,
      percentage: totalReviews > 0 ? Math.round((item._count.rating / totalReviews) * 100) : 0
    }));

    // Ensure all ratings (1-5) are represented
    const fullSummary = [];
    for (let rating = 5; rating >= 1; rating--) {
      const existing = summary.find(s => s.rating === rating);
      fullSummary.push(existing || { rating, count: 0, percentage: 0 });
    }

    return {
      summary: fullSummary,
      totalReviews
    };
  }

  /**
   * Get featured reviews for a product (highest rated with comments)
   * @param {number} productId - Product ID
   * @param {number} limit - Number of featured reviews to return
   * @returns {Promise<Array>} Featured reviews
   */
  async getFeaturedReviews(productId, limit = 3) {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
        comment: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return reviews;
  }

  /**
   * Delete a review
   * @param {number} reviewId - Review ID
   * @param {number} userId - User ID (must be review owner or admin)
   * @param {boolean} isAdmin - Whether user is admin
   * @returns {Promise<void>}
   */
  async deleteReview(reviewId, userId, isAdmin = false) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Check permissions
    if (!isAdmin && review.userId !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Log the deletion
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'review.deleted',
        entity: 'Review',
        entityId: reviewId,
        details: {
          reviewId,
          productId: review.productId,
          deletedBy: isAdmin ? 'admin' : 'user'
        }
      }
    });
  }

  async getReviewStatistics() {
    const [
      totalReviews,
      approvedReviews,
      pendingReviews,
      avgRating
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({
        where: { isApproved: true }
      }),
      prisma.review.count({
        where: { isApproved: false }
      }),
      prisma.review.aggregate({
        _avg: {
          rating: true
        }
      })
    ]);

    return {
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: avgRating._avg.rating || 0
    };
  }


  async getReviewById(reviewId) {
    return prisma.review.findUnique({
      where: {
        id: reviewId
      },
      include: {
        product: {
          include: {
            images: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async bulkModerateReviews(
    reviewIds,
    isApproved,
    adminUserId
  ) {
    return prisma.review.updateMany({
      where: {
        id: {
          in: reviewIds
        }
      },
      data: {
        isApproved,
        approvedAt: new Date(),
        approvedBy: adminUserId
      }
    });
  }

  async bulkDeleteReviews(
    reviewIds,
    adminUserId
  ) {
    await prisma.activityLog.create({
      data: {
        userId: adminUserId,
        action: 'review.bulkDeleted',
        entity: 'Review',
        details: {
          reviewIds
        }
      }
    });

    return prisma.review.deleteMany({
      where: {
        id: {
          in: reviewIds
        }
      }
    });
  }

  async getReportedReviews() {
    return {
      reviews: [],
      total: 0
    };
  }

}

module.exports = new ReviewService();