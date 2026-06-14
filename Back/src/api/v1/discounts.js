const express = require('express');
const discountService = require('../../services/discountService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { activityLogger } = require('../../middleware/logging');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Discount:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         type:
 *           type: string
 *           enum: [PERCENT, FIXED]
 *         value:
 *           type: integer
 *         minPurchase:
 *           type: integer
 *         maxUses:
 *           type: integer
 *         usedCount:
 *           type: integer
 *         applicableTo:
 *           type: string
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/discounts:
 *   post:
 *     summary: Create a new discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERCENT, FIXED]
 *               value:
 *                 type: integer
 *               minPurchase:
 *                 type: integer
 *               maxUses:
 *                 type: integer
 *               applicableTo:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Discount created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 */
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase,
      maxUses,
      applicableTo,
      expiresAt
    } = req.body;

    // Validation
    if (!code || !type || !value) {
      return res.status(400).json({
        error: 'Code, type, and value are required'
      });
    }

    if (!['PERCENT', 'FIXED'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be PERCENT or FIXED'
      });
    }

    const discount = await discountService.createDiscount({
      code,
      type,
      value: parseInt(value),
      minPurchase: minPurchase ? parseInt(minPurchase) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      applicableTo,
      expiresAt
    });

    // Log activity
    await activityLogger(
      'discount.created',
      'Discount',
      discount.id,
      { code: discount.code, type: discount.type, value: discount.value },
      req
    );

    res.status(201).json(discount);
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(400).json({
      error: error.message || 'Failed to create discount'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts:
 *   get:
 *     summary: Get all discount codes
 *     tags: [Discounts]
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
 *           default: 20
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PERCENT, FIXED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: expired
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *                 pagination:
 *                   type: object
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      type,
      search,
      expired
    } = req.query;

    const filters = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (type) filters.type = type;
    if (search) filters.search = search;
    if (expired !== undefined) filters.expired = expired === 'true';

    const result = await discountService.getDiscounts(
      filters,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({
      error: 'Failed to fetch discounts'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   get:
 *     summary: Get discount by ID
 *     tags: [Discounts]
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
 *         description: Discount details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 */
router.get('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await discountService.getDiscountById(id);
    res.json(discount);
  } catch (error) {
    console.error('Error fetching discount:', error);
    if (error.message === 'Discount not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Failed to fetch discount'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   put:
 *     summary: Update discount
 *     tags: [Discounts]
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
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERCENT, FIXED]
 *               value:
 *                 type: integer
 *               minPurchase:
 *                 type: integer
 *               maxUses:
 *                 type: integer
 *               applicableTo:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Discount updated successfully
 */
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate type if provided
    if (updateData.type && !['PERCENT', 'FIXED'].includes(updateData.type)) {
      return res.status(400).json({
        error: 'Type must be PERCENT or FIXED'
      });
    }

    const discount = await discountService.updateDiscount(id, updateData);

    // Log activity
    await activityLogger(
      'discount.updated',
      'Discount',
      discount.id,
      { code: discount.code, changes: updateData },
      req
    );

    res.json(discount);
  } catch (error) {
    console.error('Error updating discount:', error);
    if (error.message === 'Discount not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({
      error: error.message || 'Failed to update discount'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   delete:
 *     summary: Delete discount (soft delete)
 *     tags: [Discounts]
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
 *         description: Discount deleted successfully
 */
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await discountService.deleteDiscount(id);

    // Log activity
    await activityLogger(
      'discount.deleted',
      'Discount',
      discount.id,
      { code: discount.code },
      req
    );

    res.json({
      message: 'Discount deleted successfully',
      discount
    });
  } catch (error) {
    console.error('Error deleting discount:', error);
    if (error.message === 'Discount not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Failed to delete discount'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts/validate/{code}:
 *   post:
 *     summary: Validate discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderTotal:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discount validation result
 */
router.post('/validate/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const { orderTotal = 0 } = req.body;

    const validation = await discountService.validateDiscount(
      code,
      orderTotal,
      req.user.id
    );

    if (validation.valid) {
      const discountAmount = discountService.calculateDiscountAmount(
        validation.discount,
        orderTotal
      );

      res.json({
        valid: true,
        discount: validation.discount,
        discountAmount,
        finalTotal: orderTotal - discountAmount
      });
    } else {
      res.json(validation);
    }
  } catch (error) {
    console.error('Error validating discount:', error);
    res.status(500).json({
      error: 'Failed to validate discount'
    });
  }
});

/**
 * @swagger
 * /api/v1/discounts/stats:
 *   get:
 *     summary: Get discount statistics
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discount statistics
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const stats = await discountService.getDiscountStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching discount stats:', error);
    res.status(500).json({
      error: 'Failed to fetch discount statistics'
    });
  }
});

module.exports = router;