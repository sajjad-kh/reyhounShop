const express = require('express');
const { 
  authenticateToken, 
  requireRole, 
  validateInput, 
  validationSchemas,
  asyncHandler 
} = require('../../middleware');
const productService = require('../../services/productService');
const uploadService = require('../../services/uploadService');
const reviewService = require('../../services/reviewService');
const Joi = require('joi');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Product ID
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: integer
 *           description: Product price in cents
 *         discountPrice:
 *           type: integer
 *           description: Discounted price in cents
 *         stock:
 *           type: integer
 *           description: Available stock quantity
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *         lowStockAlert:
 *           type: integer
 *           description: Low stock alert threshold
 *         isActive:
 *           type: boolean
 *           description: Product availability status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         category:
 *           $ref: '#/components/schemas/Category'
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductImage'
 *         reviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Review'
 *         averageRating:
 *           type: number
 *           format: float
 *           description: Average rating from reviews
 *         reviewCount:
 *           type: integer
 *           description: Total number of reviews
 *     
 *     ProductCreate:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - stock
 *         - categoryId
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Product name
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Product description
 *         price:
 *           type: integer
 *           minimum: 0
 *           description: Product price in cents
 *         discountPrice:
 *           type: integer
 *           minimum: 0
 *           description: Discounted price in cents
 *         stock:
 *           type: integer
 *           minimum: 0
 *           description: Initial stock quantity
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *         lowStockAlert:
 *           type: integer
 *           minimum: 0
 *           description: Low stock alert threshold
 *     
 *     ProductUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         description:
 *           type: string
 *           maxLength: 2000
 *         price:
 *           type: integer
 *           minimum: 0
 *         discountPrice:
 *           type: integer
 *           minimum: 0
 *         stock:
 *           type: integer
 *           minimum: 0
 *         categoryId:
 *           type: integer
 *         lowStockAlert:
 *           type: integer
 *           minimum: 0
 *     
 *     ProductImage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         url:
 *           type: string
 *           format: uri
 *         altText:
 *           type: string
 *         isMain:
 *           type: boolean
 *         sortOrder:
 *           type: integer
 *     
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         parentId:
 *           type: integer
 *         isActive:
 *           type: boolean
 *     
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         productId:
 *           type: integer
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         isApproved:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     PaginatedProducts:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             hasNext:
 *               type: boolean
 *             hasPrev:
 *               type: boolean
 */

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  price: Joi.number().integer().min(0).required(),
  discountPrice: Joi.number().integer().min(0).optional(),
  stock: Joi.number().integer().min(0).required(),
  categoryId: Joi.number().integer().required(),
  lowStockAlert: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  price: Joi.number().integer().min(0).optional(),
  discountPrice: Joi.number().integer().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  categoryId: Joi.number().integer().optional(),
  lowStockAlert: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const productQuerySchema = Joi.object({
  search: Joi.string().max(255).optional(),
  categoryId: Joi.number().integer().optional(),
  categoryIds: Joi.array().items(Joi.number().integer()).optional(),
  minPrice: Joi.number().integer().min(0).optional(),
  maxPrice: Joi.number().integer().min(0).optional(),
  inStock: Joi.boolean().optional(),
  hasDiscount: Joi.boolean().optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'price', 'createdAt', 'stock', 'rating', 'popularity').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const searchSchema = Joi.object({
  query: Joi.string().max(255).optional(),
  categories: Joi.array().items(Joi.number().integer()).optional(),
  priceRange: Joi.object({
    min: Joi.number().integer().min(0).optional(),
    max: Joi.number().integer().min(0).optional()
  }).optional(),
  availability: Joi.string().valid('all', 'in_stock', 'out_of_stock').optional(),
  rating: Joi.number().min(0).max(5).optional(),
  sortBy: Joi.string().valid('relevance', 'name', 'price', 'rating', 'createdAt').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const reviewSchema = Joi.object({
  orderId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/).trim()
    )
    .required(),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required(),

  comment: Joi.string().allow('', null).optional().trim()
});

const reviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  approved: Joi.boolean().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  minRating: Joi.number().integer().min(1).max(5).optional(),
  sortBy: Joi.string().valid('createdAt', 'rating', 'helpful').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductImage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         productId:
 *           type: integer
 *         url:
 *           type: string
 *         isMain:
 *           type: boolean
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: integer
 *         discountPrice:
 *           type: integer
 *         stock:
 *           type: integer
 *         reservedStock:
 *           type: integer
 *         lowStockAlert:
 *           type: integer
 *         categoryId:
 *           type: integer
 *         category:
 *           $ref: '#/components/schemas/Category'
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductImage'
 *         averageRating:
 *           type: number
 *         reviewCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
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
 *               - price
 *               - stock
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               price:
 *                 type: integer
 *                 minimum: 0
 *               discountPrice:
 *                 type: integer
 *                 minimum: 0
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *               categoryId:
 *                 type: integer
 *               lowStockAlert:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
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
  validateInput(createProductSchema),
  asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body, req.user.userId);
    
    res.status(201).json({
      success: true,
      data: product
    });
  })
);

