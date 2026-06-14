const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const orderService = require('../../services/orderService');
const { authenticateToken } = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/* =========================================================
   UPLOAD PATHS
========================================================= */

const paymentProofPath = path.join(process.cwd(), 'uploads', 'payment-proofs');
const userFilesPath = path.join(process.cwd(), 'uploads', 'order-files');

[paymentProofPath, userFilesPath].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (file.fieldname === 'paymentProof') {
        return cb(null, paymentProofPath);
      }
      if (file.fieldname === 'userFiles' || file.fieldname === 'referenceImage') {
        return cb(null, userFilesPath);
      }
      return cb(new Error('INVALID_FILE_FIELD'));
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || '');
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);

      let prefix = 'file';
      if (file.fieldname === 'paymentProof') prefix = 'payment';
      if (file.fieldname === 'userFiles' || file.fieldname === 'referenceImage') prefix = 'user-ref';

      cb(null, `${prefix}-${unique}${ext}`);
    } catch (err) {
      cb(err);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 11
  }
});

/* =========================================================
   VALIDATION
========================================================= */

const validateCreateOrder = [
  body('addressId').isInt({ min: 1 }),
  body('shippingMethodId').isInt({ min: 1 }),
  body('discountCode').optional().isString().isLength({ max: 50 }),
  body('designComment').optional().isString().isLength({ max: 5000 })
];

/* =========================================================
   CREATE ORDER
========================================================= */

router.post(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'paymentProof', maxCount: 1 },
    { name: 'userFiles', maxCount: 10 }
  ]),

  (req, res, next) => {
    try {
      req.body.addressId = Number(req.body.addressId || 0);
      req.body.shippingMethodId = Number(req.body.shippingMethodId || 0);

      if (req.body.items && typeof req.body.items === 'string') {
        req.body.items = JSON.parse(req.body.items);
      }

      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: err.message }
      });
    }
  },

  validateCreateOrder,

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array() });
      }

      if (!req.files?.paymentProof?.[0]) {
        return res.status(400).json({
          success: false,
          error: { code: 'PAYMENT_PROOF_REQUIRED' }
        });
      }

      const paymentProof = req.files.paymentProof[0];
      const userFiles = req.files.userFiles || [];

      const paymentProofUrl = `/uploads/payment-proofs/${paymentProof.filename}`;

      const userFileUrls = userFiles.map((f) => ({
        url: `/uploads/order-files/${f.filename}`,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      }));
      console.log("ORDER SERVICeeeeeE =>", orderService);
      const order = await orderService.createOrder({
        userId: req.user.id,
        addressId: req.body.addressId,
        shippingMethodId: req.body.shippingMethodId,
        discountCode: req.body.discountCode,
        items: req.body.items,
        paymentProof: { ...paymentProof, url: paymentProofUrl },
        designComment: req.body.notes,
        userFiles: userFileUrls
      });

      return res.status(201).json({ success: true, data: order });

    } catch (err) {
      console.error('CREATE_ORDER_ERROR:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'ORDER_CREATE_ERROR', message: err.message }
      });
    }
  }
);

/* =========================================================
   GET ORDERS
========================================================= */

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await orderService.getOrdersByUser(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================
   GET ORDER BY ID
========================================================= */

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ORDER_ID' }
      });
    }

    const order = await orderService.getOrderById(orderId, req.user.id);

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================
   SEND DESIGN REVISION REQUEST 
========================================================= */

router.post(
  '/:id/revision',
  authenticateToken,
  upload.fields([{ name: 'referenceImage', maxCount: 3 }]),

  async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { message } = req.body;

      if (!message || message.trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: { code: 'MESSAGE_REQUIRED', message: 'لطفاً متن درخواست تغییر را بنویسید' }
        });
      }

      const files = req.files?.referenceImage || [];

      const attachments = files.map(file => ({
        url: `/uploads/order-files/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }));

      const result = await orderService.sendDesignRevision({
        orderId,
        userId: req.user.id,
        message: message.trim(),
        attachments
      });

      return res.json({
        success: true,
        message: 'درخواست تغییر با موفقیت ثبت شد',
        data: result
      });

    } catch (err) {
      console.error('REVISION_REQUEST_ERROR:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'REVISION_ERROR', message: err.message }
      });
    }
  }
);

router.post(
  '/:id/approve-design',
  authenticateToken,

  async (req, res) => {
    try {
      const orderId = Number(req.params.id);

      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ORDER_ID' }
        });
      }

      // ❌ اینجا دیگه Prisma نمی‌خوایم
      // const prisma = getPrismaClient(); ❌ حذف شد

      // فقط از service استفاده کن
      const order = await orderService.getOrderById(orderId, req.user.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND' }
        });
      }

      // guard ها (با داده سرویس نه prisma)
      if (order.status === 'DESIGN_APPROVED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESIGN_ALREADY_APPROVED',
            message: 'این طرح قبلاً تایید شده است'
          }
        });
      }

      if (order.status !== 'DESIGN_REVIEW') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_STATUS',
            message: 'در این مرحله امکان تایید طرح وجود ندارد'
          }
        });
      }

      const result = await orderService.approveDesign({
        orderId,
        userId: req.user.id
      });

      return res.json({
        success: true,
        message: 'طرح تایید شد',
        data: result
      });

    } catch (err) {
      console.error('APPROVE_DESIGN_ERROR:', err);

      return res.status(500).json({
        success: false,
        error: {
          code: 'APPROVE_DESIGN_ERROR',
          message: err.message || 'Internal error'
        }
      });
    }
  }
);

router.post(
  '/:id/confirm-delivery',
  authenticateToken,
  async (req, res) => {
    try {

      const orderId = Number(req.params.id);

      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_ID'
          }
        });
      }

      const result =
        await orderService.confirmDelivery({
          orderId,
          userId: req.user.id
        });

      return res.json({
        success: true,
        message: 'تحویل سفارش ثبت شد',
        data: result
      });

    } catch (err) {

      console.error(
        'CONFIRM_DELIVERY_ERROR:',
        err
      );

      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIRM_DELIVERY_ERROR',
          message: err.message
        }
      });

    }
  }
);

module.exports = router;