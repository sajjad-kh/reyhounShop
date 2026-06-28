const PaymentTrackingService = require('./paymentTrackingService');
const { PrismaClient } = require('@prisma/client');

const { ActivityAction, EntityType, LogSeverity } = require('@prisma/client');

const prisma = new PrismaClient();

class PaymentService {
  constructor() {
    this.tracking = new PaymentTrackingService();
  }

  async getOrder(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) throw new Error('Order not found');
    return order;
  }

  // ================= INIT PAYMENT =================
  async initiatePayment(data) {
    try {
      const { orderId, amount, reference } = data;

      const order = await this.getOrder(orderId);

      if (order.paymentStatus !== 'PENDING') {
        throw new Error('Order already processed');
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentRef: reference,
        },
      });

      const payment = await this.tracking.createPayment({
        orderId,
        gateway: 'MANUAL',
        amount,
        gatewayRef: reference,
      });

      await prisma.activityLog.create({
        data: {
          userId: order.userId,
          actorType: 'USER',
          action: ActivityAction.PAYMENT_INITIATED,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.INFO,
          metadata: {
            amount,
            reference,
            gateway: 'MANUAL',
          },
        },
      });

      return {
        success: true,
        paymentId: payment.payment?.id,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ================= VERIFY PAYMENT =================
  async verifyPayment(data) {
    try {
      const { orderId, isSuccess } = data;

      const order = await this.getOrder(orderId);

      const status = isSuccess ? 'SUCCESS' : 'FAILED';

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: status,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: order.userId,
          actorType: 'SYSTEM',
          action:
            status === 'SUCCESS'
              ? ActivityAction.PAYMENT_SUCCESS
              : ActivityAction.PAYMENT_FAILED,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity:
            status === 'SUCCESS'
              ? LogSeverity.INFO
              : LogSeverity.ERROR,
          metadata: {
            status,
          },
        },
      });

      return {
        success: true,
        status,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ================= FAIL PAYMENT =================
  async markPaymentFailed(orderId, reason) {
    try {
      const order = await this.getOrder(orderId);

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: order.userId,
          actorType: 'SYSTEM',
          action: ActivityAction.PAYMENT_FAILED,
          entity: EntityType.ORDER,
          entityId: String(orderId),
          severity: LogSeverity.ERROR,
          metadata: {
            reason,
          },
        },
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = PaymentService;