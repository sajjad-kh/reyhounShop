const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DiscountService {
  /**
   * Create a new discount code
   */
  async createDiscount(discountData) {
    const {
      code,
      type,
      value,
      minPurchase,
      maxUses,
      applicableTo,
      expiresAt
    } = discountData;

    // Validate discount code uniqueness
    const existingDiscount = await prisma.discount.findUnique({
      where: { code }
    });

    if (existingDiscount) {
      throw new Error('Discount code already exists');
    }

    // Validate discount type and value
    if (type === 'PERCENT' && (value < 1 || value > 100)) {
      throw new Error('Percentage discount must be between 1 and 100');
    }

    if (type === 'FIXED' && value < 1) {
      throw new Error('Fixed discount must be greater than 0');
    }

    // Create discount
    const discount = await prisma.discount.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minPurchase: minPurchase || null,
        maxUses: maxUses || null,
        applicableTo: applicableTo || 'all',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        usedCount: 0
      }
    });

    return discount;
  }

  /**
   * Get all discounts with filtering and pagination
   */
  async getDiscounts(filters = {}, pagination = {}) {
    const {
      isActive,
      type,
      search,
      expired
    } = filters;

    const {
      page = 1,
      limit = 20
    } = pagination;

    const skip = (page - 1) * limit;

    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.code = {
        contains: search.toUpperCase()
      };
    }

    if (expired !== undefined) {
      if (expired) {
        where.expiresAt = {
          lt: new Date()
        };
      } else {
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ];
      }
    }

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.discount.count({ where })
    ]);

    return {
      discounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get discount by ID
   */
  async getDiscountById(id) {
    const discount = await prisma.discount.findUnique({
      where: { id: parseInt(id) }
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    return discount;
  }

  /**
   * Get discount by code
   */
  async getDiscountByCode(code) {
    const discount = await prisma.discount.findUnique({
      where: { code: code.toUpperCase() }
    });

    return discount;
  }

  /**
   * Update discount
   */
  async updateDiscount(id, updateData) {
    const discount = await this.getDiscountById(id);

    // If updating code, check uniqueness
    if (updateData.code && updateData.code !== discount.code) {
      const existingDiscount = await prisma.discount.findUnique({
        where: { code: updateData.code.toUpperCase() }
      });

      if (existingDiscount) {
        throw new Error('Discount code already exists');
      }
    }

    // Validate discount type and value if updating
    if (updateData.type && updateData.value) {
      if (updateData.type === 'PERCENT' && (updateData.value < 1 || updateData.value > 100)) {
        throw new Error('Percentage discount must be between 1 and 100');
      }

      if (updateData.type === 'FIXED' && updateData.value < 1) {
        throw new Error('Fixed discount must be greater than 0');
      }
    }

    const updatedDiscount = await prisma.discount.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        code: updateData.code ? updateData.code.toUpperCase() : undefined,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined
      }
    });

    return updatedDiscount;
  }

  /**
   * Delete discount (soft delete by setting isActive to false)
   */
  async deleteDiscount(id) {
    const discount = await this.getDiscountById(id);

    const deletedDiscount = await prisma.discount.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    return deletedDiscount;
  }

  /**
   * Validate discount code for use
   */
  async validateDiscount(code, orderTotal = 0, userId = null) {
    const discount = await this.getDiscountByCode(code);

    if (!discount) {
      return { valid: false, error: 'Invalid discount code' };
    }

    if (!discount.isActive) {
      return { valid: false, error: 'Discount code is not active' };
    }

    // Check expiration
    if (discount.expiresAt && new Date() > discount.expiresAt) {
      return { valid: false, error: 'Discount code has expired' };
    }

    // Check usage limit
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return { valid: false, error: 'Discount code usage limit reached' };
    }

    // Check minimum purchase requirement
    if (discount.minPurchase && orderTotal < discount.minPurchase) {
      return { 
        valid: false, 
        error: `Minimum purchase of ${discount.minPurchase} required` 
      };
    }

    return { valid: true, discount };
  }

  /**
   * Calculate discount amount
   */
  calculateDiscountAmount(discount, orderTotal) {
    if (discount.type === 'PERCENT') {
      return Math.floor((orderTotal * discount.value) / 100);
    } else if (discount.type === 'FIXED') {
      return Math.min(discount.value, orderTotal);
    }
    return 0;
  }

  /**
   * Apply discount to order (increment usage count)
   */
  async applyDiscount(discountId) {
    const discount = await prisma.discount.update({
      where: { id: discountId },
      data: {
        usedCount: {
          increment: 1
        }
      }
    });

    return discount;
  }

  /**
   * Get discount statistics
   */
  async getDiscountStats() {
    const [
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      totalUsage
    ] = await Promise.all([
      prisma.discount.count(),
      prisma.discount.count({ where: { isActive: true } }),
      prisma.discount.count({
        where: {
          expiresAt: { lt: new Date() }
        }
      }),
      prisma.discount.aggregate({
        _sum: { usedCount: true }
      })
    ]);

    return {
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      totalUsage: totalUsage._sum.usedCount || 0
    };
  }
}

module.exports = new DiscountService();