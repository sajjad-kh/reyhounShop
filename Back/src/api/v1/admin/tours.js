const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { validate } = require('../../../utils/validation');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * =========================
 * VALIDATION SCHEMA
 * =========================
 */
const tourStepSchema = Joi.object({
  page: Joi.string().max(50).required(),
  selector: Joi.string().max(1000).required(),
  title: Joi.string().max(150).required(),
  description: Joi.string().max(1000).required(),
  order: Joi.number().integer().min(1).default(1),
  placement: Joi.string().valid('top', 'bottom', 'left', 'right', 'auto').default('bottom'),
  isActive: Joi.boolean().default(true),
});

/**
 * =========================
 * ADMIN + USER - GET ALL STEPS
 * =========================
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  async (req, res) => {
    try {
      const steps = await prisma.tourStep.findMany({
        orderBy: [{ page: 'asc' }, { order: 'asc' }],
      });

      res.json({
        success: true,
        data: steps,
      });
    } catch (error) {
      console.error('Get tour steps error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tour steps',
      });
    }
  }
);

/**
 * =========================
 * ADMIN - CREATE STEP
 * =========================
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['ADMIN']),
  validate(tourStepSchema),
  async (req, res) => {
    try {
      const step = await prisma.tourStep.create({
        data: req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Tour step created successfully',
        data: step,
      });
    } catch (error) {
      console.error('Create tour step error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create tour step',
      });
    }
  }
);

/**
 * =========================
 * ADMIN - UPDATE STEP
 * =========================
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validate(tourStepSchema),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const updated = await prisma.tourStep.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        message: 'Tour step updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Update tour step error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tour step',
      });
    }
  }
);

/**
 * =========================
 * ADMIN - DELETE STEP
 * =========================
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await prisma.tourStep.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Tour step deleted successfully',
      });
    } catch (error) {
      console.error('Delete tour step error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tour step',
      });
    }
  }
);

/**
 * =========================
 * PUBLIC - ACTIVE STEPS FOR A PAGE
 * =========================
 * ⚠️ مهم: بدون نیاز به احراز هویت - سمت یوزر تور رو نمایش می‌دهد
 */
router.get('/active', async (req, res) => {
  try {
    const page = typeof req.query.page === 'string' ? req.query.page : '';

    const steps = await prisma.tourStep.findMany({
      where: { isActive: true, page },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        page: true,
        selector: true,
        title: true,
        description: true,
        order: true,
        placement: true,
      },
    });

    res.json({
      success: true,
      data: steps,
    });
  } catch (error) {
    console.error('Get active tour steps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tour steps',
    });
  }
});

module.exports = router;
