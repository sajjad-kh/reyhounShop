const request = require('supertest');
const app = require('../../src/server');
const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const ApiTestUtils = require('../helpers/apiTestUtils');

describe('End-to-End: Admin Product and Order Management Workflow', () => {
  let apiUtils;
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  let testCategory;

  beforeAll(async () => {
    apiUtils = new ApiTestUtils();
    
    // Create admin user
    adminUser = await TestDataFactory.createUser({ 
      role: 'ADMIN',
      email: `admin-e2e-${Date.now()}@example.com`
    });
    adminToken = TestDataFactory.generateJWT(adminUser.id, 'ADMIN');

    // Create customer user
    customerUser = await TestDataFactory.createUser({
      email: `customer-e2e-${Date.now()}@example.com`
    });
    customerToken = TestDataFactory.generateJWT(customerUser.id, 'CUSTOMER');

    // Create test category
    testCategory = await TestDataFactory.createCategory({
      name: 'Admin E2E Category'
    });
  });

  test('Complete admin workflow: product management → order processing → reporting', async () => {
    // Step 1: Admin creates a new product
    const productData = {
      name: 'Admin E2E Product',
      description: 'Product created by admin for e2e testing',
      price: 49.99,
      discountPrice: 39.99,
      stock: 25,
      categoryId: testCategory.id,
      lowStockThreshold: 5
    };

    const createProductResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productData);

    expect(createProductResponse.status).toBe(201);
    expect(createProductResponse.body).toHaveProperty('product');
    TestAssertions.expectValidProduct(createProductResponse.body.product);
    
    const productId = createProductResponse.body.product.id;

    // Step 2: Admin updates product details
    const updateProductResponse = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Admin E2E Product',
        price: 54.99,
        stock: 30
      });

    expect(updateProductResponse.status).toBe(200);
    expect(updateProductResponse.body.product.name).toBe('Updated Admin E2E Product');
    expect(updateProductResponse.body.product.price).toBe(54.99);

    // Step 3: Customer places an order for the product
    // Add product to customer cart
    const addToCartResponse = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: productId,
        quantity: 3
      });

    expect(addToCartResponse.status).toBe(201);

    // Create customer address
    const addressResponse = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: '123 Customer Street',
        city: 'Customer City',
        state: 'Customer State',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true
      });

    const addressId = addressResponse.body.address.id;

    // Create order
    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: addressId,
        paymentMethod: 'ZARINPAL'
      });

    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.body.order.id;

    // Step 4: Admin views all orders
    const ordersResponse = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ordersResponse.status).toBe(200);
    expect(ordersResponse.body).toHaveProperty('orders');
    expect(Array.isArray(ordersResponse.body.orders)).toBe(true);
    
    const adminOrder = ordersResponse.body.orders.find(order => order.id === orderId);
    expect(adminOrder).toBeDefined();
    expect(adminOrder.status).toBe('PENDING');

    // Step 5: Admin updates order status
    const updateOrderResponse = await request(app)
      .put(`/api/v1/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PROCESSING',
        trackingCode: 'ADMIN-TRACK-001'
      });

    expect(updateOrderResponse.status).toBe(200);
    expect(updateOrderResponse.body.order.status).toBe('PROCESSING');
    expect(updateOrderResponse.body.order.trackingCode).toBe('ADMIN-TRACK-001');

    // Step 6: Admin views order details
    const orderDetailsResponse = await request(app)
      .get(`/api/v1/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(orderDetailsResponse.status).toBe(200);
    expect(orderDetailsResponse.body).toHaveProperty('order');
    expect(orderDetailsResponse.body.order).toHaveProperty('user');
    expect(orderDetailsResponse.body.order).toHaveProperty('items');
    expect(orderDetailsResponse.body.order.items.length).toBe(1);

    // Step 7: Admin checks dashboard metrics
    const dashboardResponse = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body).toHaveProperty('totalOrders');
    expect(dashboardResponse.body).toHaveProperty('totalRevenue');
    expect(dashboardResponse.body).toHaveProperty('totalUsers');
    expect(dashboardResponse.body).toHaveProperty('totalProducts');
    expect(dashboardResponse.body.totalOrders).toBeGreaterThan(0);

    // Step 8: Admin generates sales report
    const salesReportResponse = await request(app)
      .get('/api/v1/admin/reports/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });

    expect(salesReportResponse.status).toBe(200);
    expect(salesReportResponse.body).toHaveProperty('report');
    expect(salesReportResponse.body.report).toHaveProperty('totalSales');
    expect(salesReportResponse.body.report).toHaveProperty('orderCount');

    // Step 9: Admin manages inventory
    const inventoryResponse = await request(app)
      .get('/api/v1/admin/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(inventoryResponse.status).toBe(200);
    expect(inventoryResponse.body).toHaveProperty('products');
    
    const inventoryProduct = inventoryResponse.body.products.find(p => p.id === productId);
    expect(inventoryProduct).toBeDefined();
    expect(inventoryProduct.stock).toBe(27); // 30 - 3 ordered

    // Step 10: Admin updates inventory
    const updateInventoryResponse = await request(app)
      .put(`/api/v1/products/${productId}/inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stock: 50,
        lowStockThreshold: 10
      });

    expect(updateInventoryResponse.status).toBe(200);
    expect(updateInventoryResponse.body.product.stock).toBe(50);
  });

  test('Admin user management workflow', async () => {
    // Step 1: Admin views all users
    const usersResponse = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body).toHaveProperty('users');
    expect(Array.isArray(usersResponse.body.users)).toBe(true);

    // Step 2: Admin searches for specific user
    const searchResponse = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: customerUser.email });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.users.length).toBeGreaterThan(0);
    const foundUser = searchResponse.body.users.find(u => u.id === customerUser.id);
    expect(foundUser).toBeDefined();

    // Step 3: Admin views user details
    const userDetailsResponse = await request(app)
      .get(`/api/v1/admin/users/${customerUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(userDetailsResponse.status).toBe(200);
    expect(userDetailsResponse.body).toHaveProperty('user');
    expect(userDetailsResponse.body.user.id).toBe(customerUser.id);

    // Step 4: Admin updates user status
    const updateUserResponse = await request(app)
      .put(`/api/v1/admin/users/${customerUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false
      });

    expect(updateUserResponse.status).toBe(200);
    expect(updateUserResponse.body.user.isActive).toBe(false);

    // Step 5: Verify user cannot login when inactive
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: customerUser.email,
        password: 'password123'
      });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body).toHaveProperty('error');

    // Step 6: Admin reactivates user
    const reactivateResponse = await request(app)
      .put(`/api/v1/admin/users/${customerUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: true
      });

    expect(reactivateResponse.status).toBe(200);
    expect(reactivateResponse.body.user.isActive).toBe(true);
  });

  test('Admin discount and loyalty management workflow', async () => {
    // Step 1: Admin creates discount code
    const discountData = {
      code: 'ADMIN-E2E-20',
      type: 'PERCENTAGE',
      value: 20,
      minimumPurchase: 50,
      maxUsage: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    const createDiscountResponse = await request(app)
      .post('/api/v1/discounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(discountData);

    expect(createDiscountResponse.status).toBe(201);
    expect(createDiscountResponse.body).toHaveProperty('discount');
    expect(createDiscountResponse.body.discount.code).toBe('ADMIN-E2E-20');

    const discountId = createDiscountResponse.body.discount.id;

    // Step 2: Admin views all discounts
    const discountsResponse = await request(app)
      .get('/api/v1/discounts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(discountsResponse.status).toBe(200);
    expect(discountsResponse.body).toHaveProperty('discounts');
    
    const createdDiscount = discountsResponse.body.discounts.find(d => d.id === discountId);
    expect(createdDiscount).toBeDefined();

    // Step 3: Admin updates discount
    const updateDiscountResponse = await request(app)
      .put(`/api/v1/discounts/${discountId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        value: 25,
        maxUsage: 20
      });

    expect(updateDiscountResponse.status).toBe(200);
    expect(updateDiscountResponse.body.discount.value).toBe(25);

    // Step 4: Admin views loyalty points report
    const loyaltyReportResponse = await request(app)
      .get('/api/v1/admin/reports/loyalty')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(loyaltyReportResponse.status).toBe(200);
    expect(loyaltyReportResponse.body).toHaveProperty('report');

    // Step 5: Admin manages user loyalty points
    const adjustPointsResponse = await request(app)
      .post(`/api/v1/admin/users/${customerUser.id}/loyalty/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        points: 100,
        reason: 'Admin adjustment for testing'
      });

    expect(adjustPointsResponse.status).toBe(200);
    expect(adjustPointsResponse.body).toHaveProperty('transaction');
  });

  test('Admin error handling and validation', async () => {
    // Try to create product with invalid data
    const invalidProductResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
        stock: 'invalid' // Invalid: non-numeric stock
      });

    expect(invalidProductResponse.status).toBe(400);
    expect(invalidProductResponse.body).toHaveProperty('error');

    // Try to update non-existent order
    const invalidOrderResponse = await request(app)
      .put('/api/v1/admin/orders/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PROCESSING'
      });

    expect(invalidOrderResponse.status).toBe(404);
    expect(invalidOrderResponse.body).toHaveProperty('error');

    // Try to access admin endpoints as customer
    const unauthorizedResponse = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(unauthorizedResponse.status).toBe(403);
    expect(unauthorizedResponse.body).toHaveProperty('error');
  });
});