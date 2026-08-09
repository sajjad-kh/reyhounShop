const express = require('express');
const { authenticateToken, requireRole, validateInput, asyncHandler } = require('../../middleware');
const inventoryItemService = require('../../services/inventoryItemService');
const Joi = require('joi');

const router = express.Router();

const createSchema = Joi.object({
  name: Joi.string().max(255).required(),
  sku: Joi.string().max(100).optional().allow('', null),
  description: Joi.string().max(1000).optional().allow('', null),
  quantity: Joi.number().integer().min(0).optional(),
  lowStockAlert: Joi.number().integer().min(0).optional(),
  unit: Joi.string().max(50).optional(),
  costPrice: Joi.number().integer().min(0).optional().allow(null),
  sellPrice: Joi.number().integer().min(0).optional().allow(null),
  location: Joi.string().max(255).optional().allow('', null),
  supplier: Joi.string().max(255).optional().allow('', null),
  minOrderQty: Joi.number().integer().min(1).optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  sku: Joi.string().max(100).optional().allow('', null),
  description: Joi.string().max(1000).optional().allow('', null),
  lowStockAlert: Joi.number().integer().min(0).optional(),
  unit: Joi.string().max(50).optional(),
  costPrice: Joi.number().integer().min(0).optional().allow(null),
  sellPrice: Joi.number().integer().min(0).optional().allow(null),
  location: Joi.string().max(255).optional().allow('', null),
  supplier: Joi.string().max(255).optional().allow('', null),
  minOrderQty: Joi.number().integer().min(1).optional(),
  isActive: Joi.boolean().optional(),
});

const adjustSchema = Joi.object({
  type: Joi.string().valid('IN', 'OUT', 'ADJUST', 'RETURN').required(),
  quantity: Joi.number().integer().min(1).required(),
  note: Joi.string().max(500).optional().allow('', null),
});

const querySchema = Joi.object({
  search: Joi.string().max(255).optional(),
  lowStockOnly: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'quantity', 'costPrice', 'sellPrice', 'createdAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// GET /api/v1/inventory-items
router.get('/',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await inventoryItemService.getAll(req.query);
    res.json({ success: true, data: result });
  })
);

// GET /api/v1/inventory-items/stats
router.get('/stats',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const stats = await inventoryItemService.getStats();
    res.json({ success: true, data: stats });
  })
);

// GET /api/v1/inventory-items/:id
router.get('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const item = await inventoryItemService.getById(parseInt(req.params.id));
    res.json({ success: true, data: item });
  })
);

// GET /api/v1/inventory-items/:id/movements
router.get('/:id/movements',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await inventoryItemService.getMovements(parseInt(req.params.id), { page, limit });
    res.json({ success: true, data: result });
  })
);

// POST /api/v1/inventory-items
router.post('/',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(createSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryItemService.create(req.body);
    res.status(201).json({ success: true, data: item });
  })
);

// PUT /api/v1/inventory-items/:id
router.put('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(updateSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryItemService.update(parseInt(req.params.id), req.body);
    res.json({ success: true, data: item });
  })
);

// POST /api/v1/inventory-items/:id/adjust
router.post('/:id/adjust',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(adjustSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryItemService.adjustQuantity(parseInt(req.params.id), {
      ...req.body,
      userId: req.user.userId,
    });
    res.json({ success: true, data: item });
  })
);

// DELETE /api/v1/inventory-items/:id
router.delete('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    await inventoryItemService.delete(parseInt(req.params.id));
    res.json({ success: true, data: null });
  })
);

module.exports = router;
