const request = require('supertest');
const app = require('../../src/server');
const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const ApiTestUtils = require('../helpers/apiTestUtils');

describe('End-to-End: Payment Processing and Notification Delivery', () => {
  let apiUtils;
  let testUser;
  let testToken;
  let testCategory;
  let testProduct;
  let testAddress;

  beforeAll(async () => {
    apiUtils = new ApiTestUtils();
    
    // Create test user
    testUser = await TestDataFactory.createUser({
      email: `payment-e2e-${Date.now()}@example.com`,
      phone: '+1234567890'
    });
    testToken = TestDataFactory.generateJWT(testUser.id);

    // Create test category and product
    testCategory = await TestDataFactory.createCategory({
      name: 'Payment E2E Category'
    });

    testProduct = await TestDataFactory.createProduct(testCategory.id, {
      name: 'Payment E2E Product',
      price: 75.00,
      stock: 20
    });

    // Create test address
    const addressResponse = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        street: '123 Payment Street',
        city: 'Payment City',
        state: 'Payment State',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true
      });

    testAddress = addressResponse.body.address;
  });

  test('Complete payment workflow: Zarinpal gateway processing', async () => {
    // Step 1: Add product to cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 2
      });

    // Step 2: Create order
    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: testAddress.id,
        paymentMethod: 'ZARINPAL'
      });

    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.body.order.id;
    const orderAmount = orderResponse.body.order.totalAmount;

    // Step 3: Initiate payment
    const paymentInitResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'ZARINPAL',
        amount: orderAmount
      });

    expect(paymentInitResponse.status).toBe(200);
    expect(paymentInitResponse.body).toHaveProperty('paymentUrl');
    expect(paymentInitResponse.body).toHaveProperty('authority');
    expect(paymentInitResponse.body.paymentUrl).toContain('zarinpal.com');

    const authority = paymentInitResponse.body.authority;

    // Step 4: Verify successful payment
    const verifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: authority,
        status: 'OK'
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toHaveProperty('success', true);
    expect(verifyResponse.body).toHaveProperty('refId');

    // Step 5: Verify order status updated
    const updatedOrderResponse = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(updatedOrderResponse.status).toBe(200);
    expect(updatedOrderResponse.body.order.status).toBe('PROCESSING');
    expect(updatedOrderResponse.body.order.paymentStatus).toBe('PAID');

    // Step 6: Check payment record created
    const adminUser = await TestDataFactory.createUser({ role: 'ADMIN' });
    const adminToken = TestDataFactory.generateJWT(adminUser.id, 'ADMIN');

    const paymentHistoryResponse = await request(app)
      .get(`/api/v1/admin/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(paymentHistoryResponse.status).toBe(200);
    expect(paymentHistoryResponse.body).toHaveProperty('payments');
    expect(paymentHistoryResponse.body.payments.length).toBe(1);
    expect(paymentHistoryResponse.body.payments[0].status).toBe('COMPLETED');
  });

  test('Payment failure handling and retry workflow', async () => {
    // Step 1: Create order
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: testAddress.id,
        paymentMethod: 'STRIPE'
      });

    const orderId = orderResponse.body.order.id;

    // Step 2: Initiate payment
    const paymentInitResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'STRIPE',
        amount: orderResponse.body.order.totalAmount
      });

    expect(paymentInitResponse.status).toBe(200);
    const authority = paymentInitResponse.body.authority;

    // Step 3: Simulate payment failure
    const failedVerifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: authority,
        status: 'FAILED'
      });

    expect(failedVerifyResponse.status).toBe(400);
    expect(failedVerifyResponse.body).toHaveProperty('success', false);

    // Step 4: Verify order status remains pending
    const orderAfterFailureResponse = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(orderAfterFailureResponse.status).toBe(200);
    expect(orderAfterFailureResponse.body.order.status).toBe('PENDING');
    expect(orderAfterFailureResponse.body.order.paymentStatus).toBe('FAILED');

    // Step 5: Retry payment
    const retryPaymentResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'ZARINPAL', // Switch to different gateway
        amount: orderResponse.body.order.totalAmount
      });

    expect(retryPaymentResponse.status).toBe(200);
    expect(retryPaymentResponse.body).toHaveProperty('paymentUrl');

    // Step 6: Successful retry
    const retryVerifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: retryPaymentResponse.body.authority,
        status: 'OK'
      });

    expect(retryVerifyResponse.status).toBe(200);
    expect(retryVerifyResponse.body).toHaveProperty('success', true);
  });

  test('Notification delivery workflow', async () => {
    // Step 1: Create order to trigger notifications
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: testAddress.id,
        paymentMethod: 'ZARINPAL'
      });

    const orderId = orderResponse.body.order.id;

    // Step 2: Process payment to trigger notifications
    const paymentInitResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'ZARINPAL',
        amount: orderResponse.body.order.totalAmount
      });

    await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: paymentInitResponse.body.authority,
        status: 'OK'
      });

    // Step 3: Check notification preferences
    const preferencesResponse = await request(app)
      .get('/api/v1/users/notification-preferences')
      .set('Authorization', `Bearer ${testToken}`);

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.body).toHaveProperty('preferences');

    // Step 4: Update notification preferences
    const updatePreferencesResponse = await request(app)
      .put('/api/v1/users/notification-preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        emailNotifications: true,
        smsNotifications: true,
        orderUpdates: true,
        promotions: false
      });

    expect(updatePreferencesResponse.status).toBe(200);

    // Step 5: Admin updates order status to trigger notification
    const adminUser = await TestDataFactory.createUser({ role: 'ADMIN' });
    const adminToken = TestDataFactory.generateJWT(adminUser.id, 'ADMIN');

    const statusUpdateResponse = await request(app)
      .put(`/api/v1/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'SHIPPED',
        trackingCode: 'SHIP-123456'
      });

    expect(statusUpdateResponse.status).toBe(200);

    // Step 6: Check notification history
    const notificationHistoryResponse = await request(app)
      .get('/api/v1/users/notifications')
      .set('Authorization', `Bearer ${testToken}`);

    expect(notificationHistoryResponse.status).toBe(200);
    expect(notificationHistoryResponse.body).toHaveProperty('notifications');
    expect(notificationHistoryResponse.body.notifications.length).toBeGreaterThan(0);

    // Step 7: Mark notifications as read
    const markReadResponse = await request(app)
      .put('/api/v1/users/notifications/mark-read')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        notificationIds: [notificationHistoryResponse.body.notifications[0].id]
      });

    expect(markReadResponse.status).toBe(200);
  });

  test('Refund processing workflow', async () => {
    // Step 1: Create and pay for order
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: testAddress.id,
        paymentMethod: 'ZARINPAL'
      });

    const orderId = orderResponse.body.order.id;

    // Complete payment
    const paymentInitResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'ZARINPAL',
        amount: orderResponse.body.order.totalAmount
      });

    await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: paymentInitResponse.body.authority,
        status: 'OK'
      });

    // Step 2: Customer requests order cancellation
    const cancelResponse = await request(app)
      .put(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        reason: 'Changed mind'
      });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.order.status).toBe('CANCELLED');

    // Step 3: Admin processes refund
    const adminUser = await TestDataFactory.createUser({ role: 'ADMIN' });
    const adminToken = TestDataFactory.generateJWT(adminUser.id, 'ADMIN');

    const refundResponse = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: orderResponse.body.order.totalAmount,
        reason: 'Customer cancellation'
      });

    expect(refundResponse.status).toBe(200);
    expect(refundResponse.body).toHaveProperty('refund');
    expect(refundResponse.body.refund.status).toBe('PROCESSED');

    // Step 4: Verify refund in payment history
    const paymentHistoryResponse = await request(app)
      .get(`/api/v1/admin/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(paymentHistoryResponse.status).toBe(200);
    const refundRecord = paymentHistoryResponse.body.payments.find(p => p.type === 'REFUND');
    expect(refundRecord).toBeDefined();
    expect(refundRecord.status).toBe('COMPLETED');
  });

  test('Multiple payment gateway integration', async () => {
    const gateways = ['ZARINPAL', 'STRIPE', 'PAY_IR'];
    
    for (const gateway of gateways) {
      // Create separate order for each gateway
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1
        });

      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          addressId: testAddress.id,
          paymentMethod: gateway
        });

      expect(orderResponse.status).toBe(201);
      const orderId = orderResponse.body.order.id;

      // Test payment initiation for each gateway
      const paymentInitResponse = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: orderId,
          gateway: gateway,
          amount: orderResponse.body.order.totalAmount
        });

      expect(paymentInitResponse.status).toBe(200);
      expect(paymentInitResponse.body).toHaveProperty('paymentUrl');
      expect(paymentInitResponse.body).toHaveProperty('authority');

      // Verify gateway-specific URL patterns
      if (gateway === 'ZARINPAL') {
        expect(paymentInitResponse.body.paymentUrl).toContain('zarinpal.com');
      } else if (gateway === 'STRIPE') {
        expect(paymentInitResponse.body.paymentUrl).toContain('stripe.com');
      } else if (gateway === 'PAY_IR') {
        expect(paymentInitResponse.body.paymentUrl).toContain('pay.ir');
      }
    }
  });

  test('Payment webhook handling', async () => {
    // Step 1: Create order
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: testAddress.id,
        paymentMethod: 'STRIPE'
      });

    const orderId = orderResponse.body.order.id;

    // Step 2: Simulate webhook from payment gateway
    const webhookResponse = await request(app)
      .post('/api/v1/payments/webhook/stripe')
      .send({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              orderId: orderId
            },
            amount: Math.round(orderResponse.body.order.totalAmount * 100), // Stripe uses cents
            status: 'succeeded'
          }
        }
      });

    expect(webhookResponse.status).toBe(200);

    // Step 3: Verify order status updated via webhook
    const updatedOrderResponse = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(updatedOrderResponse.status).toBe(200);
    expect(updatedOrderResponse.body.order.paymentStatus).toBe('PAID');
  });
});