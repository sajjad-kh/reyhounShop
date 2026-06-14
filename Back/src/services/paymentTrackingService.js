const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/logger');

const prisma = new PrismaClient();

class PaymentTrackingService {
  /**
   * Create a payment record for tracking
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.orderId - Order ID
   * @param {string} paymentData.gateway - Payment gateway
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency code
   * @param {string} paymentData.gatewayRef - Gateway reference
   * @param {Object} paymentData.metadata - Additional metadata
   * @returns {Promise<Object>} Created payment record
   */
  async createPayment(paymentData) {
    try {
      const { orderId, gateway, amount, currency = 'IRR', gatewayRef, metadata = {} } = paymentData;

      const payment = await prisma.payment.create({
        data: {
          orderId: orderId,
          gateway: gateway.toUpperCase(),
          amount: amount,
          currency: currency,
          status: 'PENDING',
          gatewayRef: gatewayRef,
          metadata: metadata
        }
      });

      // Create initial payment transaction
      await this.createPaymentTransaction({
        paymentId: payment.id,
        type: 'PAYMENT',
        amount: amount,
        status: 'PENDING',
        gatewayRef: gatewayRef,
        notes: 'Payment initiated'
      });

      // Log payment creation
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        await logActivity(
          order.userId,
          'payment.created',
          'Payment',
          payment.id,
          {
            orderId: orderId,
            gateway: gateway,
            amount: amount,
            gatewayRef: gatewayRef
          }
        );
      }

      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('Create payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update payment status
   * @param {Object} updateData - Update information
   * @param {number} updateData.paymentId - Payment ID
   * @param {string} updateData.status - New payment status
   * @param {string} updateData.gatewayTxnId - Gateway transaction ID
   * @param {string} updateData.failureReason - Failure reason (if failed)
   * @param {Object} updateData.metadata - Additional metadata
   * @returns {Promise<Object>} Update result
   */
  async updatePaymentStatus(updateData) {
    try {
      const { paymentId, status, gatewayTxnId, failureReason, metadata = {} } = updateData;

      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: status,
          gatewayTxnId: gatewayTxnId,
          failureReason: failureReason,
          metadata: metadata,
          updatedAt: new Date()
        },
        include: {
          order: true
        }
      });

      // Create transaction record for status change
      await this.createPaymentTransaction({
        paymentId: paymentId,
        type: 'PAYMENT',
        amount: payment.amount,
        status: status,
        gatewayRef: gatewayTxnId,
        notes: `Payment status updated to ${status}`
      });

      // Log payment status update
      await logActivity(
        payment.order.userId,
        'payment.status_updated',
        'Payment',
        paymentId,
        {
          orderId: payment.orderId,
          oldStatus: 'PENDING', // We could track this better
          newStatus: status,
          gatewayTxnId: gatewayTxnId,
          failureReason: failureReason
        }
      );

      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('Update payment status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a payment transaction record
   * @param {Object} transactionData - Transaction information
   * @param {number} transactionData.paymentId - Payment ID
   * @param {string} transactionData.type - Transaction type
   * @param {number} transactionData.amount - Transaction amount
   * @param {string} transactionData.status - Transaction status
   * @param {string} transactionData.gatewayRef - Gateway reference
   * @param {Object} transactionData.gatewayData - Gateway response data
   * @param {string} transactionData.notes - Additional notes
   * @returns {Promise<Object>} Created transaction record
   */
  async createPaymentTransaction(transactionData) {
    try {
      const { paymentId, type, amount, status, gatewayRef, gatewayData = {}, notes } = transactionData;

      const transaction = await prisma.paymentTransaction.create({
        data: {
          paymentId: paymentId,
          type: type,
          amount: amount,
          status: status,
          gatewayRef: gatewayRef,
          gatewayData: gatewayData,
          notes: notes
        }
      });

      return {
        success: true,
        transaction: transaction
      };
    } catch (error) {
      console.error('Create payment transaction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process refund for a payment
   * @param {Object} refundData - Refund information
   * @param {number} refundData.paymentId - Payment ID
   * @param {number} refundData.amount - Refund amount (optional, full refund if not specified)
   * @param {string} refundData.reason - Refund reason
   * @param {string} refundData.gatewayRef - Gateway refund reference
   * @param {Object} refundData.gatewayData - Gateway response data
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(refundData) {
    try {
      const { paymentId, amount, reason, gatewayRef, gatewayData = {} } = refundData;

      // Get payment details
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'SUCCESS') {
        throw new Error('Cannot refund unsuccessful payment');
      }

      const refundAmount = amount || payment.amount;
      const isPartialRefund = amount && amount < payment.amount;

      // Create refund transaction
      const transaction = await this.createPaymentTransaction({
        paymentId: paymentId,
        type: isPartialRefund ? 'PARTIAL_REFUND' : 'REFUND',
        amount: refundAmount,
        status: 'SUCCESS',
        gatewayRef: gatewayRef,
        gatewayData: gatewayData,
        notes: reason
      });

      // Update payment status if full refund
      if (!isPartialRefund) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED', // Mark as failed since it's fully refunded
            updatedAt: new Date()
          }
        });
      }

      // Log refund
      await logActivity(
        payment.order.userId,
        'payment.refunded',
        'Payment',
        paymentId,
        {
          orderId: payment.orderId,
          refundAmount: refundAmount,
          isPartialRefund: isPartialRefund,
          reason: reason,
          gatewayRef: gatewayRef
        }
      );

      return {
        success: true,
        transaction: transaction.transaction,
        refundAmount: refundAmount,
        isPartialRefund: isPartialRefund
      };
    } catch (error) {
      console.error('Process refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment history for an order
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Payment history
   */
  async getPaymentHistory(orderId) {
    try {
      const payments = await prisma.payment.findMany({
        where: { orderId: orderId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        payments: payments
      };
    } catch (error) {
      console.error('Get payment history error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment statistics
   * @param {Object} filters - Filter options
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @param {string} filters.gateway - Payment gateway
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStatistics(filters = {}) {
    try {
      const { startDate, endDate, gateway } = filters;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate
        };
      }
      if (gateway) {
        whereClause.gateway = gateway.toUpperCase();
      }

      const [totalPayments, successfulPayments, failedPayments, totalAmount, successfulAmount] = await Promise.all([
        prisma.payment.count({ where: whereClause }),
        prisma.payment.count({ where: { ...whereClause, status: 'SUCCESS' } }),
        prisma.payment.count({ where: { ...whereClause, status: 'FAILED' } }),
        prisma.payment.aggregate({
          where: whereClause,
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: { ...whereClause, status: 'SUCCESS' },
          _sum: { amount: true }
        })
      ]);

      const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

      return {
        success: true,
        statistics: {
          totalPayments: totalPayments,
          successfulPayments: successfulPayments,
          failedPayments: failedPayments,
          pendingPayments: totalPayments - successfulPayments - failedPayments,
          successRate: Math.round(successRate * 100) / 100,
          totalAmount: totalAmount._sum.amount || 0,
          successfulAmount: successfulAmount._sum.amount || 0
        }
      };
    } catch (error) {
      console.error('Get payment statistics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle payment retry logic
   * @param {number} paymentId - Payment ID
   * @param {Object} retryData - Retry information
   * @returns {Promise<Object>} Retry result
   */
  async retryPayment(paymentId, retryData = {}) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCESS') {
        throw new Error('Payment already successful');
      }

      // Reset payment status to pending for retry
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PENDING',
          failureReason: null,
          updatedAt: new Date()
        }
      });

      // Create retry transaction record
      await this.createPaymentTransaction({
        paymentId: paymentId,
        type: 'PAYMENT',
        amount: payment.amount,
        status: 'PENDING',
        notes: 'Payment retry initiated'
      });

      // Log retry attempt
      await logActivity(
        payment.order.userId,
        'payment.retry',
        'Payment',
        paymentId,
        {
          orderId: payment.orderId,
          gateway: payment.gateway,
          amount: payment.amount,
          retryData: retryData
        }
      );

      return {
        success: true,
        payment: payment,
        message: 'Payment retry initiated'
      };
    } catch (error) {
      console.error('Retry payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get failed payments for retry processing
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number of results
   * @param {number} options.hoursOld - Minimum hours since failure
   * @returns {Promise<Object>} Failed payments
   */
  async getFailedPayments(options = {}) {
    try {
      const { limit = 50, hoursOld = 1 } = options;
      const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));

      const failedPayments = await prisma.payment.findMany({
        where: {
          status: 'FAILED',
          updatedAt: {
            lte: cutoffTime
          }
        },
        include: {
          order: {
            include: {
              user: true
            }
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'asc' },
        take: limit
      });

      return {
        success: true,
        payments: failedPayments
      };
    } catch (error) {
      console.error('Get failed payments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PaymentTrackingService;