/**
 * @swagger
 * /api/v1/products/search:
 *   post:
 *     summary: Advanced product search
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               categories:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Category IDs to filter by
 *               priceRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: integer
 *                   max:
 *                     type: integer
 *               availability:
 *                 type: string
 *                 enum: [all, in_stock, out_of_stock]
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               sortBy:
 *                 type: string
 *                 enum: [relevance, name, price, rating, createdAt]
 *               page:
 *                 type: integer
 *                 minimum: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Search results
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 */
router.post('/search',
  validateInput(searchSchema),
  asyncHandler(async (req, res) => {
    const result = await productService.searchProducts(req.body);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/products/suggestions:
 *   get:
 *     summary: Get product suggestions for search
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of suggestions
 *     responses:
 *       200:
 *         description: Product suggestions
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
 *                       price:
 *                         type: integer
 *                       effectivePrice:
 *                         type: integer
 *                       mainImage:
 *                         type: string
 */
router.get('/suggestions',
  asyncHandler(async (req, res) => {
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query is required'
        }
      });
    }

    const suggestions = await productService.getProductSuggestions(query, parseInt(limit));
    
    res.json({
      success: true,
      data: suggestions
    });
  })
);

/**
 * @swagger
 * /api/v1/products/popular:
 *   get:
 *     summary: Get popular products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: Popular products
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
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/popular',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const products = await productService.getPopularProducts(parseInt(limit));
    
    res.json({
      success: true,
      data: products
    });
  })
);

/**
 * @swagger
 * /api/v1/products/popular-searches:
 *   get:
 *     summary: Get popular search terms
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 8
 *         description: Number of popular searches to return
 *     responses:
 *       200:
 *         description: Popular search terms
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
 *                     type: string
 */
