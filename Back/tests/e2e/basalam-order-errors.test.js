/**
 * Basalam Order Error Scenarios E2E Tests
 * Tests error handling for various failure scenarios
 */

const request = require('supertest');
const app = require('../../src/server');
const nock = require('nock');

describe('Basalam Order Error Scenarios E2E Tests', () => {
  let userToken;
  let userId;
  let testProduct;
  let testCategory;

  beforeEach(async () => {
    // Create test user
    const testUser = {
      email: 'errortest@example.com',
      password: 'TestPassword123!',
      firstName: 'Error',
      lastName: 'Test',
      phone: '09111111111'
    };

    await request(app)
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

    // Create admin and test data
    const adminUser = {
      email: 'erroradmin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'Error',
      phone: '09222222222',
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
        name: 'Error Test Category',
        description: 'Category for error testing'
      });

    testCategory = categoryResponse.body.category;

    const productResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Error Test Product',
        description: 'Product for error testing',
        price: 50.00,
        stock: 10,
        categoryId: testCategory.id
      });

    testProduct = productResponse.body.product;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Network Errors', () => {
    test('should handle Basalam API network timeout', async () => {
      // Mock network timeout
      nock('https://openapi.basalam.com')
        .post('/orders')
        .delayConnection(15000)
        .reply(200, {});

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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type');
      expect(response.body.error.type).toMatch(/NETWORK_ERROR|ORDER_CREATION_FAILED/);
    });

    test('should handle Basalam API connection failure', async () => {
      // Mock connection error
      nock('https://openapi.basalam.com')
        .post('/orders')
        .replyWithError('Connection refused');

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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    test('should handle Basalam API 500 error', async () => {
      // Mock server error
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(500, {
          error: 'Internal Server Error'
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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type');
    });
  });

  describe('Payment Failures', () => {
    test('should handle payment verification failure', async () => {
      // Create order first
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(200, {
          order_id: 11111,
          order_number: 'BO-11111',
          payment_url: 'https://payment.basalam.com/pay/11111',
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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const createResponse = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      const orderId = createResponse.body.data.orderId;

      // Mock payment verification failure
      nock('https://openapi.basalam.com')
        .get('/orders/11111')
        .reply(200, {
          order_id: 11111,
          order_number: 'BO-11111',
          status: 'cancelled',
          payment: {
            status: 'failed'
          }
        });

      const verifyResponse = await request(app)
        .post(`/api/v1/basalam/orders/${orderId}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          transactionId: 'FAILED-TXN'
        })
        .expect(400);

      expect(verifyResponse.body.success).toBe(false);
      expect(verifyResponse.body.error.type).toBe('PAYMENT_FAILED');
    });

    test('should handle missing transaction ID in verification', async () => {
      const response = await request(app)
        .post('/api/v1/basalam/orders/999/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Transaction ID');
    });
  });

  describe('Invalid Data', () => {
    test('should reject order with missing required fields', async () => {
      const invalidOrderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ]
        // Missing shippingAddress and contactInfo
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type');
    });

    test('should reject order with invalid product ID', async () => {
      const invalidOrderData = {
        items: [
          {
            productId: 999999,
            quantity: 1
          }
        ],
        shippingAddress: {
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject order with invalid quantity', async () => {
      const invalidOrderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: -1
          }
        ],
        shippingAddress: {
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject order with empty items array', async () => {
      const invalidOrderData = {
        items: [],
        shippingAddress: {
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject invalid order ID format', async () => {
      const response = await request(app)
        .get('/api/v1/basalam/orders/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication Errors', () => {
    test('should reject order creation without authentication', async () => {
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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const response = await request(app)
        .post('/api/v1/basalam/orders')
        .send(orderData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject order list access without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/basalam/orders')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject order details access without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/basalam/orders/123')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject payment verification without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/basalam/orders/123/verify')
        .send({ transactionId: 'TXN-123' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should prevent user from accessing another user\'s order', async () => {
      // Create another user
      const anotherUser = {
        email: 'another@example.com',
        password: 'AnotherPassword123!',
        firstName: 'Another',
        lastName: 'User',
        phone: '09333333333'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(anotherUser);

      const anotherLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: anotherUser.email,
          password: anotherUser.password
        });

      const anotherToken = anotherLogin.body.token;

      // Create order with first user
      nock('https://openapi.basalam.com')
        .post('/orders')
        .reply(200, {
          order_id: 77777,
          order_number: 'BO-77777',
          payment_url: 'https://payment.basalam.com/pay/77777',
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
          address: 'Test Address',
          postalCode: '1234567890'
        },
        contactInfo: {
          fullName: 'Test User',
          phone: '09111111111'
        }
      };

      const createResponse = await request(app)
        .post('/api/v1/basalam/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      const orderId = createResponse.body.data.orderId;

      // Try to access with another user's token
      const response = await request(app)
        .get(`/api/v1/basalam/orders/${orderId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('ORDER_NOT_FOUND');
    });
  });
});
