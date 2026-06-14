const ZarinpalService = require('./paymentGateways/zarinpalService');
const StripeService = require('./paymentGateways/stripeService');
const PayirService = require('./paymentGateways/payirService');
const PaymentTrackingService = require('./paymentTrackingService');
const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/logger');

const prisma = new PrismaClient();

class PaymentService {
  constructor() {
    this.zarinpal = new ZarinpalService();
    this.stripe = new StripeService();
    this.payir = new PayirService();
    this.tracking = new PaymentTrackingService();
  }

  /**
   * Initiate payment based on gateway type
   * @param {Object} paymentData - Payment information
   * @param {string} paymentData.gateway - Payment gateway ('zarinpal', 'stripe', 'payir')
   * @param {number} paymentData.orderId - Order ID
   * @param {number} paymentData.amount - Amount
   * @param {string} paymentData.currency - Currency (for Stripe)
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Callback URL
   * @param {Object} paymentData.customerInfo - Customer information
   * @returns {Promise<Object>} Payment initiation result
   */
  async initiatePayment(paymentData) {
    try {
      const { gateway, orderId, amount, currency, description, callbackUrl, customerInfo } = paymentData;

      // Validate order exists and is in correct state
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus !== 'PENDING') {
        throw new Error('Order payment already processed or failed');
      }

      let result;
      
      switch (gateway.toLowerCase()) {
        case 'zarinpal':
          result = await this.zarinpal.requestPayment({
            amount: amount,
            description: description,
            callbackUrl: callbackUrl,
            email: customerInfo.email,
            mobile: customerInfo.mobile
          });
          break;

        case 'stripe':
          // Convert Rials to USD cents (approximate conversion)
          const usdAmount = Math.round((amount / 42000) * 100); // Rough IRR to USD conversion
          result = await this.stripe.createPaymentIntent({
            amount: usdAmount,
            currency: currency || 'usd',
            description: description,
            customerEmail: customerInfo.email,
            metadata: {
              orderId: orderId.toString(),
              originalAmount: amount.toString(),
              originalCurrency: 'IRR'
            }
          });
          break;

        case 'payir':
          result = await this.payir.requestPayment({
            amount: amount,
            description: description,
            callbackUrl: callbackUrl,
            mobile: customerInfo.mobile,
            factorNumber: orderId.toString()
          });
          break;

        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      if (result.success) {
        // Update order with payment reference
        const paymentRef = result.authority || result.paymentIntentId || result.token;
        
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentRef: paymentRef,
            updatedAt: new Date()
          }
        });

        // Create payment tracking record
        const paymentTracking = await this.tracking.createPayment({
          orderId: orderId,
          gateway: gateway,
          amount: amount,
          currency: currency || 'IRR',
          gatewayRef: paymentRef,
          metadata: {
            customerInfo: customerInfo,
            description: description,
            callbackUrl: callbackUrl
          }
        });

        // Log payment initiation
        await logActivity(
          order.userId,
          'payment.initiated',
          'Order',
          orderId,
          {
            gateway: gateway,
            amount: amount,
            paymentRef: paymentRef,
            paymentId: paymentTracking.payment?.id
          }
        );

