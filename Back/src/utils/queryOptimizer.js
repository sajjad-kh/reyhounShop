/**
 * Query Optimization Utilities
 * Provides optimized query patterns and performance monitoring
 */

const { getPrismaClient } = require('./database');

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Optimized product search with pagination
   */
  async searchProducts(filters = {}, pagination = {}) {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      inStock = true
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination;

    const skip = (page - 1) * limit;
    const prisma = getPrismaClient();

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(categoryId && { categoryId }),
      ...(minPrice && { price: { gte: minPrice } }),
      ...(maxPrice && { price: { lte: maxPrice } }),
      ...(inStock && { stock: { gt: 0 } })
    };

    // Optimized query with selective includes
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true }
          },
          images: {
            where: { isMain: true },
            select: { id: true, url: true, isMain: true }
          },
          _count: {
            select: { reviews: { where: { isApproved: true } } }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Optimized user orders with minimal data
   */
  async getUserOrders(userId, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      status
    } = pagination;

    const skip = (page - 1) * limit;
    const prisma = getPrismaClient();

    const where = {
      userId,
      ...(status && { status })
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          paymentStatus: true,
          trackingCode: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  images: {
                    where: { isMain: true },
                    select: { url: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Optimized product details with aggregated data
   */
  async getProductDetails(productId) {
    const cacheKey = `product_${productId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const prisma = getPrismaClient();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: { id: true, name: true }
        },
        images: {
          orderBy: [
            { isMain: 'desc' },
            { id: 'asc' }
          ]
        },
        reviews: {
          where: { isApproved: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            reviews: { where: { isApproved: true } }
          }
        }
      }
    });

    if (!product) {
      return null;
    }

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: {
        productId,
        isApproved: true
      },
      _avg: {
        rating: true
      }
    });

    const result = {
      ...product,
      averageRating: avgRating._avg.rating || 0,
      reviewCount: product._count.reviews
    };

    // Cache for 5 minutes
    this.setCache(cacheKey, result);
    
    return result;
  }

  /**
   * Optimized dashboard statistics
   */
  async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const prisma = getPrismaClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      todayOrders,
      monthlyRevenue,
      pendingOrders,
      lowStockProducts
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER', isActive: true } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({
        where: {
          createdAt: { gte: startOfDay }
        }
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          paymentStatus: 'SUCCESS'
        },
        _sum: { totalPrice: true }
      }),
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      prisma.product.count({
        where: {
          stock: { lte: prisma.product.fields.lowStockAlert }
        }
      })
    ]);

    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      todayOrders,
      monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
      pendingOrders,
      lowStockProducts,
      timestamp: new Date().toISOString()
    };

    // Cache for 2 minutes
    this.setCache(cacheKey, stats, 2 * 60 * 1000);
    
    return stats;
  }

  /**
   * Batch operations for better performance
   */
  async batchUpdateStock(updates) {
    const prisma = getPrismaClient();
    
    // Use transaction for consistency
    return await prisma.$transaction(
      updates.map(({ productId, quantity }) =>
        prisma.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } }
        })
      )
    );
  }

  /**
   * Cache management
   */
  setCache(key, value, timeout = this.cacheTimeout) {
    this.queryCache.set(key, {
      value,
      expires: Date.now() + timeout
    });
  }

  getFromCache(key) {
    const cached = this.queryCache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.value;
  }

  clearCache() {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys())
    };
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

module.exports = {
  QueryOptimizer,
  queryOptimizer
};