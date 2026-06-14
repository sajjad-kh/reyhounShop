const request = require('supertest');
const app = require('../../src/server');

describe('Admin Panel API Integration Tests', () => {
  let adminToken;
  let userToken;
  let testOrder;
  let testProduct;

  beforeEach(async () => {
    // Create admin user
    const adminUser = {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      phone: '1234567890',
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

    adminToken = adminLogin.body.token;

    // Create regular user
    const regularUser = {
      email: 'user@example.com',
      password: 'UserPassword123!',
      firstName: 'Regular',
      lastName: 'User',
      phone: '0987654321'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(regularUser);

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: regularUser.email,
        password: regularUser.password
      });

    userToken = userLogin.body.token;

    // Create test category and product
    const categoryResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category description'
      });

    const productResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        description: 'Test product description',
        price: 99.99,
        categoryId: categoryResponse.body.category.id,
        stock: 100,
        isActive: true
      });

    testProduct = productResponse.body.product;

    // Create test address and order
    const addressResponse = await request(app)
      .post('/api/v1/users/addresses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true
      });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProduct.id,
        quantity: 2
      });

    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        addressId: addressResponse.body.address.id,
        paymentMethod: 'ZARINPAL'
      });

    testOrder = orderResponse.body.order;
  });

  describe('Admin Dashboard', () => {
    describe('GET /api/v1/admin/dashboard', () => {
      test('should get dashboard statistics with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('totalOrders');
        expect(response.body.stats).toHaveProperty('totalRevenue');
        expect(response.body.stats).toHaveProperty('totalUsers');
        expect(response.body.stats).toHaveProperty('totalProducts');
        expect(response.body.stats).toHaveProperty('recentOrders');
      });

      test('should reject dashboard access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject dashboard access without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/admin/dashboard')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Admin Order Management', () => {
    describe('GET /api/v1/admin/orders', () => {
      test('should get all orders with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('orders');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
        expect(response.body.data.orders.length).toBeGreaterThan(0);
        expect(response.body.data.orders[0]).toHaveProperty('id');
        expect(response.body.data.orders[0]).toHaveProperty('status');
        expect(response.body.data.orders[0]).toHaveProperty('user');
      });

      test('should filter orders by status', async () => {
        const response = await request(app)
          .get('/api/v1/admin/orders?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('orders');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
        response.body.data.orders.forEach(order => {
          expect(order.status).toBe('PENDING');
        });
      });

      test('should return empty array when no orders match filters', async () => {
        const response = await request(app)
          .get('/api/v1/admin/orders?status=CANCELLED')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('orders');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
        expect(response.body.data.orders.length).toBe(0);
        expect(response.body.data.pagination).toHaveProperty('total', 0);
      });

      test('should reject orders access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/v1/admin/orders/:id', () => {
      test('should update order status with admin token', async () => {
        const response = await request(app)
          .put(`/api/v1/admin/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            status: 'PROCESSING',
            trackingCode: 'TRACK123456'
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Order updated successfully');
        expect(response.body.order.status).toBe('PROCESSING');
        expect(response.body.order.trackingCode).toBe('TRACK123456');
      });

      test('should reject order update without admin token', async () => {
        const response = await request(app)
          .put(`/api/v1/admin/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'PROCESSING' })
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject invalid status update', async () => {
        const response = await request(app)
          .put(`/api/v1/admin/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/v1/admin/users', () => {
      test('should get all users with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('users');
        expect(Array.isArray(response.body.users)).toBe(true);
        expect(response.body.users.length).toBeGreaterThan(0);
        expect(response.body.users[0]).toHaveProperty('id');
        expect(response.body.users[0]).toHaveProperty('email');
        expect(response.body.users[0]).not.toHaveProperty('password');
      });

      test('should search users by email', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users?search=user@example.com')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('users');
        response.body.users.forEach(user => {
          expect(user.email.toLowerCase()).toContain('user@example.com');
        });
      });

      test('should reject users access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Admin Reports', () => {
    describe('GET /api/v1/admin/reports/sales', () => {
      test('should get sales report with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/reports/sales')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('report');
        expect(response.body.report).toHaveProperty('totalSales');
        expect(response.body.report).toHaveProperty('totalOrders');
        expect(response.body.report).toHaveProperty('averageOrderValue');
        expect(response.body.report).toHaveProperty('salesByDate');
      });

      test('should filter sales report by date range', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();

        const response = await request(app)
          .get(`/api/v1/admin/reports/sales?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('report');
        expect(response.body.report).toHaveProperty('dateRange');
        expect(response.body.report.dateRange).toHaveProperty('startDate');
        expect(response.body.report.dateRange).toHaveProperty('endDate');
      });

      test('should reject sales report access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/reports/sales')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/admin/reports/inventory', () => {
      test('should get inventory report with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/reports/inventory')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('report');
        expect(response.body.report).toHaveProperty('totalProducts');
        expect(response.body.report).toHaveProperty('lowStockProducts');
        expect(response.body.report).toHaveProperty('outOfStockProducts');
        expect(response.body.report).toHaveProperty('inventoryValue');
      });

      test('should reject inventory report access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/reports/inventory')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Admin Log Management', () => {
    describe('GET /api/v1/admin/logs', () => {
      test('should get system logs with admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('logs');
        expect(Array.isArray(response.body.logs)).toBe(true);
        expect(response.body).toHaveProperty('pagination');
      });

      test('should filter logs by type', async () => {
        const response = await request(app)
          .get('/api/v1/admin/logs?type=API')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('logs');
        response.body.logs.forEach(log => {
          expect(log.type).toBe('API');
        });
      });

      test('should reject logs access without admin token', async () => {
        const response = await request(app)
          .get('/api/v1/admin/logs')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});