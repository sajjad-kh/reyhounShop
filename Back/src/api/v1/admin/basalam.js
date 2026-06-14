const express = require('express');
const basalamService = require('../../../services/basalamService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/basalam/sync-product:
 *   post:
 *     summary: Sync a product from Basalam marketplace (Admin)
 *     tags: [Admin Basalam]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - basalamId
 *               - name
 *               - price
 *               - stock
 *               - categoryId
 *             properties:
 *               basalamId:
 *                 type: string
 *                 description: Unique identifier from Basalam
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Product price
 *               discountPrice:
 *                 type: number
 *                 description: Discounted price (optional)
 *               stock:
 *                 type: number
 *                 description: Available stock quantity
 *               imageUrl:
 *                 type: string
 *                 description: URL of product image on Basalam (optional)
 *               categoryId:
 *                 type: integer
 *                 description: Category ID for the product
 *     responses:
 *       200:
 *         description: Product synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     price:
 *                       type: number
 *                     stock:
 *                       type: number
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.post('/sync-product',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('basalamId')
      .notEmpty()
      .withMessage('Basalam ID is required')
      .isString()
      .withMessage('Basalam ID must be a string')
      .trim(),
    body('name')
      .notEmpty()
      .withMessage('Product name is required')
      .isString()
      .withMessage('Product name must be a string')
      .trim(),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string'),
    body('price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    body('discountPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Discount price must be a positive number')
      .custom((value, { req }) => {
        if (value && req.body.price && value >= req.body.price) {
          throw new Error('Discount price must be less than regular price');
        }
        return true;
      }),
    body('stock')
      .notEmpty()
      .withMessage('Stock is required')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    body('imageUrl')
      .optional()
      .isString()
      .withMessage('Image URL must be a string')
      .trim(),
    body('categoryId')
      .notEmpty()
      .withMessage('Category ID is required')
      .isInt({ min: 1 })
      .withMessage('Category ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      const { basalamId, name, description, price, discountPrice, stock, imageUrl, categoryId } = req.body;

      console.log('Basalam sync request:', { basalamId, name, userId: req.user.id });

      // Call basalam service to sync product
      const result = await basalamService.syncProduct(
        {
          basalamId,
          name,
          description: description || '',
          price: parseFloat(price),
          discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
          stock: parseInt(stock),
          imageUrl: imageUrl || undefined,
          categoryId: parseInt(categoryId)
        },
        req.user.id
      );

      // Prepare response message
      let message = 'Product synced successfully';
      if (result.isUpdate) {
        message = 'Product updated successfully';
      }
      if (!result.imageCreated && imageUrl) {
        message += ' (image download failed)';
      }

      res.json({
        success: true,
        data: result.product,
        message,
        meta: {
          isUpdate: result.isUpdate,
          imageCreated: result.imageCreated
        }
      });

    } catch (error) {
      console.error('Basalam sync error:', error);

      // Handle specific error types
      if (error.message === 'IMAGE_URL_REQUIRED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'IMAGE_URL_REQUIRED',
            message: 'تصویر محصول الزامی است. لطفاً آدرس تصویر را وارد کنید.'
          }
        });
      }

      if (error.message === 'IMAGE_DOWNLOAD_FAILED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'IMAGE_DOWNLOAD_FAILED',
            message: 'دانلود تصویر محصول ناموفق بود. لطفاً آدرس تصویر را بررسی کنید.'
          }
        });
      }

      if (error.message === 'IMAGE_RECORD_CREATION_FAILED') {
        return res.status(500).json({
          success: false,
          error: {
            code: 'IMAGE_RECORD_CREATION_FAILED',
            message: 'خطا در ذخیره اطلاعات تصویر. محصول ایجاد نشد.'
          }
        });
      }

      if (error.message.startsWith('MISSING_REQUIRED_FIELDS')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: error.message
          }
        });
      }

      if (error.message === 'INVALID_BASALAM_ID') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BASALAM_ID',
            message: 'Basalam ID must be a non-empty string'
          }
        });
      }

      if (error.message === 'INVALID_PRODUCT_NAME') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_NAME',
            message: 'Product name must be a non-empty string'
          }
        });
      }

      if (error.message === 'INVALID_PRICE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRICE',
            message: 'Price must be a positive number'
          }
        });
      }

      if (error.message === 'INVALID_STOCK') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STOCK',
            message: 'Stock must be a non-negative number'
          }
        });
      }

      if (error.message === 'INVALID_CATEGORY_ID') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY_ID',
            message: 'Category ID must be a positive integer'
          }
        });
      }

      if (error.message === 'INVALID_DISCOUNT_PRICE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DISCOUNT_PRICE',
            message: 'Discount price must be a positive number'
          }
        });
      }

      if (error.message === 'DISCOUNT_PRICE_MUST_BE_LESS_THAN_PRICE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DISCOUNT_PRICE_MUST_BE_LESS_THAN_PRICE',
            message: 'Discount price must be less than regular price'
          }
        });
      }

      if (error.message === 'INVALID_IMAGE_URL') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMAGE_URL',
            message: 'Image URL must be a non-empty string'
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

      if (error.message === 'PRODUCT_SLUG_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_SLUG_EXISTS',
            message: 'A product with this name already exists'
          }
        });
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sync product from Basalam'
        }
      });
    }
  }
);

module.exports = router;
