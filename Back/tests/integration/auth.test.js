const request = require('supertest');
const app = require('../../src/server');

describe('Authentication API Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user data
    testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890'
    };
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject registration with invalid email', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = { ...testUser, password: '123' };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate email registration', async () => {
      // Register user first time
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register same email again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register user before login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      
      authToken = response.body.token;
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/users/profile', () => {
    beforeEach(async () => {
      // Register and login user
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});