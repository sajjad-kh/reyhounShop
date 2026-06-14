const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WishlistService {
  /**
   * Add product to user's wishlist
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Created wishlist item
   */
  async addToWishlist(userId, productId) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        stock: true,
        images: {
          where: { isMain: true },
          select: { url: true }
        }
      }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if product is already in wishlist
    const existingItem = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId
      }
    });

    if (existingItem) {
      throw new Error('Product is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            discountPrice: true,
            stock: true,
            images: {
              where: { isMain: true },
              select: { url: true }
            }
          }
        }
      }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'wishlist.added',
        entity: 'Wishlist',
        entityId: wishlistItem.id,
        details: {
          productId,
          productName: product.name
        }
      }
    });

    return wishlistItem;
  }

  /**
   * Get user's wishlist
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Wishlist items with pagination
   */
  async getUserWishlist(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy = {};
    if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'productName') {
      orderBy = { product: { name: sortOrder } };
    } else if (sortBy === 'price') {
      orderBy = { product: { price: sortOrder } };
    }

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              discountPrice: true,
              stock: true,
              reservedStock: true,
              images: {
                where: { isMain: true },
                select: { url: true }
              },
              reviews: {
                where: { isApproved: true },
                select: { rating: true }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.wishlist.count({ where: { userId } })
    ]);

    // Calculate additional product info
    const itemsWithDetails = items.map(item => {
      const product = item.product;
      const ratings = product.reviews.map(r => r.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      return {
        ...item,
        product: {
          ...product,
          effectivePrice: product.discountPrice || product.price,
          availableStock: product.stock - product.reservedStock,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: ratings.length,
          mainImage: product.images[0]?.url || null,
          reviews: undefined // Remove reviews from response
        }
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: itemsWithDetails,
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
   * Remove product from wishlist
   * @param {number} userId - User ID
   * @param {number} wishlistItemId - Wishlist item ID
   * @returns {Promise<void>}
   */
  async removeFromWishlist(userId, wishlistItemId) {
    // Check if wishlist item exists and belongs to user
    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        id: wishlistItemId,
        userId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!wishlistItem) {
      throw new Error('Wishlist item not found');
    }

    // Remove from wishlist
    await prisma.wishlist.delete({
      where: { id: wishlistItemId }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'wishlist.removed',
        entity: 'Wishlist',
        entityId: wishlistItemId,
        details: {
          productId: wishlistItem.productId,
          productName: wishlistItem.product.name
        }
      }
    });
  }

  /**
   * Move wishlist item to cart
   * @param {number} userId - User ID
   * @param {number} wishlistItemId - Wishlist item ID
   * @param {number} quantity - Quantity to add to cart (default: 1)
   * @returns {Promise<Object>} Cart item and updated wishlist
   */
  async moveToCart(userId, wishlistItemId, quantity = 1) {
    // Check if wishlist item exists and belongs to user
    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        id: wishlistItemId,
        userId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            stock: true,
            reservedStock: true
          }
        }
      }
    });

    if (!wishlistItem) {
      throw new Error('Wishlist item not found');
    }

    const product = wishlistItem.product;
    const availableStock = product.stock - product.reservedStock;

    // Check stock availability
    if (availableStock < quantity) {
      throw new Error(`Only ${availableStock} items available in stock`);
    }

    // Get or create user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if product is already in cart
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Update existing cart item quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              discountPrice: true
            }
          }
        }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              discountPrice: true
            }
          }
        }
      });
    }

    // Remove from wishlist
    await prisma.wishlist.delete({
      where: { id: wishlistItemId }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'wishlist.moved_to_cart',
        entity: 'Wishlist',
        entityId: wishlistItemId,
        details: {
          productId: product.id,
          productName: product.name,
          quantity,
          cartItemId: cartItem.id
        }
      }
    });

    return {
      cartItem,
      message: 'Product moved to cart successfully'
    };
  }

  /**
   * Clear user's entire wishlist
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result with count of removed items
   */
  async clearWishlist(userId) {
    const count = await prisma.wishlist.count({
      where: { userId }
    });

    await prisma.wishlist.deleteMany({
      where: { userId }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'wishlist.cleared',
        entity: 'Wishlist',
        details: {
          removedCount: count
        }
      }
    });

    return {
      removedCount: count,
      message: `Removed ${count} items from wishlist`
    };
  }

  /**
   * Check if product is in user's wishlist
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} Whether product is in wishlist
   */
  async isInWishlist(userId, productId) {
    const item = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId
      }
    });

    return !!item;
  }

  /**
   * Get wishlist statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Wishlist statistics
   */
  async getWishlistStats(userId) {
    const [totalItems, totalValue, availableItems] = await Promise.all([
      prisma.wishlist.count({ where: { userId } }),
      prisma.wishlist.aggregate({
        where: { userId },
        _sum: {
          product: {
            price: true
          }
        }
      }),
      prisma.wishlist.count({
        where: {
          userId,
          product: {
            stock: {
              gt: 0
            }
          }
        }
      })
    ]);

    return {
      totalItems,
      availableItems,
      outOfStockItems: totalItems - availableItems,
      estimatedValue: totalValue._sum?.product?.price || 0
    };
  }
}

module.exports = new WishlistService();