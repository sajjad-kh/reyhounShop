const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PaymentTrackingService {
  async createPayment({
    orderId,
    gateway,
    amount,
    gatewayRef
  }) {
    try {
      const payment = await prisma.payment.create({
        data: {
          orderId,
          gateway,
          amount,
          gatewayRef,
          status: 'PENDING'
        }
      });

      return {
        success: true,
        payment
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePaymentStatus({
    paymentId,
    status,
    transactionId
  }) {
    try {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          transactionId
        }
      });

      return {
        success: true,
        payment
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPaymentHistory(orderId) {
    try {
      const payments = await prisma.payment.findMany({
        where: { orderId },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        payments
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PaymentTrackingService;