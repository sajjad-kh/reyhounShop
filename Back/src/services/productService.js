const { getPrismaClient } = require('../utils/database');
const ShippingMethodRepository = require('../repositories/ShippingMethodRepository');

class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData, userId) {
    const { name, description, price, discountPrice, stock, categoryId, lowStockAlert, shippingMethodIds } = productData;

    // Generate slug from name
    const slug = this.generateSlug(name);

    // Check if slug already exists
    const existingProduct = await getPrismaClient().product.findUnique({
      where: { slug }
    });

    if (existingProduct) {
      throw new Error('PRODUCT_SLUG_EXISTS');
    }

    // Verify category exists
    const category = await getPrismaClient().category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    // Create product
    const product = await getPrismaClient().product.create({
      data: {
        name,
        slug,
        description: description || null,
        price,
        discountPrice: discountPrice || null,
        stock,
        categoryId,
        lowStockAlert: lowStockAlert || 5
      },
      include: {
        category: true,
        images: true
      }
    });

    // Log activity
    await this.logActivity(userId, 'product.created', 'Product', product.id, {
      name: product.name,
      price: product.price,
      categoryId: product.categoryId
    });

    return product;
  }

  /**
   * Get products with search, filtering, and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Products and pagination info
   */
  async getProducts(options = {}) {
    const {
      search,
      categoryId,
      categoryIds,
      minPrice,
      maxPrice,
      inStock,
      hasDiscount,
      minRating,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // Max 100 items per page

    // Build where clause
    const where = {
      // Exclude soft deleted products (names starting with [DELETED])
      name: {
        not: {
          startsWith: '[DELETED]'
        }
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { 
          category: { 
            name: { contains: search } 
          } 
        }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      where.categoryId = { in: categoryIds };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock === true) {
      where.stock = { gt: 0 };
    }

    if (hasDiscount === true) {
      where.discountPrice = { not: null };
    }

    // Build orderBy clause
    let orderBy = {};
    
    if (sortBy === 'price') {
      // Sort by effective price (discount price if available, otherwise regular price)
      orderBy = [
        { discountPrice: sortOrder },
        { price: sortOrder }
      ];
    } else if (sortBy === 'rating' || sortBy === 'popularity') {
      // For rating/popularity sort, we'll handle it after getting the data
      // For now, sort by createdAt as fallback
      orderBy = { createdAt: 'desc' };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Get products and total count
    const [products, total] = await Promise.all([
      getPrismaClient().product.findMany({
        where,
        include: {
          category: true,
          images: {
            orderBy: { isMain: 'desc' }
          },
          reviews: {
            where: { isApproved: true },
            select: { rating: true }
          },
          shippingMethods: {
            include: {
              shippingMethod: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      getPrismaClient().product.count({ where })
    ]);

    // Calculate average ratings and filter by rating if needed
    let productsWithRatings = products.map(product => {
      const ratings = product.reviews.map(r => r.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
      
      return {
        ...product,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: ratings.length,
        effectivePrice: product.discountPrice || product.price,
        reviews: undefined // Remove reviews from response
      };
    });

    // Filter by minimum rating if specified
    if (minRating !== undefined) {
      productsWithRatings = productsWithRatings.filter(product => 
        product.averageRating >= minRating
      );
    }

    // Sort by rating if requested
    if (sortBy === 'rating') {
      productsWithRatings.sort((a, b) => {
        return sortOrder === 'desc' 
          ? b.averageRating - a.averageRating
          : a.averageRating - b.averageRating;
      });
    }

    // Sort by popularity (review count, then average rating)
    if (sortBy === 'popularity') {
      productsWithRatings.sort((a, b) => {
        const countDiff = sortOrder === 'desc'
          ? b.reviewCount - a.reviewCount
          : a.reviewCount - b.reviewCount;

        if (countDiff !== 0) {
          return countDiff;
        }

        return sortOrder === 'desc'
          ? b.averageRating - a.averageRating
          : a.averageRating - b.averageRating;
      });
    }

    return {
      products: productsWithRatings,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
        hasNext: skip + take < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Search products with advanced filters
   * @param {Object} searchOptions - Advanced search options
   * @returns {Promise<Object>} Search results
   */
  async searchProducts(searchOptions = {}) {
    const {
      query,
      categories,
      priceRange,
      availability,
      rating,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = searchOptions;

    // Convert to standard getProducts format
    const options = {
      search: query,
      categoryIds: categories,
      minPrice: priceRange?.min,
      maxPrice: priceRange?.max,
      inStock: availability === 'in_stock',
      minRating: rating,
      page,
      limit,
      sortBy: sortBy === 'relevance' ? 'createdAt' : sortBy,
      sortOrder: 'desc'
    };

    return await this.getProducts(options);
  }

  /**
   * Get product suggestions based on search query
   * @param {string} query - Search query
   * @param {number} limit - Number of suggestions
   * @returns {Promise<Array>} Product suggestions
   */
  async getProductSuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    const products = await getPrismaClient().product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ],
        stock: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        images: {
          where: { isMain: true },
          select: { url: true }
        }
      },
      take: limit,
      orderBy: { name: 'asc' }
    });

    return products.map(product => ({
      ...product,
      effectivePrice: product.discountPrice || product.price,
      mainImage: product.images[0]?.url || null
    }));
  }

  /**
   * Get popular products
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Popular products
   */
  async getPopularProducts(limit = 10) {
    // For now, we'll use products with most reviews as "popular"
    // In a real system, this could be based on sales, views, etc.
    const products = await getPrismaClient().product.findMany({
      include: {
        category: true,
        images: {
          where: { isMain: true }
        },
        reviews: {
          where: { isApproved: true },
          select: { rating: true }
        },
        _count: {
          select: { reviews: true }
        }
      },
      orderBy: {
        reviews: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return products.map(product => {
      const ratings = product.reviews.map(r => r.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
      
      return {
        ...product,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: product._count.reviews,
        effectivePrice: product.discountPrice || product.price,
        reviews: undefined,
        _count: undefined
      };
    });
  }

  /**
   * Get product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProductById(productId) {
    const product = await getPrismaClient().product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: {
          orderBy: { isMain: 'desc' }
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        shippingMethods: {
          include: {
            shippingMethod: true
          }
        }
      }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Calculate average rating
    const ratings = product.reviews.map(r => r.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;
    console.log(JSON.stringify(product.reviews[0], null, 2));
    return {
      ...product,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: ratings.length,
      availableStock: product.stock - product.reservedStock
    };
  }

  /**
   * Update product
   * @param {number} productId - Product ID
   * @param {Object} updateData - Update data
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(productId, updateData, userId) {
    const { name, description, price, discountPrice, stock, categoryId, lowStockAlert, shippingMethodIds } = updateData;

    // Check if product exists
    const existingProduct = await getPrismaClient().product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Generate new slug if name is being updated
    let slug = existingProduct.slug;
    if (name && name !== existingProduct.name) {
      slug = this.generateSlug(name);
      
      // Check if new slug already exists
      const slugExists = await getPrismaClient().product.findFirst({
        where: { 
          slug,
          id: { not: productId }
        }
      });

      if (slugExists) {
        throw new Error('PRODUCT_SLUG_EXISTS');
      }
    }

    // Verify category exists if being updated
    if (categoryId && categoryId !== existingProduct.categoryId) {
      const category = await getPrismaClient().category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }

    // Shipping methods are no longer managed through product creation/update

    // Update product
    const product = await getPrismaClient().product.update({
      where: { id: productId },
      data: {
        ...(name && { name, slug }),
        ...(description !== undefined && { description }),
        ...(price && { price }),
        ...(discountPrice !== undefined && { discountPrice }),
        ...(stock !== undefined && { stock }),
        ...(categoryId && { categoryId }),
        ...(lowStockAlert !== undefined && { lowStockAlert })
      },
      include: {
        category: true,
        images: true
      }
    });

    // Log activity
    await this.logActivity(userId, 'product.updated', 'Product', product.id, {
      changes: updateData
    });

    return product;
  }

  /**
   * Soft delete product
   * @param {number} productId - Product ID
   * @param {number} userId - User ID for logging
   * @returns {Promise<boolean>} Success status
   */
  async deleteProduct(productId, userId) {
    // Check if product exists
    const product = await getPrismaClient().product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Check if product has active orders
    const activeOrders = await getPrismaClient().orderItem.findFirst({
      where: {
        productId,
        order: {
          status: {
            in: ['PENDING', 'PROCESSING', 'SHIPPED']
          }
        }
      }
    });

    if (activeOrders) {
      throw new Error('PRODUCT_HAS_ACTIVE_ORDERS');
    }

    // Soft delete by setting stock to 0 and updating name
    await getPrismaClient().product.update({
      where: { id: productId },
      data: {
        stock: 0,
        name: `[DELETED] ${product.name}`,
        slug: `deleted-${product.slug}-${Date.now()}`
      }
    });

    // Log activity
    await this.logActivity(userId, 'product.deleted', 'Product', productId, {
      name: product.name
    });

    return true;
  }

  /**
   * Reserve stock for order
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to reserve
   * @returns {Promise<boolean>} Success status
   */
  async reserveStock(productId, quantity) {
    const product = await getPrismaClient().product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const availableStock = product.stock - product.reservedStock;
    if (availableStock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    await getPrismaClient().product.update({
      where: { id: productId },
      data: {
        reservedStock: product.reservedStock + quantity
      }
    });

    return true;
  }

  /**
   * Release reserved stock
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to release
   * @returns {Promise<boolean>} Success status
   */
  async releaseStock(productId, quantity) {
    const product = await getPrismaClient().product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    await getPrismaClient().product.update({
      where: { id: productId },
      data: {
        reservedStock: Math.max(0, product.reservedStock - quantity)
      }
    });

    return true;
  }

  /**
   * Get low stock products
   * @returns {Promise<Array>} Low stock products
   */
  async getLowStockProducts() {
    return await getPrismaClient().product.findMany({
      where: {
        OR: [
          { stock: { lte: getPrismaClient().product.fields.lowStockAlert } },
          { 
            stock: { 
              lte: { 
                add: [getPrismaClient().product.fields.reservedStock, getPrismaClient().product.fields.lowStockAlert] 
              } 
            } 
          }
        ]
      },
      include: {
        category: true
      },
      orderBy: { stock: 'asc' }
    });
  }

  /**
   * Generate URL-friendly slug from name
   * @param {string} name - Product name
   * @returns {string} Generated slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  /**
   * Log activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  async logActivity(userId, action, entity, entityId, details = {}) {
    try {
      await getPrismaClient().activityLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          details
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
  /**
   * Get all categories
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    try {
      const categories = await getPrismaClient().category.findMany({
        orderBy: { name: 'asc' }
      });
      
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('FAILED_TO_FETCH_CATEGORIES');
    }
  }
}

module.exports = new ProductService();
