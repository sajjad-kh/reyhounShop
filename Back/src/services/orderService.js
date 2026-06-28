const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const getPrismaClient = () => prisma;

const {
  ActivityAction,
  EntityType,
  LogSeverity,
} = require('@prisma/client');

const cartService = require('./cartService');
const shippingMethodService = require('./shippingMethodService');
const OrderFormatter = require('../formatters/orderFormatter');
const adminService = require('./adminService');

const {
  OrderStatus,
  PaymentStatus,
  AttachmentType,
  MessageType,
  DesignVersionStatus,
} = require('@prisma/client');

class OrderService {

  // =========================================================
  // GET ORDER BY ID
  // =========================================================
  async getOrderById(orderId, userId = null) {
    const prisma = getPrismaClient();

    const id = Number(orderId);
    if (!id || isNaN(id)) throw new Error('INVALID_ORDER_ID');

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { images: true } } } },
        messages: { include: { user: true, attachments: true }, orderBy: { createdAt: 'asc' } },
        designFiles: true,
        designVersions: { include: { designer: true }, orderBy: { createdAt: 'asc' } },
        statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'asc' } },
        activityLogs: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        attachments: true
      }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (userId && order.userId !== Number(userId)) throw new Error('FORBIDDEN');

    let reviewedProductIds = [];
    if (userId) {
      const orderReviews = await prisma.review.findMany({
        where: {
          orderId: id,
          userId: Number(userId)
        },
        select: { productId: true }
      });
      reviewedProductIds = orderReviews.map(r => r.productId);
    }

    return {
      ...OrderFormatter.format(order),
      timeline: adminService.buildOrderTimeline(order),
      reviewedProductIds
    };
  }

  // =========================================================
  // GET ORDERS BY USER
  // =========================================================
  async getOrdersByUser(userId) {
    const prisma = getPrismaClient();

    const orders = await prisma.order.findMany({
      where: { userId: Number(userId) },
      include: {
        items: { include: { product: { include: { images: true } } } },
        messages: { include: { user: true, attachments: true }, orderBy: { createdAt: 'asc' } },
        designFiles: true,
        designVersions: { include: { designer: true }, orderBy: { createdAt: 'asc' } },
        statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'asc' } },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders.map(o => this.formatOrder(o));
  }

  // =========================================================
  // FORMAT ORDER
  // =========================================================
  formatOrder(order) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const normalize = (p) =>
      !p ? null : p.startsWith('http') ? p : `${baseUrl}${p}`;

    const paymentReceipt = order.attachments?.find(a =>
      a.type === AttachmentType.PAYMENT_RECEIPT
    );

    const designFiles = order.attachments?.filter(a =>
      a.type === AttachmentType.REFERENCE_IMAGE
    ) || [];

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentRejectionReason: order.paymentRejectionReason || null,
      totalPrice: order.totalPrice || 0,
      shippingCost: order.shippingCost || 0,
      discountAmount: order.discountAmount || 0,

      paymentProofUrl: paymentReceipt ? normalize(paymentReceipt.url) : null,

      designFiles: designFiles.map(f => ({
        id: f.id,
        url: normalize(f.url),
        originalName: f.originalName,
        mimeType: f.mimeType
      })),

      messages: (order.messages || []).map(m => ({
        id: m.id,
        type: m.type,
        message: m.message,
        isAdmin: m.isAdmin,
        createdAt: m.createdAt,
        user: m.user
          ? { id: m.user.id, name: m.user.name, role: m.user.role }
          : null
      })),

      designVersions: (order.designVersions || []).map(v => ({
        id: v.id,
        version: v.version,
        fileUrl: normalize(v.fileUrl),
        status: v.status,
        isFinal: v.isFinal,
        createdAt: v.createdAt,
        designer: v.designer
          ? { id: v.designer.id, name: v.designer.name }
          : null
      })),

      statusHistory: (order.statusHistory || []).map(s => ({
        id: s.id,
        fromStatus: s.fromStatus,
        toStatus: s.toStatus,
        note: s.note,
        createdAt: s.createdAt,
        changedBy: s.changedBy
          ? { id: s.changedBy.id, name: s.changedBy.name }
          : null
      })),

      createdAt: order.createdAt,

      items: (order.items || []).map(i => ({
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        product: {
          id: i.product.id,
          name: i.product.name,
          image: i.product.images?.[0]?.url || null,
          images: i.product.images?.map(img => img.url) || []
        }
      }))
    };
  }

  // =========================================================
  // APPROVE DESIGN (FIXED)
  // =========================================================
  async approveDesign({ orderId, userId }) {
    const prisma = getPrismaClient();

    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), userId: Number(userId) },
      include: { designVersions: true }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');
    
    const blockedStatuses = [
      OrderStatus.DESIGN_APPROVED
    ];

    if (blockedStatuses.includes(order.status)) {
      throw new Error('DESIGN_UPLOAD_LOCKED');
    }
    const latest = order.designVersions
      ?.sort((a, b) => b.version - a.version)[0];

    if (!latest) throw new Error('NO_DESIGN');

    await prisma.$transaction(async (tx) => {

      await tx.orderDesignVersion.update({
        where: { id: latest.id },
        data: {
          status: DesignVersionStatus.APPROVED,
          isFinal: true
        }
      });

      await tx.order.update({
        where: { id: Number(orderId) },
        data: {
          status: OrderStatus.DESIGN_APPROVED
        }
      });


      await tx.activityLog.create({
        data: {
          userId: Number(userId),
          actorType: 'USER',
          action: ActivityAction.DESIGN_APPROVED,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.INFO,
          metadata: {
            orderStatus: OrderStatus.DESIGN_APPROVED,
            versionId: latest.id
          }
        }
      });


      // ✅ FIX: correct enum usage
      await tx.orderStatusHistory.create({
        data: {
          orderId: Number(orderId),
          changedById: Number(userId),
          fromStatus: OrderStatus.DESIGN_REVIEW,
          toStatus: OrderStatus.DESIGN_APPROVED,
          note: 'Approved by user'
        }
      });

      await tx.orderMessage.create({
        data: {
          orderId: Number(orderId),
          userId: Number(userId),
          isAdmin: false,
          type: MessageType.DESIGN_APPROVED,
          message: 'Design approved'
        }
      });
    });

    return {
      success: true,
      orderId,
      status: OrderStatus.DESIGN_APPROVED
    };
  }

  // =========================================================
  // ADMIN REVIEW PAYMENT PROOF
  // =========================================================
  async adminReviewPaymentProof(orderId, data, adminId) {
    const prisma = getPrismaClient();

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { attachments: true }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');

    const paymentReceipt = order.attachments?.find(a =>
      a.type === AttachmentType.PAYMENT_RECEIPT
    );

    if (!paymentReceipt) throw new Error('PAYMENT_PROOF_REQUIRED');

    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      throw new Error('ORDER_ALREADY_PAID');
    }

    if (data.approve) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          status: OrderStatus.INFO,
          paymentRejectionReason: null
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: adminId, // اگر داری
          targetUserId: order.userId,
          actorType: 'ADMIN',
          action: ActivityAction.PAYMENT_SUCCESS,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.INFO
        }
      });

    } else {
      if (!data.rejectionReason?.trim()) {
        throw new Error('REJECTION_REASON_REQUIRED');
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          paymentRejectionReason: data.rejectionReason
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: order.userId,
          actorType: 'ADMIN',
          action: ActivityAction.PAYMENT_FAILED,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.WARNING,
          metadata: {
            reason: data.rejectionReason
          }
        }
      });
    }

    return this.getOrderById(order.id);
  }

  async createOrder({
    userId,
    addressId,
    shippingMethodId,
    items,
    paymentProof,
    designComment,
    userFiles,
    discountCode
  }) {

    const prisma = getPrismaClient();

    if (!items || !items.length) {
      throw new Error('EMPTY_CART');
    }

    return await prisma.$transaction(async (tx) => {

      let totalPrice = 0;

      // normalize items
      const normalizedItems = items.map(item => ({
        productId: Number(
          item.productId || item.product?.id
        ),
        quantity: Number(item.quantity)
      }));

      // strict validation
      const invalidItem = normalizedItems.find(item => {
        return (
          !Number.isInteger(item.productId) ||
          item.productId <= 0 ||

          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        );
      });

      if (invalidItem) {
        throw new Error('INVALID_ORDER_ITEM');
      }

      // validate address ownership
      const address = await tx.address.findFirst({
        where: {
          id: Number(addressId),
          userId: Number(userId)
        }
      });

      if (!address) {
        throw new Error('ADDRESS_NOT_FOUND');
      }

      // merge duplicate products
      const mergedItemsMap = new Map();

      for (const item of normalizedItems) {

        const existing =
          mergedItemsMap.get(item.productId);

        if (existing) {

          existing.quantity += item.quantity;

        } else {

          mergedItemsMap.set(
            item.productId,
            { ...item }
          );

        }

      }

      const mergedItems = Array.from(
        mergedItemsMap.values()
      );

      const productIds = mergedItems.map(
        i => i.productId
      );

      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          }
        }
      });

      const enrichedItems = mergedItems.map(item => {

        const product = products.find(
          p => p.id === item.productId
        );

        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        // real available stock
        const availableStock =
          product.stock - product.reservedStock;

        if (availableStock < item.quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        const price =
          product.discountPrice ?? product.price;

        totalPrice += price * item.quantity;

        return {
          productId: product.id,
          quantity: item.quantity,
          price
        };
      });

      // shipping
      const shipping = await tx.shippingMethod.findUnique({
        where: {
          id: Number(shippingMethodId)
        }
      });

      if (!shipping) {
        throw new Error('SHIPPING_METHOD_NOT_FOUND');
      }

      const shippingCost = shipping.baseCost || 0;

      // reserve stock
      for (const item of mergedItems) {

        await tx.product.update({
          where: {
            id: item.productId
          },
          data: {
            reservedStock: {
              increment: item.quantity
            }
          }
        });

      }

      // create order
      const order = await tx.order.create({
        data: {
          trackingCode:
            'EC' + Date.now(),

          userId: Number(userId),
          addressId: Number(addressId),
          shippingMethodId: Number(shippingMethodId),

          totalPrice: totalPrice + shippingCost,
          shippingCost,

          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,

          items: {
            create: enrichedItems
          },

          attachments: {
            create: [

              paymentProof
                ? {
                    type: AttachmentType.PAYMENT_RECEIPT,
                    url: paymentProof.url,
                    originalName:
                      paymentProof.originalname || null,
                    mimeType:
                      paymentProof.mimetype || null,
                    uploadedById: Number(userId)
                  }
                : null,

              ...(userFiles || []).map(file => ({
                type: AttachmentType.REFERENCE_IMAGE,
                url: file.url,
                originalName: file.originalname || null,
                mimeType: file.mimetype || null,
                uploadedById: Number(userId)
              }))

            ].filter(Boolean)
          },

          messages: designComment
            ? {
                create: {
                  userId: Number(userId),
                  isAdmin: false,
                  type: MessageType.INITIAL_NOTE,
                  message: designComment
                }
              }
            : undefined,

          statusHistory: {
            create: {
              toStatus: OrderStatus.PENDING_PAYMENT,
              changedById: Number(userId),
              note: 'Order created'
            }
          }
        },

        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true
                }
              }
            }
          },

          attachments: true,
          messages: true,
          statusHistory: true
        }
      });

      await tx.activityLog.create({
        data: {
          userId: Number(userId),
          actorType: 'USER',
          action: ActivityAction.ORDER_CREATED,
          entity: EntityType.ORDER,
          entityId: String(order.id),
          severity: LogSeverity.INFO,
          metadata: {
            totalPrice: totalPrice + shippingCost,
            shippingCost,
            itemCount: mergedItems.length
          }
        }
      });


      // clear purchased items from cart

      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: Number(userId)
          },

          productId: {
            in: mergedItems.map(i => i.productId)
          }
        }
      });


      return this.formatOrder(order);
    });
  }

  // =========================================================
  // SEND DESIGN REVISION (USER MESSAGE + FILES)
  // =========================================================
  async sendDesignRevision({
    orderId,
    userId,
    message,
    attachments = []
  }) {
    const prisma = getPrismaClient();

    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        userId: Number(userId)
      }
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    if (!message?.trim() && (!attachments || attachments.length === 0)) {
      throw new Error('EMPTY_REVISION');
    }

    return await prisma.$transaction(async (tx) => {

      // 1. create message
      const createdMessage = await tx.orderMessage.create({
        data: {
          orderId: Number(orderId),
          userId: Number(userId),
          isAdmin: false,
          type: MessageType.DESIGN_FEEDBACK,
          message: message?.trim() || ''
        }
      });

      // 2. attach files (if any)
      if (attachments?.length) {

        await tx.orderAttachment.createMany({
          data: attachments.map(file => ({
            orderId: Number(orderId),
            messageId: createdMessage.id,
            uploadedById: Number(userId),
            type: AttachmentType.REFERENCE_IMAGE,
            url: file.url,
            originalName: file.originalname || null,
            mimeType: file.mimetype || null
          }))
        });
      }

      await tx.activityLog.create({
        data: {
          userId: Number(userId),
          actorType: 'USER',
          action: ActivityAction.DESIGN_REVISION,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.INFO,
          metadata: {
            hasMessage: !!message,
            attachmentCount: attachments.length
          }
        }
      });

      return {
        success: true,
        message: "درخواست تغییر با موفقیت ثبت شد",
        data: createdMessage
      };
    });
  }

  async shipOrder({
    orderId,
    adminId,
    trackingCode
  }) {

    const prisma = getPrismaClient();

    return prisma.$transaction(async tx => {

      const order =
        await tx.order.findUnique({
          where: { id: orderId }
        });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const updated =
        await tx.order.update({
          where: {
            id: orderId
          },
          data: {
            status: OrderStatus.SHIPPED,
            trackingCode
          }
        });

        await tx.activityLog.create({
          data: {
            userId: adminId,
            targetUserId: order.userId,
            actorType: 'ADMIN',
            action: ActivityAction.ORDER_STATUS_CHANGED,
            entity: EntityType.ORDER,
            entityId: String(orderId),
            severity: LogSeverity.INFO,
            metadata: {
              from: order.status,
              to: OrderStatus.SHIPPED,
              trackingCode
            }
          }
        });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          changedById: adminId,
          fromStatus: order.status,
          toStatus: OrderStatus.SHIPPED,
          note: `ارسال شد - ${trackingCode}`
        }
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER_STATUS_UPDATE',
          channel: 'EMAIL',
          title: 'سفارش ارسال شد',
          message: `سفارش شما ارسال شد. کد رهگیری: ${trackingCode}`
        }
      });

      return updated;
    });
  }

  async confirmDelivery({
    orderId,
    userId
  }) {

    const prisma = getPrismaClient();

    return prisma.$transaction(async tx => {

      const order =
        await tx.order.findFirst({
          where: {
            id: Number(orderId),
            userId: Number(userId)
          }
        });

      if (!order) {
        throw new Error(
          'ORDER_NOT_FOUND'
        );
      }

      if (
        order.status !==
        OrderStatus.SHIPPED
      ) {
        throw new Error(
          'INVALID_ORDER_STATUS'
        );
      }

      const updated =
        await tx.order.update({
          where: {
            id: Number(orderId)
          },
          data: {
            status:
              OrderStatus.DELIVERED
          }
        });

        await tx.activityLog.create({
          data: {
            userId: Number(userId),
            actorType: 'USER',
            action: ActivityAction.ORDER_STATUS_CHANGED,
            entity: EntityType.ORDER,
            entityId: String(orderId),
            severity: LogSeverity.INFO,
            metadata: {
              from: OrderStatus.SHIPPED,
              to: OrderStatus.DELIVERED
            }
          }
        });


      await tx.orderStatusHistory.create({
        data: {
          orderId: Number(orderId),
          changedById: Number(userId),
          fromStatus:
            OrderStatus.SHIPPED,
          toStatus:
            OrderStatus.DELIVERED,
          note:
            'Confirmed by customer'
        }
      });

      return updated;

    });
  }

}

module.exports = new OrderService();