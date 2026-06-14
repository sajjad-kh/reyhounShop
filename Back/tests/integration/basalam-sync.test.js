const request = require('supertest');
const app = require('../../src/server');
const nock = require('nock');
const fs = require('fs').promises;
const path = require('path');

describe('Basalam Product Sync Integration Tests', () => {
  let adminToken;
  let testCategory;
  const mockImageBuffer = Buffer.from('fake-image-data');

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

    // Create test category
    const categoryResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category description'
      });

    testCategory = categoryResponse.body.category;
  });

  afterEach(async () => {
    // Clean up nock interceptors
    nock.cleanAll();

    // Clean up uploaded test images
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
      const files = await fs.readdir(uploadsDir);
      
      for (const file of files) {
        if (file.startsWith('basalam-')) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/v1/admin/basalam/sync-product - Product Creation', () => {
    test('should create new product with image download', async () => {
      const basalamProductData = {
        basalamId: 'TEST123',
        name: 'Test Basalam Product',
        description: 'Test product from Basalam',
        price: 99.99,
        stock: 50,
        imageUrl: 'https://example.com/image.jpg',
        categoryId: testCategory.id
      };

      // Mock image download
      nock('https://example.com')
        .get('/image.jpg')
        .reply(200, mockImageBuffer, {
          'content-type': 'image/jpeg'
        });

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toContain('Test Basalam Product');
      expect(response.body.data.name).toContain('(Basalam-TEST123)');
      expect(response.body.data.price).toBe(99.99);
      expect(response.body.data.stock).toBe(50);
      expect(response.body.data).toHaveProperty('images');
      expect(response.body.data.images.length).toBeGreaterThan(0);
      expect(response.body.data.images[0].url).toContain('/uploads/products/basalam-TEST123');
      expect(response.body.data.images[0].isMain).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.isUpdate).toBe(false);
      expect(response.body.meta.imageCreated).toBe(true);
    });

    test('should create product without image when imageUrl not provided', async () => {
      const basalamProductData = {
        basalamId: 'TEST456',
        name: 'Test Product No Image',
        description: 'Test product without image',
        price: 49.99,
        stock: 25,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toContain('(Basalam-TEST456)');
      expect(response.body.data.images.length).toBe(0);
      expect(response.body.meta.imageCreated).toBe(false);
    });
  });

  describe('POST /api/v1/admin/basalam/sync-product - Product Update', () => {
    test('should update existing Basalam product', async () => {
      const basalamProductData = {
        basalamId: 'TEST789',
        name: 'Original Product Name',
        description: 'Original description',
        price: 79.99,
        stock: 30,
        categoryId: testCategory.id
      };

      // Create initial product
      const createResponse = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      const productId = createResponse.body.data.id;

      // Update product with new data
      const updatedData = {
        basalamId: 'TEST789',
        name: 'Updated Product Name',
        description: 'Updated description',
        price: 89.99,
        stock: 40,
        categoryId: testCategory.id
      };

      const updateResponse = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(updateResponse.body).toHaveProperty('success', true);
      expect(updateResponse.body.data.id).toBe(productId);
      expect(updateResponse.body.data.name).toContain('Updated Product Name');
      expect(updateResponse.body.data.name).toContain('(Basalam-TEST789)');
      expect(updateResponse.body.data.price).toBe(89.99);
      expect(updateResponse.body.data.stock).toBe(40);
      expect(updateResponse.body.meta.isUpdate).toBe(true);
    });

    test('should replace old image when updating product with new image', async () => {
      const basalamProductData = {
        basalamId: 'TEST999',
        name: 'Product With Image',
        description: 'Test product',
        price: 59.99,
        stock: 20,
        imageUrl: 'https://example.com/old-image.jpg',
        categoryId: testCategory.id
      };

      // Mock old image download
      nock('https://example.com')
        .get('/old-image.jpg')
        .reply(200, mockImageBuffer, {
          'content-type': 'image/jpeg'
        });

      // Create product with image
      const createResponse = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      const oldImageUrl = createResponse.body.data.images[0].url;

      // Mock new image download
      nock('https://example.com')
        .get('/new-image.jpg')
        .reply(200, mockImageBuffer, {
          'content-type': 'image/jpeg'
        });

      // Update with new image
      const updatedData = {
        ...basalamProductData,
        imageUrl: 'https://example.com/new-image.jpg'
      };

      const updateResponse = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(updateResponse.body.data.images.length).toBe(1);
      expect(updateResponse.body.data.images[0].url).not.toBe(oldImageUrl);
      expect(updateResponse.body.meta.imageCreated).toBe(true);
    });
  });

  describe('POST /api/v1/admin/basalam/sync-product - Error Handling', () => {
    test('should handle invalid image URL gracefully', async () => {
      const basalamProductData = {
        basalamId: 'TEST111',
        name: 'Product Invalid Image',
        description: 'Test product',
        price: 39.99,
        stock: 15,
        imageUrl: 'https://invalid-domain-that-does-not-exist.com/image.jpg',
        categoryId: testCategory.id
      };

      // Mock network failure
      nock('https://invalid-domain-that-does-not-exist.com')
        .get('/image.jpg')
        .replyWithError('Network error');

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toContain('(Basalam-TEST111)');
      expect(response.body.data.images.length).toBe(0);
      expect(response.body.message).toContain('image download failed');
      expect(response.body.meta.imageCreated).toBe(false);
    });

    test('should handle network timeout during image download', async () => {
      const basalamProductData = {
        basalamId: 'TEST222',
        name: 'Product Timeout',
        description: 'Test product',
        price: 29.99,
        stock: 10,
        imageUrl: 'https://example.com/slow-image.jpg',
        categoryId: testCategory.id
      };

      // Mock timeout
      nock('https://example.com')
        .get('/slow-image.jpg')
        .delayConnection(15000)
        .reply(200, mockImageBuffer);

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.images.length).toBe(0);
      expect(response.body.meta.imageCreated).toBe(false);
    });

    test('should reject invalid content type for image', async () => {
      const basalamProductData = {
        basalamId: 'TEST333',
        name: 'Product Invalid Type',
        description: 'Test product',
        price: 19.99,
        stock: 5,
        imageUrl: 'https://example.com/not-an-image.txt',
        categoryId: testCategory.id
      };

      // Mock non-image response
      nock('https://example.com')
        .get('/not-an-image.txt')
        .reply(200, 'This is text, not an image', {
          'content-type': 'text/plain'
        });

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basalamProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.images.length).toBe(0);
      expect(response.body.meta.imageCreated).toBe(false);
    });

    test('should reject missing required fields', async () => {
      const invalidData = {
        basalamId: 'TEST444',
        name: 'Test Product'
        // Missing price, stock, categoryId
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject invalid price', async () => {
      const invalidData = {
        basalamId: 'TEST555',
        name: 'Test Product',
        description: 'Test',
        price: -10,
        stock: 10,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject invalid stock', async () => {
      const invalidData = {
        basalamId: 'TEST666',
        name: 'Test Product',
        description: 'Test',
        price: 50,
        stock: -5,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject discount price greater than regular price', async () => {
      const invalidData = {
        basalamId: 'TEST777',
        name: 'Test Product',
        description: 'Test',
        price: 50,
        discountPrice: 60,
        stock: 10,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject non-admin user', async () => {
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

      const userToken = userLogin.body.token;

      const basalamProductData = {
        basalamId: 'TEST888',
        name: 'Test Product',
        description: 'Test',
        price: 50,
        stock: 10,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .set('Authorization', `Bearer ${userToken}`)
        .send(basalamProductData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject unauthenticated request', async () => {
      const basalamProductData = {
        basalamId: 'TEST999',
        name: 'Test Product',
        description: 'Test',
        price: 50,
        stock: 10,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/v1/admin/basalam/sync-product')
        .send(basalamProductData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
