const express = require('express');
const path = require('path');
const Joi = require('joi');
const { authenticateToken } = require('../../middleware/auth');
const { validate } = require('../../utils/validation');
const { asyncPaymentHandler } = require('../../middleware/paymentErrorHandler');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * =========================
 * INITIATE PAYMENT (DISABLED)
 * =========================
 * Payment gateways are disabled in manual transfer system
 */
router.post(
  '/initiate',
  authenticateToken,
  asyncPaymentHandler(async (req, res) => {
    return res.status(400).json({
      success: false,
      message: 'Gateway payments are disabled. Use bank transfer with payment proof upload.'
    });
  })
);

/**
 * =========================
 * VERIFY PAYMENT (DISABLED)
 * =========================
 */
router.post(
  '/verify',
  authenticateToken,
  asyncPaymentHandler(async (req, res) => {
    return res.status(400).json({
      success: false,
      message: 'Manual payment system active. Verification is done by admin.'
    });
  })
);

/**
 * =========================
 * UPLOAD PAYMENT PROOF (NEW CORE FEATURE)
 * =========================
 */
router.post(
  '/upload-proof',
  authenticateToken,
  asyncPaymentHandler(async (req, res) => {
    const { orderId } = req.body;
    const file = req.files?.paymentProof;



    console.log("boooooooody:",req.body)


    if (!orderId || !file) {
      return res.status(400).json({
        success: false,
        message: 'orderId and paymentProof file are required'
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProofUrl: `/uploads/payment-proofs/${path.basename(file.path)}`,
        paymentStatus: 'PENDING',
        paymentRejectionReason: null,
        status: 'PENDING'
      }
    });

    return res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: updated
    });
  })
);

/**
 * =========================
 * ADMIN REVIEW PAYMENT
 * =========================
 * approve / reject payment proof
 */
router.post(
  '/admin/review',
  authenticateToken,
  asyncPaymentHandler(async (req, res) => {
    const { orderId, action } = req.body;

    if (!orderId || !action) {
      return res.status(400).json({
        success: false,
        message: 'orderId and action are required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: Number(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus:
          action === 'approve' ? 'APPROVED' : 'REJECTED',

        status:
          action === 'approve'
            ? 'PROCESSING'
            : 'PAYMENT_FAILED'
      }
    });

    return res.json({
      success: true,
      message: `Payment ${action}d successfully`,
      data: updated
    });
  })
);

/**
 * =========================
 * PAYMENT STATUS CHECK
 * =========================
 */
router.get(
  '/status/:orderId',
  authenticateToken,
  asyncPaymentHandler(async (req, res) => {
    const orderId = Number(req.params.orderId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        status: order.status,
        paymentProofUrl: order.paymentProofUrl
      }
    });
  })
);

/**
 * =========================
 * LEGACY CALLBACKS (NO-OP)
 * =========================
 */
router.get('/callback/:gateway', (req, res) => {
  return res.redirect(
    `${process.env.FRONTEND_URL}/payment-result?mode=manual`
  );
});

/**
 * Stripe webhook disabled
 */
router.post('/webhook/stripe', (req, res) => {
  return res.json({
    success: true,
    message: 'Manual payment mode active - webhook ignored'
  });
});

module.exports = router;