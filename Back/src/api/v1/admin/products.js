const express = require('express');
const productService = require('../../../services/productService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/products:
 *   get:
 *     summary: Get all products with pagination (Admin)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const result = await productService.getProducts(req.query);

      console.log('Products from service:', result.products.length);
      if (result.products.length > 0) {
        console.log('First product:', result.products[0].name);
        console.log('First product images:', result.products[0].images);
      }

      res.json({
        success: true,
        data: result.products,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.pages
        }
      });
    } catch (error) {
      console.error('Admin products listing error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve products'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/products:
 *   post:
 *     summary: Create a new product (Admin)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               discountPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               categoryId:
 *                 type: integer
 *               lowStockAlert:
 *                 type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 5)
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/',
  authenticateToken,
  requireRole(['ADMIN']),
  require('../../../services/uploadService').multiple('images', 5),
  async (req, res) => {
    try {
      console.log('Received product data:', req.body);
      console.log('Received files:', req.files);

      // Manual validation
      if (!req.body.name || req.body.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Product name is required'
          }
        });
      }

      const price = parseFloat(req.body.price);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid price is required'
          }
        });
      }

      const stock = parseInt(req.body.stock);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid stock is required'
          }
        });
      }

      const categoryId = parseInt(req.body.categoryId);
      if (isNaN(categoryId) || categoryId < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid category ID is required'
          }
        });
      }

      // Parse numeric fields from FormData strings
      const productData = {
        name: req.body.name.trim(),
        description: req.body.description || '',
        price: price,
        discountPrice: req.body.discountPrice ? parseFloat(req.body.discountPrice) : undefined,
        stock: stock,
        categoryId: categoryId,
        lowStockAlert: req.body.lowStockAlert ? parseInt(req.body.lowStockAlert) : undefined
      };

      console.log('Parsed product data:', productData);

      // Create product first
      const product = await productService.createProduct(productData, req.user.id);

      // Upload images if provided
      if (req.files && req.files.length > 0) {
        const uploadService = require('../../../services/uploadService');
        
        // Validate files
        const validation = uploadService.validateFiles(req.files);
        if (!validation.valid) {
          // Product created but images failed - still return success with warning
          return res.status(201).json({
            success: true,
            data: product,
            message: 'Product created successfully but some images failed validation',
            warnings: validation.errors
          });
        }

        // Upload images
        try {
          await uploadService.addProductImages(product.id, req.files, req.user.id);
          
          // Fetch product with images
          const productWithImages = await productService.getProductById(product.id);
          
          return res.status(201).json({
            success: true,
            data: productWithImages,
            message: 'Product created successfully with images'
          });
        } catch (imageError) {
          console.error('Image upload error:', imageError);
          // Product created but images failed - still return success with warning
          return res.status(201).json({
            success: true,
            data: product,
            message: 'Product created successfully but image upload failed',
            warnings: ['Failed to upload images']
          });
        }
      }

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Product creation error:', error);
      
      if (error.message === 'PRODUCT_SLUG_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_SLUG_EXISTS',
            message: 'A product with this name already exists'
          }
        });
      }

      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create product'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/products/{id}:
 *   put:
 *     summary: Update a product (Admin)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 */
router.put('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  require('../../../services/uploadService').multiple('images', 5),
  async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Product ID must be a valid number'
          }
        });
      }

      // Manual validation for FormData
      if (req.body.name && req.body.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Product name cannot be empty'
          }
        });
      }

      // Parse numeric fields from FormData strings if they exist
      const productData = {};
      if (req.body.name) productData.name = req.body.name.trim();
      if (req.body.description) productData.description = req.body.description;
      if (req.body.price) productData.price = parseFloat(req.body.price);
      if (req.body.discountPrice) productData.discountPrice = parseFloat(req.body.discountPrice);
      if (req.body.stock) productData.stock = parseInt(req.body.stock);
      if (req.body.categoryId) productData.categoryId = parseInt(req.body.categoryId);
      if (req.body.lowStockAlert) productData.lowStockAlert = parseInt(req.body.lowStockAlert);

      // Update product
      const product = await productService.updateProduct(productId, productData, req.user.id);

      // Upload new images if provided
      if (req.files && req.files.length > 0) {
        const uploadService = require('../../../services/uploadService');
        
        // Validate files
        const validation = uploadService.validateFiles(req.files);
        if (!validation.valid) {
          return res.json({
            success: true,
            data: product,
            message: 'Product updated successfully but some images failed validation',
            warnings: validation.errors
          });
        }

        // Upload images
        try {
          await uploadService.addProductImages(productId, req.files, req.user.id);
        } catch (imageError) {
          console.error('Image upload error:', imageError);
        }
      }

      // Fetch updated product with images
      const updatedProduct = await productService.getProductById(productId);

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Product update error:', error);
      
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      if (error.message === 'PRODUCT_SLUG_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_SLUG_EXISTS',
            message: 'A product with this name already exists'
          }
        });
      }

      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product has active orders
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product ID',
            details: errors.array()
          }
        });
      }

      const productId = parseInt(req.params.id);
      await productService.deleteProduct(productId, req.user.id);

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Product deletion error:', error);
      
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      if (error.message === 'PRODUCT_HAS_ACTIVE_ORDERS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_HAS_ACTIVE_ORDERS',
            message: 'Cannot delete product with active orders'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete product'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/products/bulk-delete:
 *   post:
 *     summary: Bulk delete products (Admin)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Products deleted successfully
 *       400:
 *         description: Validation error
 */
router.post('/bulk-delete',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('ids').isArray({ min: 1 }),
    body('ids.*').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product IDs',
            details: errors.array()
          }
        });
      }

      const { ids } = req.body;
      let deletedCount = 0;
      const failedIds = [];

      // Delete each product
      for (const id of ids) {
        try {
          await productService.deleteProduct(id, req.user.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete product ${id}:`, error.message);
          failedIds.push(id);
        }
      }

      res.json({
        success: true,
        data: {
          deletedCount,
          failedCount: failedIds.length,
          failedIds
        },
        message: `Successfully deleted ${deletedCount} product(s)`
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete products'
        }
      });
    }
  }
);

module.exports = router;
