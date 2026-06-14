/**
 * Basalam Order Flow E2E Tests
 * Tests the complete order flow from cart to payment verification
 */

const request = require('supertest');
const app = require('../../src/server');
const nock = require('nock');

describe('Basalam Order Flow E2E Tests', () => {
  let userToken;
  let userId;
  let testProduct;
  let testCategory;

  beforeEach(async () => {
    // Create test user
    const testUser = {
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '09123456789'
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    userToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;

    // Create test category
    const adminUser = {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      phone: '09987654321',
      role: 'ADMIN'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });

    const adminToken = adminLogin.body.token;

    const categoryResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category for orders'
      });

    testCategory = categoryResponse.body.category;

    // Create test product
    const productResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        description: 'Test product for order',
        price: 100.00,
        stock: 50,
        categoryId: testCategory.id
      });

    testProduct = productResponse.body.product;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Complete Order Flow', () => {
    test('should complete full order flow: add to cart -> checkout -> payment redirect', async () => {
      // Step 1: Add product to cart
      const cartResponse = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2
        })
        .expect(200);

      expect(cartResponse.body.success).toBe(true);
      expect(cartResponse.body.data.items).toHaveLength(1);
      expect(cartResponse.body.data.items[0].quantity).toBe(2);

      // Step 2: Get cart to verify
      const getCartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getCartResponse.body.data.items).toHaveLength(1);
      expect(getCartResponse.body.data.totalAmount).toBe(200.00);

      // Step 3: Mock Basalam API for order creation
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(200, {
          order_id: 12345,
          order_number: 'BO-12345',
          payment_url: 'https://payment.basalam.com/pay/12345',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        });

      // Step 4: Create order (checkout)
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 2
          }
        ],
        shippingAddress: {
          province: 'Tehran',
          city: 'Tehran',
          address: '123 Test Street',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09123456789',
          email: 'testuser@example.com'
        }
      };

      const createOrderResponse = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(createOrderResponse.body.success).toBe(true);
      expect(createOrderResponse.body.data).toHaveProperty('orderId');
      expect(createOrderResponse.body.data).toHaveProperty('basalamOrderId', 12345);
      expect(createOrderResponse.body.data).toHaveProperty('paymentUrl');
      expect(createOrderResponse.body.data.paymentUrl).toContain('payment.basalam.com');

      const orderId = createOrderResponse.body.data.orderId;

      // Step 5: Verify order was created in database
      const orderDetailsResponse = await request(app)
        .get(`/api/v1/basalam/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(orderDetailsResponse.body.success).toBe(true);
      expect(orderDetailsResponse.body.data.status).toBe('pending_payment');
      expect(orderDetailsResponse.body.data.items).toHaveLength(1);
      expect(orderDetailsResponse.body.data.totalAmount).toBe(200.00);
    });

    test('should handle payment callback and verify payment', async () => {
      // Create order first
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(200, {
          order_id: 54321,
          order_number: 'BO-54321',
          payment_url: 'https://payment.basalam.com/pay/54321',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        });

      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          province: 'Tehran',
          city: 'Tehran',
          address: '456 Test Avenue',
          postalCode: '9876543210'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09123456789'
        }
      };

      const createOrderResponse = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      const orderId = createOrderResponse.body.data.orderId;

      // Mock Basalam API for payment verification
      nock('https://openapi.basalam.com')
        .get(`/orders/54321`)
        .reply(200, {
          order_id: 54321,
          order_number: 'BO-54321',
          status: 'paid',
          payment: {
            transaction_id: 'TXN-123456',
            paid_at: new Date().toISOString()
          }
        });

      // Verify payment
      const verifyResponse = await request(app)
        .post(`/api/v1/basalam/orders/${orderId}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          transactionId: 'TXN-123456'
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.verified).toBe(true);
      expect(verifyResponse.body.data.order.status).toBe('paid');
    });

    test('should display order in order list after creation', async () => {
      // Create order
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(200, {
          order_id: 99999,
          order_number: 'BO-99999',
          payment_url: 'https://payment.basalam.com/pay/99999',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        });

      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 3
          }
        ],
        shippingAddress: {
          province: 'Isfahan',
          city: 'Isfahan',
          address: '789 Test Road',
          postalCode: '5555555555'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09123456789'
        }
      };

      await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      // Get order list
      const orderListResponse = await request(app)
        .get('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(orderListResponse.body.success).toBe(true);
      expect(orderListResponse.body.data.orders).toHaveLength(1);
      expect(orderListResponse.body.data.orders[0].orderNumber).toContain('BO-99999');
      expect(orderListResponse.body.data.orders[0].status).toBe('pending_payment');
      expect(orderListResponse.body.data.orders[0].totalAmount).toBe(300.00);
    });
  });
});
