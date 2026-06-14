const request = require('supertest');
const app = require('../../src/server');

describe('Product Management API Integration Tests', () => {
  let adminToken;
  let userToken;
  let testCategory;
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

    // Create test category
    const categoryResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category description'
      });

    testCategory = categoryResponse.body.category;

    // Create test product data
    testProduct = {
      name: 'Test Product',
      description: 'Test product description',
      price: 99.99,
      discountPrice: 79.99,
      categoryId: testCategory.id,
      stock: 100,
      isActive: true
    };
  });

  describe('POST /api/v1/products', () => {
    test('should create product with admin token', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProduct)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Product created successfully');
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe(testProduct.name);
      expect(response.body.product.price).toBe(testProduct.price);
    });

    test('should reject product creation without admin token', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testProduct)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject product creation with invalid data', async () => {
      const invalidProduct = { ...testProduct, price: -10 };
      
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/products', () => {
    beforeEach(async () => {
      // Create test products
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProduct);

      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testProduct,
          name: 'Another Test Product',
          price: 149.99
        });
    });

    test('should get products list without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
    });

    test('should filter products by category', async () => {
      const response = await request(app)
        .get(`/api/v1/products?categoryId=${testCategory.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      response.body.products.forEach(product => {
        expect(product.categoryId).toBe(testCategory.id);
      });
    });

    test('should search products by name', async () => {
      const response = await request(app)
        .get('/api/v1/products?search=Test')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      response.body.products.forEach(product => {
        expect(product.name.toLowerCase()).toContain('test');
      });
    });

    test('should paginate products', async () => {
      const response = await request(app)
        .get('/api/v1/products?page=1&limit=1')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.products.length).toBe(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    let createdProduct;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProduct);

      createdProduct = response.body.product;
    });

    test('should update product with admin token', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 129.99
      };

      const response = await request(app)
        .put(`/api/v1/products/${createdProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Product updated successfully');
      expect(response.body.product.name).toBe(updateData.name);
      expect(response.body.product.price).toBe(updateData.price);
    });

    test('should reject update without admin token', async () => {
      const response = await request(app)
        .put(`/api/v1/products/${createdProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject update with invalid product ID', async () => {
      const response = await request(app)
        .put('/api/v1/products/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    let createdProduct;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProduct);

      createdProduct = response.body.product;
    });

    test('should soft delete product with admin token', async () => {
      const response = await request(app)
        .delete(`/api/v1/products/${createdProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Product deleted successfully');

      // Verify product is not in active listings
      const listResponse = await request(app)
        .get('/api/v1/products')
        .expect(200);

      const deletedProduct = listResponse.body.products.find(p => p.id === createdProduct.id);
      expect(deletedProduct).toBeUndefined();
    });

    test('should reject deletion without admin token', async () => {
      const response = await request(app)
        .delete(`/api/v1/products/${createdProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});