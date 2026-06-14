/**
 * Basalam Service
 * Handles synchronization of products from Basalam marketplace
 */

const { getPrismaClient } = require('../utils/database');
const { downloadImage, generateFilename } = require('../utils/imageDownloader');
const productService = require('./productService');
const ShippingMethodRepository = require('../repositories/ShippingMethodRepository');
const { createLogger } = require('../utils/logger');

const logger = createLogger('BasalamService');

class BasalamService {
  /**
   * Sync a product from Basalam to the local database
   * @param {Object} basalamProductData - Product data from Basalam
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Created or updated product with images
   */
  async syncProduct(basalamProductData, userId) {
    try {
      // Validate required fields
      this.validateProductData(basalamProductData);

      const { basalamId, name, description, price, stock, imageUrl, categoryId, discountPrice } = basalamProductData;

      logger.info('Starting Basalam product sync', { basalamId, name });

      // Get active shipping methods for the product
      const activeShippingMethods = await ShippingMethodRepository.findAll({ isActive: true });
      if (activeShippingMethods.length === 0) {
        logger.warn('No active shipping methods found, cannot sync product', { basalamId });
        throw new Error('NO_ACTIVE_SHIPPING_METHODS');
      }
      const shippingMethodIds = activeShippingMethods.map(sm => sm.id);
      logger.info('Using shipping methods for product', { basalamId, shippingMethodIds });

      // Validate that imageUrl is provided
      if (!imageUrl || imageUrl.trim() === '') {
        logger.error('Image URL is required for Basalam product sync', { basalamId });
        throw new Error('IMAGE_URL_REQUIRED');
      }

      // Download image first before creating/updating product
      let localImagePath = null;
      try {
        logger.info('Downloading product image from Basalam', { 
          basalamId, 
          imageUrl 
        });

        // Generate unique filename
        const filename = generateFilename(basalamId, imageUrl);

        // Download image
        localImagePath = await downloadImage(imageUrl, filename);

        if (!localImagePath || localImagePath === 'undefined' || localImagePath === '/uploads/products/undefined') {
          logger.error('Image download failed', { basalamId, imageUrl });
          throw new Error('IMAGE_DOWNLOAD_FAILED');
        }

        logger.info('Image downloaded successfully', { 
          basalamId, 
          localImagePath 
        });
      } catch (error) {
        logger.error('Error downloading product image', { 
          basalamId,
          imageUrl,
          error: error.message,
          stack: error.stack 
        });
        throw new Error('IMAGE_DOWNLOAD_FAILED');
      }

      // Check if product already exists by Basalam ID in name
      const existingProduct = await this.findProductByBasalamId(basalamId);

      let product;
      let isUpdate = false;

      if (existingProduct) {
        // Update existing product
        logger.info('Updating existing Basalam product', { 
          basalamId, 
          productId: existingProduct.id 
        });

        product = await productService.updateProduct(
          existingProduct.id,
          {
            name: this.formatProductName(name, basalamId),
            description,
            price,
            discountPrice: discountPrice || null,
            stock,
            categoryId
          },
          userId
        );

        isUpdate = true;
      } else {
        // Create new product
        logger.info('Creating new Basalam product', { basalamId });

        product = await productService.createProduct(
          {
            name: this.formatProductName(name, basalamId),
            description,
            price,
            discountPrice: discountPrice || null,
            stock,
            categoryId,
            lowStockAlert: 5,
            shippingMethodIds
          },
          userId
        );
      }

      // Create product image record (image already downloaded above)
      let imageCreated = false;
      try {
        // If updating, remove old images first
        if (isUpdate && product.images && product.images.length > 0) {
          logger.info('Removing old product images', { 
            productId: product.id,
            imageCount: product.images.length 
          });

          for (const oldImage of product.images) {
            try {
              await this.deleteProductImage(oldImage.id, userId);
            } catch (error) {
              logger.error('Failed to delete old image', { 
                imageId: oldImage.id,
                error: error.message 
              });
            }
          }
        }

        // Create ProductImage record
        const productImage = await getPrismaClient().productImage.create({
          data: {
            productId: product.id,
            url: localImagePath,
            isMain: true
          }
        });

        logger.info('Product image created successfully', { 
          productId: product.id,
          imageId: productImage.id,
          url: localImagePath 
        });

        imageCreated = true;

        // Log activity
        await this.logActivity(userId, 'basalam.image_synced', 'Product', product.id, {
          basalamId,
          imageUrl,
          localPath: localImagePath
        });
      } catch (error) {
        logger.error('Error creating product image record', { 
          basalamId,
          productId: product.id,
          error: error.message,
          stack: error.stack 
        });
        // If image record creation fails, delete the product since we require images
        logger.error('Deleting product due to image creation failure', { productId: product.id });
        await productService.deleteProduct(product.id, userId);
        throw new Error('IMAGE_RECORD_CREATION_FAILED');
      }

      // Fetch complete product data with images
      const completeProduct = await productService.getProductById(product.id);

      logger.info('Basalam product sync completed', { 
        basalamId,
        productId: product.id,
        isUpdate,
        imageCreated 
      });

      // Log sync activity
      await this.logActivity(userId, 'basalam.product_synced', 'Product', product.id, {
        basalamId,
        isUpdate,
        imageCreated,
        name: product.name
      });

      return {
        product: completeProduct,
        isUpdate,
        imageCreated
      };

    } catch (error) {
      logger.error('Basalam product sync failed', { 
        basalamId: basalamProductData?.basalamId,
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Validate Basalam product data
   * @param {Object} productData - Product data to validate
   * @throws {Error} If validation fails
   */
  validateProductData(productData) {
    const requiredFields = ['basalamId', 'name', 'price', 'stock', 'categoryId'];
    const missingFields = [];

    for (const field of requiredFields) {
      if (productData[field] === undefined || productData[field] === null) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`MISSING_REQUIRED_FIELDS: ${missingFields.join(', ')}`);
    }

    // Validate data types and values
    if (typeof productData.basalamId !== 'string' || productData.basalamId.trim() === '') {
      throw new Error('INVALID_BASALAM_ID');
    }

    if (typeof productData.name !== 'string' || productData.name.trim() === '') {
      throw new Error('INVALID_PRODUCT_NAME');
    }

    if (typeof productData.price !== 'number' || productData.price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    if (typeof productData.stock !== 'number' || productData.stock < 0) {
      throw new Error('INVALID_STOCK');
    }

    if (typeof productData.categoryId !== 'number' || productData.categoryId <= 0) {
      throw new Error('INVALID_CATEGORY_ID');
    }

    // Validate optional fields
    if (productData.discountPrice !== undefined && productData.discountPrice !== null) {
      if (typeof productData.discountPrice !== 'number' || productData.discountPrice <= 0) {
        throw new Error('INVALID_DISCOUNT_PRICE');
      }
      if (productData.discountPrice >= productData.price) {
        throw new Error('DISCOUNT_PRICE_MUST_BE_LESS_THAN_PRICE');
      }
    }

    if (productData.imageUrl !== undefined && productData.imageUrl !== null) {
      if (typeof productData.imageUrl !== 'string' || productData.imageUrl.trim() === '') {
        throw new Error('INVALID_IMAGE_URL');
      }
    }
  }

  /**
   * Find product by Basalam ID
   * @param {string} basalamId - Basalam product ID
   * @returns {Promise<Object|null>} Product if found, null otherwise
   */
  async findProductByBasalamId(basalamId) {
    try {
      // Search for products with Basalam ID in the name
      const searchPattern = `(Basalam-${basalamId})`;
      
      const product = await getPrismaClient().product.findFirst({
        where: {
          name: {
            contains: searchPattern
          }
        },
        include: {
          category: true,
          images: true
        }
      });

      return product;
    } catch (error) {
      logger.error('Error finding product by Basalam ID', { 
        basalamId,
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Format product name with Basalam ID
   * @param {string} name - Original product name
   * @param {string} basalamId - Basalam product ID
   * @returns {string} Formatted product name
   */
  formatProductName(name, basalamId) {
    // Remove existing Basalam ID if present
    const cleanName = name.replace(/\s*\(Basalam-[^)]+\)\s*$/, '').trim();
    
    // Add Basalam ID to name
    return `${cleanName} (Basalam-${basalamId})`;
  }

  /**
   * Delete a product image
   * @param {number} imageId - Image ID
   * @param {number} userId - User ID for logging
   * @returns {Promise<boolean>} Success status
   */
  async deleteProductImage(imageId, userId) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const image = await getPrismaClient().productImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        return false;
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), image.url.replace(/^\//, ''));
        await fs.unlink(filePath);
      } catch (error) {
        logger.error('Failed to delete image file', { 
          imageId,
          error: error.message 
        });
        // Continue with database deletion even if file deletion fails
      }

      // Delete image record
      await getPrismaClient().productImage.delete({
        where: { id: imageId }
      });

      return true;
    } catch (error) {
      logger.error('Error deleting product image', { 
        imageId,
        error: error.message 
      });
      throw error;
    }
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
      logger.error('Failed to log activity', { 
        action,
        error: error.message 
      });
    }
  }
}

module.exports = new BasalamService();
