const request = require('supertest');
const app = require('../../src/server');
const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const ApiTestUtils = require('../helpers/apiTestUtils');

describe('End-to-End: Error Handling and Edge Case Scenarios', () => {
  let apiUtils;
  let testUser;
  let testToken;
  let adminUser;
  let adminToken;
  let testCategory;
  let testProduct;

  beforeAll(async () => {
    apiUtils = new ApiTestUtils();
    
    // Create test users
    testUser = await TestDataFactory.createUser({
      email: `error-test-${Date.now()}@example.com`
    });
    testToken = TestDataFactory.generateJWT(testUser.id);

    adminUser = await TestDataFactory.createUser({ 
      role: 'ADMIN',
      email: `admin-error-${Date.now()}@example.com`
    });
    adminToken = TestDataFactory.generateJWT(adminUser.id, 'ADMIN');

    // Create test data
    testCategory = await TestDataFactory.createCategory({
      name: 'Error Test Category'
    });

    testProduct = await TestDataFactory.createProduct(testCategory.id, {
      name: 'Error Test Product',
      price: 50.00,
      stock: 5
    });
  });

  test('Authentication and authorization error scenarios', async () => {
    // Test 1: Access protected endpoint without token
    const noTokenResponse = await request(app)
      .get('/api/v1/users/profile');

    expect(noTokenResponse.status).toBe(401);
    expect(noTokenResponse.body).toHaveProperty('error');
    expect(noTokenResponse.body.error.code).toBe('UNAUTHORIZED');

    // Test 2: Access with invalid token
    const invalidTokenResponse = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body).toHaveProperty('error');

    // Test 3: Access admin endpoint as regular user
    const unauthorizedAdminResponse = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${testToken}`);

    expect(unauthorizedAdminResponse.status).toBe(403);
    expect(unauthorizedAdminResponse.body).toHaveProperty('error');
    expect(unauthorizedAdminResponse.body.error.code).toBe('FORBIDDEN');

    // Test 4: Login with incorrect credentials
    const wrongPasswordResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(wrongPasswordResponse.status).toBe(401);
    expect(wrongPasswordResponse.body).toHaveProperty('error');

    // Test 5: Register with existing email
    const duplicateEmailResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUser.email,
        password: 'newpassword123',
        firstName: 'Duplicate',
        lastName: 'User'
      });

    expect(duplicateEmailResponse.status).toBe(409);
    expect(duplicateEmailResponse.body).toHaveProperty('error');
    expect(duplicateEmailResponse.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('Input validation error scenarios', async () => {
    // Test 1: Invalid product creation data
    const invalidProductResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '', // Empty name
        price: -10, // Negative price
        stock: 'invalid', // Non-numeric stock
        categoryId: 'invalid-id' // Invalid category ID
      });

    expect(invalidProductResponse.status).toBe(400);
    expect(invalidProductResponse.body).toHaveProperty('error');
    expect(invalidProductResponse.body.error.code).toBe('VALIDATION_ERROR');

    // Test 2: Invalid user registration data
    const invalidUserResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email', // Invalid email format
        password: '123', // Too short password
        firstName: '', // Empty first name
        phone: 'invalid-phone' // Invalid phone format
      });

    expect(invalidUserResponse.status).toBe(400);
    expect(invalidUserResponse.body).toHaveProperty('error');

    // Test 3: Invalid order creation
    const invalidOrderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: 'invalid-address-id',
        paymentMethod: 'INVALID_GATEWAY'
      });

    expect(invalidOrderResponse.status).toBe(400);
    expect(invalidOrderResponse.body).toHaveProperty('error');

    // Test 4: Invalid cart item addition
    const invalidCartResponse = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: 'invalid-product-id',
        quantity: -1 // Negative quantity
      });

    expect(invalidCartResponse.status).toBe(400);
    expect(invalidCartResponse.body).toHaveProperty('error');
  });

  test('Resource not found error scenarios', async () => {
    // Test 1: Get non-existent product
    const nonExistentProductResponse = await request(app)
      .get('/api/v1/products/99999')
      .set('Authorization', `Bearer ${testToken}`);

    expect(nonExistentProductResponse.status).toBe(404);
    expect(nonExistentProductResponse.body).toHaveProperty('error');
    expect(nonExistentProductResponse.body.error.code).toBe('PRODUCT_NOT_FOUND');

    // Test 2: Update non-existent order
    const nonExistentOrderResponse = await request(app)
      .put('/api/v1/admin/orders/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PROCESSING'
      });

    expect(nonExistentOrderResponse.status).toBe(404);
    expect(nonExistentOrderResponse.body).toHaveProperty('error');

    // Test 3: Delete non-existent category
    const nonExistentCategoryResponse = await request(app)
      .delete('/api/v1/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(nonExistentCategoryResponse.status).toBe(404);
    expect(nonExistentCategoryResponse.body).toHaveProperty('error');

    // Test 4: Access non-existent user profile
    const nonExistentUserResponse = await request(app)
      .get('/api/v1/admin/users/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(nonExistentUserResponse.status).toBe(404);
    expect(nonExistentUserResponse.body).toHaveProperty('error');
  });

  test('Business logic constraint violations', async () => {
    // Test 1: Add out-of-stock product to cart
    const outOfStockProduct = await TestDataFactory.createProduct(testCategory.id, {
      name: 'Out of Stock Product',
      stock: 0
    });

    const outOfStockResponse = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: outOfStockProduct.id,
        quantity: 1
      });

    expect(outOfStockResponse.status).toBe(400);
    expect(outOfStockResponse.body).toHaveProperty('error');
    expect(outOfStockResponse.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Test 2: Add more items than available stock
    const excessiveQuantityResponse = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: testProduct.stock + 10 // More than available
      });

    expect(excessiveQuantityResponse.status).toBe(400);
    expect(excessiveQuantityResponse.body).toHaveProperty('error');

    // Test 3: Use expired discount code
    const expiredDiscount = await global.testDb.discount.create({
      data: {
        code: 'EXPIRED-CODE',
        type: 'PERCENTAGE',
        value: 10,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        isActive: true
      }
    });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const addressResponse = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true
      });

    const expiredDiscountResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: addressResponse.body.address.id,
        paymentMethod: 'ZARINPAL',
        discountCode: 'EXPIRED-CODE'
      });

    expect(expiredDiscountResponse.status).toBe(400);
    expect(expiredDiscountResponse.body).toHaveProperty('error');
    expect(expiredDiscountResponse.body.error.code).toBe('DISCOUNT_EXPIRED');

    // Test 4: Cancel already shipped order
    const shippedOrder = await TestDataFactory.createOrder(testUser.id, {
      status: 'SHIPPED'
    });

    const cancelShippedResponse = await request(app)
      .put(`/api/v1/orders/${shippedOrder.id}/cancel`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        reason: 'Changed mind'
      });

    expect(cancelShippedResponse.status).toBe(400);
    expect(cancelShippedResponse.body).toHaveProperty('error');
    expect(cancelShippedResponse.body.error.code).toBe('ORDER_CANNOT_BE_CANCELLED');
  });

  test('Rate limiting and security error scenarios', async () => {
    // Test 1: Exceed rate limit (simulate multiple rapid requests)
    const requests = [];
    for (let i = 0; i < 105; i++) { // Exceed 100 requests per minute limit
      requests.push(
        request(app)
          .get('/api/v1/products')
          .set('Authorization', `Bearer ${testToken}`)
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Test 2: Invalid API version
    const invalidVersionResponse = await request(app)
      .get('/api/v99/products')
      .set('Authorization', `Bearer ${testToken}`);

    expect(invalidVersionResponse.status).toBe(404);

    // Test 3: Malformed JSON in request body
    const malformedJsonResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}'); // Malformed JSON

    expect(malformedJsonResponse.status).toBe(400);
    expect(malformedJsonResponse.body).toHaveProperty('error');
  });

  test('Concurrent operation error scenarios', async () => {
    // Test 1: Concurrent stock reservation
    const concurrentRequests = [];
    for (let i = 0; i < 10; i++) {
      concurrentRequests.push(
        request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            productId: testProduct.id,
            quantity: 1
          })
      );
    }

    const responses = await Promise.all(concurrentRequests);
    const successfulResponses = responses.filter(res => res.status === 201);
    const failedResponses = responses.filter(res => res.status !== 201);

    // Should have some successful and some failed due to stock constraints
    expect(successfulResponses.length).toBeLessThanOrEqual(testProduct.stock);
    expect(failedResponses.length).toBeGreaterThan(0);

    // Test 2: Concurrent order creation with same cart
    const user2 = await TestDataFactory.createUser({
      email: `concurrent-${Date.now()}@example.com`
    });
    const token2 = TestDataFactory.generateJWT(user2.id);

    // Add item to cart for user2
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        productId: testProduct.id,
        quantity: 2
      });

    const address2Response = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        street: '456 Concurrent Street',
        city: 'Concurrent City',
        state: 'Concurrent State',
        zipCode: '54321',
        country: 'Test Country',
        isDefault: true
      });

    // Try to create multiple orders simultaneously
    const concurrentOrderRequests = [];
    for (let i = 0; i < 3; i++) {
      concurrentOrderRequests.push(
        request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token2}`)
          .send({
            addressId: address2Response.body.address.id,
            paymentMethod: 'ZARINPAL'
          })
      );
    }

    const orderResponses = await Promise.all(concurrentOrderRequests);
    const successfulOrders = orderResponses.filter(res => res.status === 201);
    
    // Should only allow one successful order creation
    expect(successfulOrders.length).toBe(1);
  });

  test('Payment processing error scenarios', async () => {
    // Setup order for payment tests
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1
      });

    const addressResponse = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        street: '789 Payment Error Street',
        city: 'Payment City',
        state: 'Payment State',
        zipCode: '67890',
        country: 'Test Country',
        isDefault: true
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        addressId: addressResponse.body.address.id,
        paymentMethod: 'ZARINPAL'
      });

    const orderId = orderResponse.body.order.id;

    // Test 1: Invalid payment gateway
    const invalidGatewayResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'INVALID_GATEWAY',
        amount: orderResponse.body.order.totalAmount
      });

    expect(invalidGatewayResponse.status).toBe(400);
    expect(invalidGatewayResponse.body).toHaveProperty('error');

    // Test 2: Payment verification with wrong authority
    const paymentInitResponse = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        gateway: 'ZARINPAL',
        amount: orderResponse.body.order.totalAmount
      });

    const wrongAuthorityResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: 'wrong-authority',
        status: 'OK'
      });

    expect(wrongAuthorityResponse.status).toBe(400);
    expect(wrongAuthorityResponse.body).toHaveProperty('error');

    // Test 3: Double payment verification
    const correctVerifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: paymentInitResponse.body.authority,
        status: 'OK'
      });

    expect(correctVerifyResponse.status).toBe(200);

    // Try to verify again
    const doubleVerifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        orderId: orderId,
        authority: paymentInitResponse.body.authority,
        status: 'OK'
      });

    expect(doubleVerifyResponse.status).toBe(400);
    expect(doubleVerifyResponse.body).toHaveProperty('error');
    expect(doubleVerifyResponse.body.error.code).toBe('PAYMENT_ALREADY_PROCESSED');
  });

  test('System resource and database error scenarios', async () => {
    // Test 1: Large request payload (should be rejected)
    const largePayload = {
      name: 'A'.repeat(10000), // Very long name
      description: 'B'.repeat(50000), // Very long description
      price: 99.99,
      categoryId: testCategory.id
    };

    const largePayloadResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(largePayload);

    expect(largePayloadResponse.status).toBe(413);
    expect(largePayloadResponse.body).toHaveProperty('error');

    // Test 2: Invalid database query parameters
    const invalidQueryResponse = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${testToken}`)
      .query({
        page: -1, // Invalid page number
        limit: 1000, // Excessive limit
        sortBy: 'invalid_field' // Invalid sort field
      });

    expect(invalidQueryResponse.status).toBe(400);
    expect(invalidQueryResponse.body).toHaveProperty('error');

    // Test 3: Circular reference in category hierarchy
    const parentCategory = await TestDataFactory.createCategory({
      name: 'Parent Category'
    });

    const childCategory = await TestDataFactory.createCategory({
      name: 'Child Category',
      parentId: parentCategory.id
    });

    // Try to make parent a child of its own child (circular reference)
    const circularReferenceResponse = await request(app)
      .put(`/api/v1/categories/${parentCategory.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        parentId: childCategory.id
      });

    expect(circularReferenceResponse.status).toBe(400);
    expect(circularReferenceResponse.body).toHaveProperty('error');
    expect(circularReferenceResponse.body.error.code).toBe('CIRCULAR_REFERENCE');
  });
});