const { getPrismaClient } = require('../utils/database');

class CategoryService {
  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData, userId) {
    const { name, parentId } = categoryData;

    // Check if category name already exists at the same level
    const existingCategory = await getPrismaClient().category.findFirst({
      where: {
        name,
        parentId: parentId || null
      }
    });

    if (existingCategory) {
      throw new Error('CATEGORY_NAME_EXISTS');
    }

    // Verify parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await getPrismaClient().category.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        throw new Error('PARENT_CATEGORY_NOT_FOUND');
      }
    }

    // Create category
    const category = await getPrismaClient().category.create({
      data: {
        name,
        parentId: parentId || null
      },
      include: {
        parent: true,
        children: true
      }
    });

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Category',
      entityId: category.id,
      metadata: {
        name: category.name,
        parentId: category.parentId,
        event: 'category_created'
      }
    });

    return category;
  }

  /**
   * Get all categories with hierarchical structure
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Categories with hierarchy
   */
  async getCategories(options = {}) {
    const { includeProductCount = false, parentId = null } = options;

    // Base query
    const include = {
      parent: true,
      children: {
        include: {
          children: true
        }
      }
    };

    // Add product count if requested
    if (includeProductCount) {
      include._count = {
        select: { products: true }
      };
    }

    let categories;

    if (parentId === null) {
      // Get root categories (no parent)
      categories = await getPrismaClient().category.findMany({
        where: { parentId: null },
        include,
        orderBy: { name: 'asc' }
      });
    } else {
      // Get categories with specific parent
      categories = await getPrismaClient().category.findMany({
        where: { parentId },
        include,
        orderBy: { name: 'asc' }
      });
    }

    return categories;
  }

  /**
   * Get category tree (all categories in hierarchical structure)
   * @param {boolean} includeProductCount - Include product count
   * @returns {Promise<Array>} Complete category tree
   */
  async getCategoryTree(includeProductCount = false) {
    const include = {
      children: {
        include: {
          children: {
            include: {
              children: true // Support up to 4 levels deep
            }
          }
        }
      }
    };

    if (includeProductCount) {
      include._count = {
        select: { products: true }
      };
      // Add count to nested children as well
      include.children.include._count = { select: { products: true } };
      include.children.include.children.include._count = { select: { products: true } };
      include.children.include.children.include.children.include = {
        _count: { select: { products: true } }
      };
    }

    // Get root categories and build tree
    const rootCategories = await getPrismaClient().category.findMany({
      where: { parentId: null },
      include,
      orderBy: { name: 'asc' }
    });

    return rootCategories;
  }

  /**
   * Get category by ID with details
   * @param {number} categoryId - Category ID
   * @param {boolean} includeProducts - Include products in category
   * @returns {Promise<Object>} Category details
   */
  async getCategoryById(categoryId, includeProducts = false) {
    const include = {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    };

    if (includeProducts) {
      include.products = {
        include: {
          images: {
            where: { isMain: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      };
    }

    const category = await getPrismaClient().category.findUnique({
      where: { id: categoryId },
      include
    });

    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    return category;
  }

  /**
   * Update category
   * @param {number} categoryId - Category ID
   * @param {Object} updateData - Update data
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(categoryId, updateData, userId) {
    const { name, parentId } = updateData;

    // Check if category exists
    const existingCategory = await getPrismaClient().category.findUnique({
      where: { id: categoryId }
    });

    if (!existingCategory) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    // Check if new name conflicts with existing categories at the same level
    if (name && name !== existingCategory.name) {
      const nameConflict = await getPrismaClient().category.findFirst({
        where: {
          name,
          parentId: parentId !== undefined ? parentId : existingCategory.parentId,
          id: { not: categoryId }
        }
      });

      if (nameConflict) {
        throw new Error('CATEGORY_NAME_EXISTS');
      }
    }

    // Verify parent category exists if parentId is being updated
    if (parentId !== undefined && parentId !== null) {
      // Prevent circular reference
      if (parentId === categoryId) {
        throw new Error('CIRCULAR_REFERENCE');
      }

      // Check if the new parent would create a circular reference
      const wouldCreateCircle = await this.wouldCreateCircularReference(categoryId, parentId);
      if (wouldCreateCircle) {
        throw new Error('CIRCULAR_REFERENCE');
      }

      const parentCategory = await getPrismaClient().category.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        throw new Error('PARENT_CATEGORY_NOT_FOUND');
      }
    }

    // Update category
    const category = await getPrismaClient().category.update({
      where: { id: categoryId },
      data: {
        ...(name && { name }),
        ...(parentId !== undefined && { parentId })
      },
      include: {
        parent: true,
        children: true
      }
    });

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Category',
      entityId: categoryId,
      metadata: {
        changes: updateData,
        event: 'category_updated'
      }
    });

    return category;
  }

  /**
   * Delete category
   * @param {number} categoryId - Category ID
   * @param {number} userId - User ID for logging
   * @returns {Promise<boolean>} Success status
   */
  async deleteCategory(categoryId, userId) {
    // Check if category exists
    const category = await getPrismaClient().category.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        products: true
      }
    });

    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new Error('CATEGORY_HAS_CHILDREN');
    }

    // Check if category has products
    if (category.products.length > 0) {
      throw new Error('CATEGORY_HAS_PRODUCTS');
    }

    // Delete category
    await getPrismaClient().category.delete({
      where: { id: categoryId }
    });

    // Log activity
    await this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Category',
      entityId: categoryId,
      metadata: {
        name: category.name,
        event: 'category_deleted'
      }
    });

    return true;
  }

  /**
   * Get category path (breadcrumb)
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Category path from root to current
   */
  async getCategoryPath(categoryId) {
    const path = [];
    let currentId = categoryId;

    while (currentId) {
      const category = await getPrismaClient().category.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          parentId: true
        }
      });

      if (!category) {
        break;
      }

      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  /**
   * Get all descendant categories
   * @param {number} categoryId - Parent category ID
   * @returns {Promise<Array>} All descendant category IDs
   */
  async getDescendantCategories(categoryId) {
    const descendants = [];
    
    const getChildren = async (parentId) => {
      const children = await getPrismaClient().category.findMany({
        where: { parentId },
        select: { id: true }
      });

      for (const child of children) {
        descendants.push(child.id);
        await getChildren(child.id);
      }
    };

    await getChildren(categoryId);
    return descendants;
  }

  /**
   * Check if moving a category would create a circular reference
   * @param {number} categoryId - Category being moved
   * @param {number} newParentId - New parent category ID
   * @returns {Promise<boolean>} True if would create circular reference
   */
  async wouldCreateCircularReference(categoryId, newParentId) {
    const descendants = await this.getDescendantCategories(categoryId);
    return descendants.includes(newParentId);
  }

  /**
   * Search categories by name
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching categories
   */
  async searchCategories(searchTerm) {
    return await getPrismaClient().category.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      include: {
        parent: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });
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

module.exports = new CategoryService();
