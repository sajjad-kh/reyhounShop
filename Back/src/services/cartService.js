const { getPrismaClient } = require('../utils/database');

class CartService {
  /**
   * Get or create cart for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Cart with items
   */
  async getOrCreateCart(userId) {
    let cart = await getPrismaClient().cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    isMain: 'desc'
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await getPrismaClient().cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: {
                      isMain: 'desc'
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    return this.formatCartResponse(cart);
  }

  /**
   * Add item to cart
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Updated cart
   */
  async addToCart(userId, productId, quantity) {
    // Validate product exists and has sufficient stock
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

    // Get or create cart
    let cart = await getPrismaClient().cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await getPrismaClient().cart.create({
        data: { userId }
      });
    }

    // Check if item already exists in cart
    const existingItem = await getPrismaClient().cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId
      }
    });

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      
      // Check if new total quantity exceeds available stock
      if (availableStock < newQuantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      await getPrismaClient().cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Create new cart item
      await getPrismaClient().cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      });
    }

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'CartItem',
      entityId: productId,
      metadata: {
        productId,
        quantity,
        productName: product.name,
        event: 'item_added'
      }
    });

    return await this.getCartSummary(userId);
  }

  /**
   * Update cart item quantity
   * @param {number} userId - User ID
   * @param {number} cartItemId - Cart item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart
   */
  async updateCartItem(userId, cartItemId, quantity) {
    // Find cart item and verify ownership
    const cartItem = await getPrismaClient().cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId }
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
      throw new Error('CART_ITEM_NOT_FOUND');
    }

    if (quantity <= 0) {
      throw new Error('INVALID_QUANTITY');
    }

    // Check stock availability
    const availableStock = cartItem.product.stock - cartItem.product.reservedStock;
    if (availableStock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    // Update quantity
    await getPrismaClient().cartItem.update({
      where: { id: cartItemId },
      data: { quantity }
    });

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'CartItem',
      entityId: cartItem.productId,
      metadata: {
        cartItemId,
        oldQuantity: cartItem.quantity,
        newQuantity: quantity,
        productName: cartItem.product.name,
        event: 'item_updated'
      }
    });

    return await this.getCartSummary(userId);
  }

  /**
   * Remove item from cart
   * @param {number} userId - User ID
   * @param {number} cartItemId - Cart item ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeFromCart(userId, cartItemId) {
    // Find cart item and verify ownership
    const cartItem = await getPrismaClient().cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId }
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
      throw new Error('CART_ITEM_NOT_FOUND');
    }

    // Remove item
    await getPrismaClient().cartItem.delete({
      where: { id: cartItemId }
    });

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'CartItem',
      entityId: cartItem.productId,
      metadata: {
        cartItemId,
        quantity: cartItem.quantity,
        productName: cartItem.product.name,
        event: 'item_removed'
      }
    });

    return await this.getCartSummary(userId);
  }

  /**
   * Clear entire cart
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Empty cart
   */
  async clearCart(userId) {
    const cart = await getPrismaClient().cart.findUnique({
      where: { userId }
    });

    if (cart) {
      await getPrismaClient().cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      // Log activity
      await this.logActivity({
        userId,
        action: ActivityAction.SYSTEM_EVENT,
        entity: 'Cart',
        entityId: cart.id,
        metadata: {
          event: 'cart_cleared'
        }
      });
    }

    return await this.getCartSummary(userId);
  }

  /**
   * Get only Basalam items from user's cart
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of cart items with Basalam products
   */
  async getBasalamItems(userId) {
    const cart = await getPrismaClient().cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    isMain: 'desc'
                  }
                }
              }
            }
          },
          where: {
            product: {
              basalamProductId: {
                not: null
              }
            }
          }
        }
      }
    });

    if (!cart || !cart.items) {
      return [];
    }

    return cart.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      subtotal: (item.product.discountPrice || item.product.price) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        discountPrice: item.product.discountPrice,
        effectivePrice: item.product.discountPrice || item.product.price,
        stock: item.product.stock,
        availableStock: item.product.stock - item.product.reservedStock,
        basalamProductId: item.product.basalamProductId,
        images: item.product.images.map(img => ({
          id: img.id,
          url: img.url,
          isMain: img.isMain
        }))
      }
    }));
  }

  /**
   * Clear only Basalam items from cart
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated cart summary
   */
  async clearBasalamItems(userId) {
    const cart = await getPrismaClient().cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) {
      return await this.getCartSummary(userId);
    }

    // Find all cart items with Basalam products
    const basalamItemIds = cart.items
      .filter(item => item.product.basalamProductId !== null)
      .map(item => item.id);

    if (basalamItemIds.length > 0) {
      // Delete only Basalam items
      await getPrismaClient().cartItem.deleteMany({
        where: {
          id: {
            in: basalamItemIds
          }
        }
      });

      // Log activity
      await this.logActivity({
        userId,
        action: ActivityAction.SYSTEM_EVENT,
        entity: 'Cart',
        entityId: cart.id,
        metadata: {
          clearedItemsCount: basalamItemIds.length,
          feature: 'cart',
          source: 'basalam',
          event: 'items_cleared'
        }
      });
      

    }

    return await this.getCartSummary(userId);
  }

  /**
   * Check if cart has any Basalam products
   * @param {Object} cart - Cart object with items
   * @returns {boolean} True if cart contains Basalam products
   */
  hasBasalamProducts(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return false;
    }

    return cart.items.some(item => 
      item.product && item.product.basalamProductId !== null && item.product.basalamProductId !== undefined
    );
  }

  /**
   * Get cart totals and summary
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Cart summary with totals
   */
  async getCartSummary(userId) {
    const cart = await this.getOrCreateCart(userId);
    
    let subtotal = 0;
    let totalDiscount = 0;
    let itemCount = 0;

    cart.items.forEach(item => {
      const itemPrice = item.product.effectivePrice;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;
      
      if (item.product.discountPrice) {
        const discount = (item.product.price - item.product.discountPrice) * item.quantity;
        totalDiscount += discount;
      }
      
      itemCount += item.quantity;
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items,
      totalItems: itemCount,
      totalAmount: subtotal,
      discountAmount: totalDiscount,
      shippingCost: 0,
      finalAmount: subtotal,
      updatedAt: cart.updatedAt
    };
  }

  /**
   * Format cart response with calculated fields
   * @param {Object} cart - Raw cart data
   * @returns {Object} Formatted cart
   */
  formatCartResponse(cart) {
    const formattedItems = cart.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      subtotal: (item.product.discountPrice || item.product.price) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        discountPrice: item.product.discountPrice,
        effectivePrice: item.product.discountPrice || item.product.price,
        stock: item.product.stock,
        availableStock: item.product.stock - item.product.reservedStock,
        basalamProductId: item.product.basalamProductId,
        images: item.product.images.map(img => ({
          id: img.id,
          url: img.url,
          isMain: img.isMain
        }))
      }
    }));

    return {
      id: cart.id,
      userId: cart.userId,
      items: formattedItems,
      updatedAt: cart.updatedAt
    };
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
}

module.exports = new CartService();
