const express = require('express');
const { authenticateToken, requireRole, validateInput, asyncHandler } = require('../../middleware');
const inventoryItemService = require('../../services/inventoryItemService');
const Joi = require('joi');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// POST /api/v1/inventory-items/import
router.post('/import',
  authenticateToken,
  requireRole(['ADMIN']),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'فایل ارسال نشد' } });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return res.status(400).json({ error: { code: 'INVALID_FILE', message: 'فرمت فایل معتبر نیست (xlsx, xls, csv)' } });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ error: { code: 'EMPTY_FILE', message: 'فایل خالی است' } });
    }

    const columnMap = {
      'name': 'name', 'نام': 'name', 'نام کالا': 'name',
      'sku': 'sku', 'کد': 'sku', 'کد کالا': 'sku',
      'quantity': 'quantity', 'تعداد': 'quantity', 'موجودی': 'quantity',
      'unit': 'unit', 'واحد': 'unit',
      'costPrice': 'costPrice', 'قیمت خرید': 'costPrice', 'قیمت تمام شده': 'costPrice',
      'sellPrice': 'sellPrice', 'قیمت فروش': 'sellPrice', 'قیمت': 'sellPrice',
      'lowStockAlert': 'lowStockAlert', 'حد هشدار': 'lowStockAlert',
      'location': 'location', 'محل': 'location', 'انبار': 'location',
      'supplier': 'supplier', 'تامین کننده': 'supplier', 'فروشنده': 'supplier',
      'description': 'description', 'توضیحات': 'description',
      'minOrderQty': 'minOrderQty', 'حداقل سفارش': 'minOrderQty',
    };

    const parsedItems = [];
    const parseErrors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = {};
      for (const [key, value] of Object.entries(row)) {
        const normalized = columnMap[key.trim()];
        if (normalized) mapped[normalized] = value;
      }

      if (!mapped.name || String(mapped.name).trim() === '') {
        parseErrors.push({ row: i + 1, name: row['name'] || row['نام'] || '', error: 'نام الزامی است' });
        continue;
      }

      parsedItems.push({
        name: String(mapped.name).trim(),
        sku: mapped.sku ? String(mapped.sku).trim() : null,
        quantity: mapped.quantity ? parseInt(mapped.quantity) || 0 : 0,
        unit: mapped.unit ? String(mapped.unit).trim() : 'عدد',
        costPrice: mapped.costPrice ? parseInt(mapped.costPrice) || null : null,
        sellPrice: mapped.sellPrice ? parseInt(mapped.sellPrice) || null : null,
        lowStockAlert: mapped.lowStockAlert ? parseInt(mapped.lowStockAlert) || 5 : 5,
        location: mapped.location ? String(mapped.location).trim() : null,
        supplier: mapped.supplier ? String(mapped.supplier).trim() : null,
        description: mapped.description ? String(mapped.description).trim() : null,
        minOrderQty: mapped.minOrderQty ? parseInt(mapped.minOrderQty) || 1 : 1,
      });
    }

    // Confirm mode: import selected items
    if (req.body.confirm === 'true' && req.body.items) {
      const selectedItems = JSON.parse(req.body.items);
      const result = await inventoryItemService.bulkCreate(selectedItems);
      return res.json({ success: true, data: { ...result, parseErrors } });
    }

    // Preview mode: check duplicates
    const itemsWithDuplicates = await inventoryItemService.findDuplicates(parsedItems);

    res.json({
      success: true,
      data: {
        items: itemsWithDuplicates,
        parseErrors,
        totalRows: rows.length,
        validRows: parsedItems.length,
      },
    });
  })
);

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
const adjustErrorMessages = {
  INSUFFICIENT_STOCK: { message: 'موجودی کافی نیست', status: 400 },
  INVALID_TYPE: { message: 'نوع عملیات نامعتبر است', status: 400 },
  INVALID_QUANTITY: { message: 'تعداد معتبر وارد کنید', status: 400 },
  NOT_FOUND: { message: 'آیتم موجودی یافت نشد', status: 404 },
};

router.post('/:id/adjust',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(adjustSchema),
  asyncHandler(async (req, res) => {
    try {
      const item = await inventoryItemService.adjustQuantity(parseInt(req.params.id), {
        ...req.body,
        userId: req.user.userId,
      });
      res.json({ success: true, data: item });
    } catch (err) {
      const errorInfo = adjustErrorMessages[err.message];
      if (errorInfo) {
        return res.status(errorInfo.status).json({
          error: { code: err.message, message: errorInfo.message }
        });
      }
      throw err;
    }
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
