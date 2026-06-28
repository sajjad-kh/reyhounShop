const express = require('express');
const adminService = require('../../../services/adminService');
const orderService = require('../../../services/orderService');
const uploadDesign = require('../../../middleware/uploadDesign');

const {
  OrderStatus,
  PaymentStatus,
  AttachmentType,
  MessageType,
  DesignVersionStatus
} = require('@prisma/client');

const { getPrismaClient } = require('../../../utils/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     summary: Get comprehensive order listing for admin
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, DELAYED]
 *         description: Filter by order status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *         description: Filter by payment status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by tracking code, user name, or email
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
 *         description: Number of orders per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, totalPrice, status]
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
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           trackingCode:
 *                             type: string
 *                           status:
 *                             type: string
 *                           paymentStatus:
 *                             type: string
 *                           totalPrice:
 *                             type: integer
 *                           itemCount:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN']),
  [
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DELAYED', 'PAYMENT_REJECTED']),
    query('paymentStatus').optional().isIn(['PENDING', 'SUCCESS', 'FAILED']),
    query('userId').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'totalPrice', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const result = await adminService.getAdminOrders(req.query);

      // Ensure response always has the correct structure with orders array and pagination
      res.json({
        success: true,
        data: {
          orders: Array.isArray(result.orders) ? result.orders : [],
          pagination: result.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    } catch (error) {
      console.error('Admin orders listing error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve orders'
        }
      });
    }
  }
);

/**
 * Approve / reject offline payment proof uploaded by customer
 */
router.post(
  '/:orderId/payment-review',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID required'),
    body('decision').isIn(['approve', 'reject']).withMessage('decision must be approve or reject'),
    body('rejectionReason').optional().isString().isLength({ max: 2000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const orderId = parseInt(req.params.orderId);
      const { decision, rejectionReason } = req.body;
      const adminId = req.user.id;

      if (decision === 'reject') {
        const r = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
        if (!r.length) {
          return res.status(400).json({
            success: false,
            error: { code: 'REJECTION_REASON_REQUIRED', message: 'rejectionReason is required when rejecting' }
          });
        }
      }

      const order = await orderService.adminReviewPaymentProof(orderId, {
        approve: decision === 'approve',
        rejectionReason: decision === 'reject' ? rejectionReason : undefined
      });

      await adminService.logAdminActivity(adminId, 'order.payment_review', 'Order', orderId, {
        decision,
        rejectionReason: decision === 'reject' ? rejectionReason : undefined
      });

      res.json({
        success: true,
        data: { order }
      });
    } catch (error) {
      const map = {
        ORDER_NOT_FOUND: 404,
        PAYMENT_PROOF_REQUIRED: 400,
        REJECTION_REASON_REQUIRED: 400,
        ORDER_ALREADY_PAID: 400
      };

      console.error('Admin payment review error:', error);
      const code = error.message;
      if (map[code]) {
        return res.status(map[code]).json({
          success: false,
          error: { code }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to review payment'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}:
 *   get:
 *     summary: Get detailed order information for admin
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *       400:
 *         description: Invalid order ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:orderId',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order ID',
            details: errors.array()
          }
        });
      }

      const orderId = parseInt(req.params.orderId);
      
      // Get order details (admin can see any order)
      const [order, timeline] = await Promise.all([
        orderService.getOrderById(orderId),
        orderService.getOrderTimeline(orderId)
      ]);

      res.json({
        success: true,
        data: {
          order,
          timeline
        }
      });
    } catch (error) {
      console.error('Admin order details error:', error);
      
      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve order details'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}:
 *   put:
 *     summary: Update order status and details
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, DELAYED]
 *                 description: New order status
 *               trackingCode:
 *                 type: string
 *                 description: Shipping tracking code (optional)
 *               notes:
 *                 type: string
 *                 description: Admin notes for the status change (optional)
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: Order status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put('/:orderId',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
    body('status')
      .isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DELAYED', 'PAYMENT_REJECTED'])
      .withMessage('Invalid order status'),
    body('trackingCode').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('notes').optional().isString().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
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

      const orderId = parseInt(req.params.orderId);
      const { status, trackingCode, notes } = req.body;
      const adminId = req.user.id;

      // Update order status
      const updatedOrder = await orderService.updateOrderStatus(orderId, status, adminId);

      // Update tracking code if provided
      if (trackingCode && status === 'SHIPPED') {
        await orderService.updateTrackingCode(orderId, trackingCode, adminId);
      }

      // Log admin notes if provided
      if (notes) {
        await adminService.logAdminActivity(adminId, 'order.admin_notes', 'Order', orderId, {
          notes,
          statusChange: status
        });
      }

      res.json({
        success: true,
        data: {
          order: updatedOrder
        },
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Admin order update error:', error);
      
      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      if (error.message === 'INVALID_ORDER_STATUS') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid order status'
          }
        });
      }

      if (error.message === 'INVALID_STATUS_TRANSITION') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: 'Invalid status transition for current order state'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update order'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status only
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, DELAYED]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Order not found
 */