        return {
          success: true,
          gateway: gateway,
          paymentRef: paymentRef,
          paymentUrl: result.paymentUrl || null,
          clientSecret: result.clientSecret || null,
          paymentId: paymentTracking.payment?.id,
          ...result
        };
      } else {
        // Create failed payment tracking record
        const paymentTracking = await this.tracking.createPayment({
          orderId: orderId,
          gateway: gateway,
          amount: amount,
          currency: currency || 'IRR',
          gatewayRef: null,
          metadata: {
            error: result.error,
            customerInfo: customerInfo
          }
        });

        if (paymentTracking.success) {
          await this.tracking.updatePaymentStatus({
            paymentId: paymentTracking.payment.id,
            status: 'FAILED',
            failureReason: result.error
          });
        }

        // Log payment initiation failure
        await logActivity(
          order.userId,
          'payment.initiation_failed',
          'Order',
          orderId,
          {
            gateway: gateway,
            amount: amount,
            error: result.error
          }
        );

        return result;
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify payment based on gateway type
   * @param {Object} verificationData - Verification information
   * @param {string} verificationData.gateway - Payment gateway
   * @param {number} verificationData.orderId - Order ID
   * @param {string} verificationData.paymentRef - Payment reference
   * @param {Object} verificationData.gatewayData - Gateway-specific data
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(verificationData) {
    try {
      const { gateway, orderId, paymentRef, gatewayData } = verificationData;

      // Get order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentRef !== paymentRef) {
        throw new Error('Payment reference mismatch');
      }

      let result;

      switch (gateway.toLowerCase()) {
        case 'zarinpal':
          result = await this.zarinpal.verifyPayment({
            authority: paymentRef,
            amount: order.totalPrice + order.shippingCost - order.discountAmount
          });
          break;

        case 'stripe':
          result = await this.stripe.retrievePaymentIntent(paymentRef);
          // Check if payment is successful
          if (result.success && result.status === 'succeeded') {
            result.verified = true;
          } else {
            result.verified = false;
          }
          break;

        case 'payir':
          result = await this.payir.verifyPayment({
            token: paymentRef
          });
          break;

        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      if (result.success && result.verified) {
        // Update order payment status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'SUCCESS',
            status: 'PROCESSING',
            updatedAt: new Date()
          }
        });

        // Update payment tracking
        const payment = await prisma.payment.findFirst({
          where: { orderId: orderId, gatewayRef: paymentRef }
        });

        if (payment) {
          await this.tracking.updatePaymentStatus({
            paymentId: payment.id,
            status: 'SUCCESS',
            gatewayTxnId: result.refId || result.transId,
            metadata: result.gatewayResponse
          });
        }

        // Log successful payment
        await logActivity(
          order.userId,
          'payment.verified',
          'Order',
          orderId,
          {
            gateway: gateway,
            paymentRef: paymentRef,
            refId: result.refId || result.transId,
            amount: order.totalPrice + order.shippingCost - order.discountAmount
          }
        );

        return {
          success: true,
          verified: true,
          orderId: orderId,
          paymentRef: paymentRef,
          ...result
        };
      } else {
        // Update order payment status to failed
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'FAILED',
            updatedAt: new Date()
          }
        });

        // Update payment tracking
        const payment = await prisma.payment.findFirst({
          where: { orderId: orderId, gatewayRef: paymentRef }
        });

        if (payment) {
          await this.tracking.updatePaymentStatus({
            paymentId: payment.id,
            status: 'FAILED',
            failureReason: result.error,
            metadata: result.gatewayResponse
          });
        }

        // Log payment failure
        await logActivity(
          order.userId,
          'payment.failed',
          'Order',
          orderId,
          {
            gateway: gateway,
            paymentRef: paymentRef,
            error: result.error
          }
        );

        return result;
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Process refund for an order
   * @param {Object} refundData - Refund information
   * @param {number} refundData.orderId - Order ID
   * @param {number} refundData.amount - Refund amount (optional, full refund if not specified)
   * @param {string} refundData.reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(refundData) {
    try {
      const { orderId, amount, reason } = refundData;

      // Get order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus !== 'SUCCESS') {
        throw new Error('Cannot refund unpaid order');
      }

      // Determine gateway from payment reference format
      let gateway;
      if (order.paymentRef.startsWith('pi_')) {
        gateway = 'stripe';
      } else if (order.paymentRef.length === 36) {
        gateway = 'zarinpal';
      } else {
        gateway = 'payir';
      }

      let result;

      switch (gateway) {
        case 'stripe':
          result = await this.stripe.createRefund({
            paymentIntentId: order.paymentRef,
            amount: amount ? Math.round((amount / 42000) * 100) : undefined, // Convert to USD cents
            reason: reason,
            metadata: {
              orderId: orderId.toString()
            }
          });
          break;

        case 'zarinpal':
        case 'payir':
          // Note: Zarinpal and Pay.ir don't support automatic refunds via API
          // This would need to be handled manually through their dashboards
          result = {
            success: false,
            error: 'Manual refund required through gateway dashboard',
            gateway: gateway,
            requiresManualProcessing: true
          };
          break;

        default:
          throw new Error(`Refund not supported for gateway: ${gateway}`);
      }

      // Update payment tracking with refund
      const payment = await prisma.payment.findFirst({
        where: { orderId: orderId, gatewayRef: order.paymentRef }
      });

      if (payment && result.success) {
        await this.tracking.processRefund({
          paymentId: payment.id,
          amount: amount,
          reason: reason,
          gatewayRef: result.refundId,
          gatewayData: result.gatewayResponse
        });
      }

      // Log refund attempt
      await logActivity(
        order.userId,
        'payment.refund_requested',
        'Order',
        orderId,
        {
          gateway: gateway,
          amount: amount || (order.totalPrice + order.shippingCost - order.discountAmount),
          reason: reason,
          success: result.success,
          paymentId: payment?.id
        }
      );

      return {
        ...result,
        orderId: orderId,
        gateway: gateway,
        paymentId: payment?.id
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle webhook from payment gateways
   * @param {string} gateway - Payment gateway
   * @param {Object} webhookData - Webhook data
   * @returns {Promise<Object>} Webhook processing result
   */
  async handleWebhook(gateway, webhookData) {
    try {
      let result;

      switch (gateway.toLowerCase()) {
        case 'stripe':
          const { payload, signature } = webhookData;
          result = await this.stripe.handleWebhook(payload, signature);
          
          if (result.success) {
            // Process Stripe webhook events
            await this.processStripeWebhookEvent(result.event);
          }
          break;

        case 'zarinpal':
        case 'payir':
          // These gateways typically use redirect callbacks rather than webhooks
          result = {
            success: true,
            message: 'Callback received, verification required'
          };
          break;

        default:
          throw new Error(`Webhook not supported for gateway: ${gateway}`);
      }

      return result;
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Stripe webhook events
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<void>}
   */
  async processStripeWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          const orderId = parseInt(paymentIntent.metadata.orderId);
          
          if (orderId) {
            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'SUCCESS',
                status: 'PROCESSING',
                updatedAt: new Date()
              }
            });

            // Log webhook event
            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (order) {
              await logActivity(
                order.userId,
                'payment.webhook_success',
                'Order',
                orderId,
                {
                  gateway: 'stripe',
                  eventType: event.type,
                  paymentIntentId: paymentIntent.id
                }
              );
            }
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          const failedOrderId = parseInt(failedPayment.metadata.orderId);
          
          if (failedOrderId) {
            await prisma.order.update({
              where: { id: failedOrderId },
              data: {
                paymentStatus: 'FAILED',
                updatedAt: new Date()
              }
            });

            // Log webhook event
            const failedOrder = await prisma.order.findUnique({ where: { id: failedOrderId } });
            if (failedOrder) {
              await logActivity(
                failedOrder.userId,
                'payment.webhook_failed',
                'Order',
                failedOrderId,
                {
                  gateway: 'stripe',
                  eventType: event.type,
                  paymentIntentId: failedPayment.id,
                  error: failedPayment.last_payment_error?.message
                }
              );
            }
          }
          break;

        default:
          console.log(`Unhandled Stripe webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error('Stripe webhook event processing error:', error);
    }
  }
}

module.exports = PaymentService;