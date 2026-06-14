const express = require('express');
const { 
  authenticateToken, 
  requireRole, 
  validateInput,
  asyncHandler 
} = require('../../middleware');
const categoryService = require('../../services/categoryService');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  parentId: Joi.number().integer().optional()
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  parentId: Joi.number().integer().optional()
});

const categoryQuerySchema = Joi.object({
  includeProductCount: Joi.boolean().optional(),
  parentId: Joi.number().integer().optional(),
  includeProducts: Joi.boolean().optional(),
  search: Joi.string().max(255).optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         parentId:
 *           type: integer
 *         parent:
 *           $ref: '#/components/schemas/Category'
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         _count:
 *           type: object
 *           properties:
 *             products:
 *               type: integer
 */

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               parentId:
 *                 type: integer
 *                 description: Parent category ID for hierarchical structure
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       409:
 *         description: Category name already exists at this level
 */
router.post('/', 
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body, req.user.userId);
    
    res.status(201).json({
      success: true,
      data: category
    });
  })
);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get categories with optional hierarchical structure
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeProductCount
 *         schema:
 *           type: boolean
 *         description: Include product count for each category
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *         description: Get categories with specific parent (null for root categories)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search categories by name
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get('/',
  validateInput(categoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, ...options } = req.query;
    
    let categories;
    
    if (search) {
      categories = await categoryService.searchCategories(search);
    } else {
      categories = await categoryService.getCategories(options);
    }
    
    res.json({
      success: true,
      data: categories
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/tree:
 *   get:
 *     summary: Get complete category tree
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeProductCount
 *         schema:
 *           type: boolean
 *         description: Include product count for each category
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get('/tree',
  validateInput(categoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { includeProductCount = false } = req.query;
    const tree = await categoryService.getCategoryTree(includeProductCount);
    
    res.json({
      success: true,
      data: tree
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: includeProducts
 *         schema:
 *           type: boolean
 *         description: Include products in this category
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id',
  validateInput(categoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id);
    const { includeProducts = false } = req.query;
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Category ID must be a valid number'
        }
      });
    }

    const category = await categoryService.getCategoryById(categoryId, includeProducts);
    
    res.json({
      success: true,
      data: category
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}/path:
 *   get:
 *     summary: Get category path (breadcrumb)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category path retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       parentId:
 *                         type: integer
 */
router.get('/:id/path',
  asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Category ID must be a valid number'
        }
      });
    }

    const path = await categoryService.getCategoryPath(categoryId);
    
    res.json({
      success: true,
      data: path
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               parentId:
 *                 type: integer
 *                 description: Parent category ID
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error or circular reference
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists at this level
 */
router.put('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Category ID must be a valid number'
        }
      });
    }

    const category = await categoryService.updateCategory(categoryId, req.body, req.user.userId);
    
    res.json({
      success: true,
      data: category
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category has children or products
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Category ID must be a valid number'
        }
      });
    }

    await categoryService.deleteCategory(categoryId, req.user.userId);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  })
);

module.exports = router;