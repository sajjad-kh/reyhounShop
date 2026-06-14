const request = require('supertest');
const app = require('../../src/server');

describe('Cart and Order Management API Integration Tests', () => {
  let userToken;
  let testUser;
  let testProduct;
  let testCategory;

  beforeEach(async () => {
    // Create admin user for product creation
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

    const adminToken = adminLogin.body.token;

    // Create regular user
    testUser = {
      email: 'user@example.com',
      password: 'UserPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '0987654321'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    userToken = userLogin.body.token;

    // Create test category
    const categoryResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category description'
      });

    testCategory = categoryResponse.body.category;

    // Create test product
    const productResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        description: 'Test product description',
        price: 99.99,
        categoryId: testCategory.id,
        stock: 100,
        isActive: true
      });

    testProduct = productResponse.body.product;
  });

  describe('Cart Management', () => {
    describe('POST /api/v1/cart/items', () => {
      test('should add item to cart', async () => {
        const response = await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.id,
            quantity: 2
          })
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Item added to cart');
        expect(response.body).toHaveProperty('cartItem');
        expect(response.body.cartItem.quantity).toBe(2);
        expect(response.body.cartItem.productId).toBe(testProduct.id);
      });

      test('should reject adding item without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/cart/items')
          .send({
            productId: testProduct.id,
            quantity: 2
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject adding item with invalid quantity', async () => {
        const response = await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.id,
            quantity: 0
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/cart', () => {
      beforeEach(async () => {
        // Add items to cart
        await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.id,
            quantity: 2
          });
      });

      test('should get cart contents', async () => {
        const response = await request(app)
          .get('/api/v1/cart')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('cart');
        expect(response.body.cart).toHaveProperty('items');
        expect(response.body.cart).toHaveProperty('total');
        expect(Array.isArray(response.body.cart.items)).toBe(true);
        expect(response.body.cart.items.length).toBeGreaterThan(0);
      });

      test('should reject cart access without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/cart')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/v1/cart/items/:id', () => {
      let cartItem;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.id,
            quantity: 2
          });

        cartItem = response.body.cartItem;
      });

      test('should update cart item quantity', async () => {
        const response = await request(app)
          .put(`/api/v1/cart/items/${cartItem.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ quantity: 5 })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Cart item updated');
        expect(response.body.cartItem.quantity).toBe(5);
      });

      test('should reject update without authentication', async () => {
        const response = await request(app)
          .put(`/api/v1/cart/items/${cartItem.id}`)
          .send({ quantity: 5 })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('DELETE /api/v1/cart/items/:id', () => {
      let cartItem;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.id,
            quantity: 2
          });

        cartItem = response.body.cartItem;
      });

      test('should remove item from cart', async () => {
        const response = await request(app)
          .delete(`/api/v1/cart/items/${cartItem.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Item removed from cart');
      });

      test('should reject removal without authentication', async () => {
        const response = await request(app)
          .delete(`/api/v1/cart/items/${cartItem.id}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Order Management', () => {
    let userAddress;

    beforeEach(async () => {
      // Add address for user
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

      userAddress = addressResponse.body.address;

      // Add items to cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2
        });
    });

    describe('POST /api/v1/orders', () => {
      test('should create order from cart', async () => {
        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            addressId: userAddress.id,
            paymentMethod: 'ZARINPAL'
          })
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Order created successfully');
        expect(response.body).toHaveProperty('order');
        expect(response.body.order).toHaveProperty('id');
        expect(response.body.order).toHaveProperty('status', 'PENDING');
        expect(response.body.order).toHaveProperty('trackingCode');
      });

      test('should reject order creation without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/orders')
          .send({
            addressId: userAddress.id,
            paymentMethod: 'ZARINPAL'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject order creation with empty cart', async () => {
        // Clear cart first
        const cartResponse = await request(app)
          .get('/api/v1/cart')
          .set('Authorization', `Bearer ${userToken}`);

        for (const item of cartResponse.body.cart.items) {
          await request(app)
            .delete(`/api/v1/cart/items/${item.id}`)
            .set('Authorization', `Bearer ${userToken}`);
        }

        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            addressId: userAddress.id,
            paymentMethod: 'ZARINPAL'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/orders', () => {
      let testOrder;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            addressId: userAddress.id,
            paymentMethod: 'ZARINPAL'
          });

        testOrder = response.body.order;
      });

      test('should get user orders', async () => {
        const response = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('orders');
        expect(Array.isArray(response.body.orders)).toBe(true);
        expect(response.body.orders.length).toBeGreaterThan(0);
        expect(response.body.orders[0]).toHaveProperty('id');
        expect(response.body.orders[0]).toHaveProperty('status');
      });

      test('should reject orders access without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/orders')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/orders/:id', () => {
      let testOrder;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            addressId: userAddress.id,
            paymentMethod: 'ZARINPAL'
          });

        testOrder = response.body.order;
      });

      test('should get specific order details', async () => {
        const response = await request(app)
          .get(`/api/v1/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('order');
        expect(response.body.order.id).toBe(testOrder.id);
        expect(response.body.order).toHaveProperty('items');
        expect(response.body.order).toHaveProperty('address');
      });

      test('should reject access to other user\'s order', async () => {
        // Create another user
        const otherUser = {
          email: 'other@example.com',
          password: 'OtherPassword123!',
          firstName: 'Other',
          lastName: 'User',
          phone: '5555555555'
        };

        await request(app)
          .post('/api/v1/auth/register')
          .send(otherUser);

        const otherLogin = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: otherUser.email,
            password: otherUser.password
          });

        const response = await request(app)
          .get(`/api/v1/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${otherLogin.body.token}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});