router.get('/popular-searches',
  asyncHandler(async (req, res) => {
    const { limit = 8 } = req.query;
    
    // For now, return some sample popular searches
    // In production, this would come from search analytics
    const popularSearches = [
      'لپ تاپ',
      'گوشی موبایل',
      'هدفون',
      'کیبورد',
      'ماوس',
      'مانیتور',
      'تبلت',
      'ساعت هوشمند'
    ].slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: popularSearches
    });
  })
);

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get products with search, filtering, and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name, description, and category
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: categoryIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: Filter by multiple category IDs
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter products in stock
 *       - in: query
 *         name: hasDiscount
 *         schema:
 *           type: boolean
 *         description: Filter products with discount
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum average rating
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, stock, rating]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name and description
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Minimum price filter (in cents)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Maximum price filter (in cents)
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by stock availability
 *       - in: query
 *         name: hasDiscount
 *         schema:
 *           type: boolean
 *         description: Filter products with discounts
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, stock, rating]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaginatedProducts'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/',
  validateInput(productQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.query);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/products/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Products]
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
router.get('/categories',
  asyncHandler(async (req, res) => {
    const categories = await productService.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
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

    const product = await productService.getProductById(productId);
    
    res.json({
      success: true,
      testReview: product.reviews[0],
      data: product
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
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
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               price:
 *                 type: integer
 *                 minimum: 0
 *               discountPrice:
 *                 type: integer
 *                 minimum: 0
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *               categoryId:
 *                 type: integer
 *               lowStockAlert:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Product not found
 */
router.put('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(updateProductSchema),
  asyncHandler(async (req, res) => {
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

    const product = await productService.updateProduct(productId, req.body, req.user.userId);
    
    res.json({
      success: true,
      data: product
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Soft delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *         description: Product not found
 *       409:
 *         description: Product has active orders
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
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

    await productService.deleteProduct(productId, req.user.userId);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

/**
 * @swagger
 * /api/v1/products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/low-stock',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const products = await productService.getLowStockProducts();
    
    res.json({
      success: true,
      data: products
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/images:
 *   post:
 *     summary: Upload images for a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 10 files, 5MB each)
 *     responses:
 *       201:
 *         description: Images uploaded successfully
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
 *                     $ref: '#/components/schemas/ProductImage'
 *       400:
 *         description: Invalid files or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Product not found
 */
router.post('/:id/images',
  authenticateToken,
  requireRole(['ADMIN']),
  uploadService.multiple('images', 10),
  asyncHandler(async (req, res) => {
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

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES_PROVIDED',
          message: 'No image files provided'
        }
      });
    }

    // Validate files
    const validation = uploadService.validateFiles(req.files);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILES',
          message: 'File validation failed',
          details: validation.errors
        }
      });
    }

    const images = await uploadService.addProductImages(productId, req.files, req.user.userId);
    
    res.status(201).json({
      success: true,
      data: images
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/images/from-url:
 *   post:
 *     summary: Upload product images from URL
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image to download
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid URL or download failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/:id/images/from-url',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);
    const { imageUrl } = req.body;
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Product ID must be a valid number'
        }
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_URL_PROVIDED',
          message: 'Image URL is required'
        }
      });
    }

    try {
      // Download image from URL
      const fetch = require('node-fetch');
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOWNLOAD_FAILED',
            message: 'Failed to download image from URL'
          }
        });
      }

      const buffer = await imageResponse.buffer();
      
      // Create a file object similar to multer
      const file = {
        buffer: buffer,
        originalname: `image-${Date.now()}.jpg`,
        mimetype: imageResponse.headers.get('content-type') || 'image/jpeg',
        size: buffer.length
      };

      // Validate file
      const validation = uploadService.validateFiles([file]);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: 'File validation failed',
            details: validation.errors
          }
        });
      }

      const images = await uploadService.addProductImages(productId, [file], req.user.userId);
      
      res.status(201).json({
        success: true,
        data: images
      });
    } catch (error) {
      console.error('Error downloading/uploading image:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to process image',
          details: error.message
        }
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/images:
 *   get:
 *     summary: Get product images
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product images retrieved successfully
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
 *                     $ref: '#/components/schemas/ProductImage'
 *       404:
 *         description: Product not found
 */
router.get('/:id/images',
  asyncHandler(async (req, res) => {
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

    const images = await uploadService.getProductImages(productId);
    
    res.json({
      success: true,
      data: images
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{productId}/images/{imageId}:
 *   put:
 *     summary: Update product image
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isMain:
 *                 type: boolean
 *                 description: Set as main product image
 *     responses:
 *       200:
 *         description: Image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductImage'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Image not found
 */
router.put('/:productId/images/:imageId',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_ID',
          message: 'Image ID must be a valid number'
        }
      });
    }

    const image = await uploadService.updateProductImage(imageId, req.body, req.user.userId);
    
    res.json({
      success: true,
      data: image
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{productId}/images/{imageId}:
 *   delete:
 *     summary: Delete product image
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
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
 *         description: Image not found
 */
// PATCH endpoint for updating image (set as main)
router.patch('/:productId/images/:imageId',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const imageId = parseInt(req.params.imageId);
    const { isMain } = req.body;
    
    if (isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_ID',
          message: 'Image ID must be a valid number'
        }
      });
    }

    const updatedImage = await uploadService.updateProductImage(imageId, { isMain }, req.user.userId);
    
    res.json({
      success: true,
      data: updatedImage,
      message: 'Image updated successfully'
    });
  })
);

router.delete('/:productId/images/:imageId',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_ID',
          message: 'Image ID must be a valid number'
        }
      });
    }

    await uploadService.deleteProductImage(imageId, req.user.userId);
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/images/reorder:
 *   put:
 *     summary: Reorder product images
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageIds
 *             properties:
 *               imageIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of image IDs in desired order
 *     responses:
 *       200:
 *         description: Images reordered successfully
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
 *                     $ref: '#/components/schemas/ProductImage'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Product not found
 */
