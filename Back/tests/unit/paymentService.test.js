const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const PaymentService = require('../../src/services/paymentService');

describe('PaymentService', () => {
  let paymentService;
  let user;
  let order;

  beforeEach(async () => {
    paymentService = new PaymentService();
    user = await TestDataFactory.createUser();
    order = await TestDataFactory.createOrder(user.id, { totalAmount: 100.00 });
  });

  describe('initiatePayment', () => {
    test('should initiate Zarinpal payment successfully', async () => {
      const paymentData = {
        orderId: order.id,
        amount: order.totalAmount,
        gateway: 'ZARINPAL',
        callbackUrl: 'http://localhost:3000/payment/callback'
      };

      const result = await paymentService.initiatePayment(paymentData);

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('gatewayUrl');
      expect(result).toHaveProperty('authority');
      expect(result.gateway).toBe('ZARINPAL');
      expect(result.amount).toBe(paymentData.amount);
    });

    test('should initiate Stripe payment successfully', async () => {
      const paymentData = {
        orderId: order.id,
        amount: order.totalAmount,
        gateway: 'STRIPE',
        callbackUrl: 'http://localhost:3000/payment/callback'
      };

      const result = await paymentService.initiatePayment(paymentData);

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('clientSecret');
      expect(result.gateway).toBe('STRIPE');
      expect(result.amount).toBe(paymentData.amount);
    });

    test('should throw error for invalid gateway', async () => {
      const paymentData = {
        orderId: order.id,
        amount: order.totalAmount,
        gateway: 'INVALID_GATEWAY'
      };

      await expect(paymentService.initiatePayment(paymentData))
        .rejects.toThrow('UNSUPPORTED_PAYMENT_GATEWAY');
    });

    test('should throw error for non-existent order', async () => {
      const paymentData = {
        orderId: 99999,
        amount: 100.00,
        gateway: 'ZARINPAL'
      };

      await expect(paymentService.initiatePayment(paymentData))
        .rejects.toThrow('ORDER_NOT_FOUND');
    });
  });

  describe('verifyPayment', () => {
    test('should verify Zarinpal payment successfully', async () => {
      // Create a payment record first
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'PENDING',
          authority: 'test_authority_123'
        }
      });

      const verificationData = {
        authority: 'test_authority_123',
        status: 'OK',
        refId: 'test_ref_123'
      };

      const result = await paymentService.verifyPayment(payment.id, verificationData);

      expect(result.status).toBe('COMPLETED');
      expect(result.refId).toBe(verificationData.refId);
    });

    test('should handle failed payment verification', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'PENDING',
          authority: 'test_authority_123'
        }
      });

      const verificationData = {
        authority: 'test_authority_123',
        status: 'NOK'
      };

      const result = await paymentService.verifyPayment(payment.id, verificationData);

      expect(result.status).toBe('FAILED');
    });

    test('should throw error for non-existent payment', async () => {
      const verificationData = {
        authority: 'test_authority_123',
        status: 'OK'
      };

      await expect(paymentService.verifyPayment(99999, verificationData))
        .rejects.toThrow('PAYMENT_NOT_FOUND');
    });
  });

  describe('processRefund', () => {
    test('should process refund successfully', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'COMPLETED',
          refId: 'test_ref_123'
        }
      });

      const refundData = {
        paymentId: payment.id,
        amount: 50.00,
        reason: 'Customer request'
      };

      const result = await paymentService.processRefund(refundData);

      expect(result).toHaveProperty('refundId');
      expect(result.amount).toBe(refundData.amount);
      expect(result.status).toBe('PENDING');
    });

    test('should throw error for refund amount exceeding payment', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'COMPLETED',
          refId: 'test_ref_123'
        }
      });

      const refundData = {
        paymentId: payment.id,
        amount: 200.00,
        reason: 'Customer request'
      };

      await expect(paymentService.processRefund(refundData))
        .rejects.toThrow('REFUND_AMOUNT_EXCEEDS_PAYMENT');
    });

    test('should throw error for refunding non-completed payment', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'PENDING'
        }
      });

      const refundData = {
        paymentId: payment.id,
        amount: 50.00,
        reason: 'Customer request'
      };

      await expect(paymentService.processRefund(refundData))
        .rejects.toThrow('PAYMENT_NOT_COMPLETED');
    });
  });

  describe('getPaymentsByOrder', () => {
    test('should return payments for order', async () => {
      await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'COMPLETED'
        }
      });

      const result = await paymentService.getPaymentsByOrder(order.id);

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(order.id);
    });

    test('should return empty array for order with no payments', async () => {
      const newOrder = await TestDataFactory.createOrder(user.id);

      const result = await paymentService.getPaymentsByOrder(newOrder.id);

      expect(result).toHaveLength(0);
    });
  });

  describe('handleWebhook', () => {
    test('should handle Zarinpal webhook successfully', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'ZARINPAL',
          status: 'PENDING',
          authority: 'webhook_authority_123'
        }
      });

      const webhookData = {
        gateway: 'ZARINPAL',
        authority: 'webhook_authority_123',
        status: 'OK',
        refId: 'webhook_ref_123'
      };

      const result = await paymentService.handleWebhook(webhookData);

      expect(result.processed).toBe(true);
      expect(result.paymentId).toBe(payment.id);
    });

    test('should handle Stripe webhook successfully', async () => {
      const payment = await global.testDb.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          gateway: 'STRIPE',
          status: 'PENDING',
          stripePaymentIntentId: 'pi_test_123'
        }
      });

      const webhookData = {
        gateway: 'STRIPE',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        }
      };

      const result = await paymentService.handleWebhook(webhookData);

      expect(result.processed).toBe(true);
      expect(result.paymentId).toBe(payment.id);
    });

    test('should ignore webhook for non-existent payment', async () => {
      const webhookData = {
        gateway: 'ZARINPAL',
        authority: 'non_existent_authority',
        status: 'OK'
      };

      const result = await paymentService.handleWebhook(webhookData);

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('PAYMENT_NOT_FOUND');
    });
  });
});