router.patch('/:orderId/status',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
    body('status')
      .isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DELAYED', 'PAYMENT_REJECTED'])
      .withMessage('Invalid order status')
  ],
  async (req, res) => {
    try {
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

      const orderId = parseInt(req.params.orderId);
      const { status } = req.body;
      const adminId = req.user.id;

      // Update order status
      const updatedOrder = await orderService.updateOrderStatus(orderId, status, adminId);

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Admin order status update error:', error);
      
      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      if (error.message === 'INVALID_ORDER_STATUS') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid order status'
          }
        });
      }

      if (error.message === 'INVALID_STATUS_TRANSITION') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: 'Invalid status transition for current order state'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update order status'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/orders/{orderId}/resend-proof:
 *   post:
 *     summary: Resend payment proof for order (User)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional message from user when resending payment proof
 *     responses:
 *       200:
 *         description: Payment proof resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     trackingCode:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: PAYMENT_REVIEW
 *                     paymentStatus:
 *                       type: string
 *                       example: PENDING
 *       400:
 *         description: Invalid request or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     details:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (order does not belong to user)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
/**
 * RESEND PAYMENT PROOF (USER)
 * کاربر دوباره فایل پرداخت یا توضیح می‌فرسته
 */
router.post(
  '/:orderId/resend-proof',
  authenticateToken,
  requireRole(['USER']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
    body('note').optional().isString().isLength({ max: 2000 }).withMessage('Note too long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const orderId = parseInt(req.params.orderId);

      const order = await orderService.resendPaymentProof(orderId, {
        userId: req.user.id,
        note: req.body.note || null
      });

      return res.json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('RESEND_PROOF_ERROR:', error);

      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND' }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN' }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resend payment proof'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}/design:
 *   post:
 *     summary: Upload design file for order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional message for customer
 *     responses:
 *       200:
 *         description: Design uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:orderId/design',
  authenticateToken,
  requireRole(['ADMIN']),

  [
    param('orderId')
      .isInt({ min: 1 })
      .withMessage('Order ID must be a positive integer'),

    body('message')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Message too long')
  ],

  uploadDesign.single('file'),

  async (req, res) => {

    const prisma = getPrismaClient();

    try {

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const orderId = parseInt(req.params.orderId);
      const adminId = req.user.id;

      const messageText =
        req.body.message?.trim() ||
        'طرح جدید ارسال شد';

      // ==================== ORDER ====================

      const order = await prisma.order.findUnique({
        where: {
          id: orderId
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND'
          }
        });
      }

      // 🔒 جلوگیری از آپلود بعد از تایید
      if (order.status === OrderStatus.DESIGN_APPROVED) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESIGN_UPLOAD_LOCKED',
            message: 'امکان ارسال تغییرات بعد از تایید نهایی وجود ندارد'
          }
        });
      }
      // ==================== FILE ====================

      const file = req.file;

      let fileUrl = null;

      if (file) {

        const baseUrl =
          process.env.BASE_URL ||
          `${req.protocol}://${req.get('host')}`;

        fileUrl =
          `${baseUrl}/uploads/designs/${file.filename}`;

      }

      // ==================== TRANSACTION ====================

      const result = await prisma.$transaction(async (tx) => {

        let attachment = null;
        let version = null;

        // =================================================
        // FILE EXISTS
        // =================================================

        if (file && fileUrl) {

          // attachment
          attachment = await tx.orderAttachment.create({
            data: {
              orderId,
              uploadedById: adminId,
              type: 'DESIGN_FILE',
              url: fileUrl,
              originalName: file.originalname,
              mimeType: file.mimetype
            }
          });

          // latest version
          const lastVersion =
            await tx.orderDesignVersion.findFirst({
              where: {
                orderId
              },
              orderBy: {
                version: 'desc'
              }
            });

          const nextVersion =
            (lastVersion?.version || 0) + 1;

          // همه نسخه‌های قبلی non-final
          await tx.orderDesignVersion.updateMany({
            where: {
              orderId
            },
            data: {
              isFinal: false
            }
          });

          // create new version
          version =
            await tx.orderDesignVersion.create({
              data: {
                orderId,
                version: nextVersion,
                designerId: adminId,
                fileUrl,
                status: 'SENT_TO_USER',
                isFinal: false
              }
            });

        }

        // =================================================
        // MESSAGE
        // =================================================

        const message =
          await tx.orderMessage.create({
            data: {
              orderId,
              userId: adminId,
              isAdmin: true,
              type: file
                ? 'DESIGN_SUBMITTED'
                : 'ADMIN_REPLY',
              message: messageText
            }
          });

        // =================================================
        // STATUS UPDATE
        // =================================================

        if (file) {

          await tx.order.update({
            where: {
              id: orderId
            },
            data: {
              status: 'DESIGN_REVIEW'
            }
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              changedById: adminId,
              fromStatus: order.status,
              toStatus: 'DESIGN_REVIEW',
              note: `نسخه ${version.version} طراحی ارسال شد`
            }
          });

        }

        // =================================================
        // ACTIVITY LOG
        // =================================================

        await tx.activityLog.create({
          data: {
            userId: adminId,
            orderId,
            actorType: 'ADMIN',
            action: file
              ? 'DESIGN_UPLOADED'
              : 'SEND_ADMIN_MESSAGE',
            entity: 'ORDER_DESIGN',
            entityId: version?.id,
            details: {
              attachmentId: attachment?.id,
              version: version?.version,
              fileName: file?.originalname || null
            }
          }
        });

        // =================================================
        // NOTIFICATION
        // =================================================

        if (file) {

          await tx.notification.create({
            data: {
              userId: order.userId,
              type: 'ORDER_STATUS_UPDATE',
              channel: 'EMAIL',
              title: 'طرح جدید آماده بررسی است',
              message: `طرح جدید سفارش #${orderId} برای شما ارسال شد`,
              status: 'PENDING'
            }
          });

        }

        return {
          message,
          attachment,
          version
        };

      });

      // ==================== RESPONSE ====================

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {

      console.error(
        'ADMIN_DESIGN_UPLOAD_ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process request'
        }
      });

    }

  }
);

router.post(
  '/:orderId/messages',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }),
    body('message').isString().isLength({ min: 1, max: 2000 })
  ],
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      const message =
        await orderService.createAdminMessage({
          orderId,
          adminId: req.user.id,
          message: req.body.message
        });

      res.json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

router.post(
  '/:orderId/ship',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('orderId').isInt({ min: 1 }),
    body('trackingCode').isString().notEmpty()
  ],
  async (req, res) => {
    try {

      const orderId = Number(req.params.orderId);
      const adminId = req.user.id;

      const result =
        await orderService.shipOrder({
          orderId,
          adminId,
          trackingCode: req.body.trackingCode
        });

      res.json({
        success: true,
        data: result
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error: {
          code: err.message
        }
      });

    }
  }
);

module.exports = router;