router.put('/:id/images/reorder',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);
    const { imageIds } = req.body;
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Product ID must be a valid number'
        }
      });
    }

    if (!Array.isArray(imageIds)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_IDS',
          message: 'imageIds must be an array'
        }
      });
    }

    const images = await uploadService.reorderProductImages(productId, imageIds, req.user.userId);
    
    res.json({
      success: true,
      data: images
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/reviews:
 *   post:
 *     summary: Submit a product review
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Product rating (1-5 stars)
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional review comment
 *     responses:
 *       201:
 *         description: Review submitted successfully
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
 *                     rating:
 *                       type: integer
 *                     comment:
 *                       type: string
 *                     isApproved:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *       400:
 *         description: Validation error or duplicate review
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post('/:id/reviews',
  authenticateToken,
  validateInput(reviewSchema),
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);
    const userId = req.user.id ?? req.user.userId;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Product ID must be a valid number'
        }
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to submit a review'
        }
      });
    }

    try {
      const review = await reviewService.createReview(
        productId,
        userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: review,
        message: 'Review submitted successfully and is pending approval'
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }
      
      if (error.message === 'ORDER_ID_REQUIRED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ORDER_ID_REQUIRED',
            message: 'Order ID is required to submit a review'
          }
        });
      }

      if (error.message === 'COMMENT_REQUIRED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'COMMENT_REQUIRED',
            message: 'Comment is required for ratings 1 to 3'
          }
        });
      }

      if (error.message === 'You have already reviewed this product for this order') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_REVIEW',
            message: 'You have already reviewed this product for this order'
          }
        });
      }

      if (error.message === 'You can only review purchased products') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_PURCHASED',
            message: error.message
          }
        });
      }

      console.error('REVIEW ERROR:', error);
      console.error('MESSAGE:', error.message);
      console.error('STACK:', error.stack);

      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/reviews:
 *   get:
 *     summary: Get product reviews
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: approved
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by approval status
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating (1-5 stars)
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by minimum rating
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, rating, helpful]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         totalReviews:
 *                           type: integer
 *                         ratingDistribution:
 *                           type: object
 *       404:
 *         description: Product not found
 */
router.get('/:id/reviews',
  validateInput(reviewQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
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

    // Check if product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    const [reviewsResult, stats, summary, featuredReviews] = await Promise.all([
      reviewService.getProductReviews(productId, req.query),
      reviewService.getProductRatingStats(productId),
      reviewService.getReviewSummaryByRating(productId),
      reviewService.getFeaturedReviews(productId, 3)
    ]);
    
    res.json({
      success: true,
      data: {
        ...reviewsResult,
        stats,
        summary,
        featuredReviews
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/reviews/summary:
 *   get:
 *     summary: Get product review summary and statistics
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Review summary retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         totalReviews:
 *                           type: integer
 *                         ratingDistribution:
 *                           type: object
 *                         recentReviews:
 *                           type: integer
 *                         qualityScore:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               rating:
 *                                 type: integer
 *                               count:
 *                                 type: integer
 *                               percentage:
 *                                 type: integer
 *                         totalReviews:
 *                           type: integer
 *                     featuredReviews:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Product not found
 */
router.get('/:id/reviews/summary',
  asyncHandler(async (req, res) => {
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

    // Check if product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    const [stats, summary, featuredReviews] = await Promise.all([
      reviewService.getProductRatingStats(productId),
      reviewService.getReviewSummaryByRating(productId),
      reviewService.getFeaturedReviews(productId, 3)
    ]);
    
    res.json({
      success: true,
      data: {
        stats,
        summary,
        featuredReviews
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/shipping-methods:
 *   get:
 *     summary: Get shipping methods for a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Shipping methods retrieved successfully
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
 *       404:
 *         description: Product not found
 */
router.get('/:id/shipping-methods',
  asyncHandler(async (req, res) => {
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

    // Get shipping methods for the product
    const shippingMethodService = require('../../services/shippingMethodService');
    const shippingMethods = await shippingMethodService.getProductShippingMethods(productId);

    res.json({
      success: true,
      data: shippingMethods
    });
  })
);

module.exports = router;