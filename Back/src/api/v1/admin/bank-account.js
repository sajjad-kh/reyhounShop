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
const bankAccountSchema = Joi.object({
  bankName: Joi.string().max(100).required(),
  holderName: Joi.string().max(150).required(),
  cardNumber: Joi.string().min(10).max(32).required(),
  sheba: Joi.string().min(24).max(34).required(),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().integer().min(1).default(1),
});

/**
 * =========================
 * ADMIN - GET ALL ACCOUNTS
 * =========================
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  async (req, res) => {
    try {
      const isAdmin = req.user.role === 'ADMIN';

      // ================= ADMIN =================
      if (isAdmin) {
        const accounts = await prisma.bankAccount.findMany({
          orderBy: { priority: 'asc' },
        });

        return res.json({
          success: true,
          data: accounts,
        });
      }

      // ================= USER =================
      const primaryAccount = await prisma.bankAccount.findFirst({
        where: { isActive: true },
        orderBy: { priority: 'asc' }, // کمترین عدد = اولویت بیشتر
      });

      return res.json({
        success: true,
        data: primaryAccount ? [primaryAccount] : [],
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to get bank accounts',
      });
    }
  }
);


/**
 * =========================
 * ADMIN - CREATE ACCOUNT
 * =========================
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['ADMIN']),
  validate(bankAccountSchema),
  async (req, res) => {
    try {
      const account = await prisma.bankAccount.create({
        data: req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Bank account created successfully',
        data: account,
      });
    } catch (error) {
      console.error('Create bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bank account',
      });
    }
  }
);

/**
 * =========================
 * ADMIN - UPDATE ACCOUNT
 * =========================
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validate(bankAccountSchema),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const updated = await prisma.bankAccount.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        message: 'Bank account updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Update bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bank account',
      });
    }
  }
);

/**
 * =========================
 * ADMIN - DELETE ACCOUNT
 * =========================
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await prisma.bankAccount.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Bank account deleted successfully',
      });
    } catch (error) {
      console.error('Delete bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete bank account',
      });
    }
  }
);

/**
 * =========================
 * USER - ACTIVE ACCOUNTS
 * =========================
 * ⚠️ مهم: این endpoint باید قبل از auth admin هم قابل استفاده باشه
 */
router.get('/active', async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        bankName: true,
        holderName: true,
        cardNumber: true,
        sheba: true,
      },
    });

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Get active bank accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bank accounts',
    });
  }
});

module.exports = router;