const request = require('supertest');
const app = require('../../src/server');

/**
 * API testing utilities for making authenticated requests
 */
class ApiTestUtils {
  constructor() {
    this.app = app;
  }

  /**
   * Make authenticated request with JWT token
   */
  authenticatedRequest(method, endpoint, token) {
    return request(this.app)
      [method](endpoint)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * Make unauthenticated request
   */
  request(method, endpoint) {
    return request(this.app)[method](endpoint);
  }

  /**
   * Login and get JWT token
   */
  async loginUser(email, password) {
    const response = await request(this.app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    
    if (response.status === 200) {
      return response.body.token;
    }
    throw new Error(`Login failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  /**
   * Register a new user and return the user data
   */
  async registerUser(userData) {
    const response = await request(this.app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    if (response.status === 201) {
      return response.body.user;
    }
    throw new Error(`Registration failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  /**
   * Create a product via API
   */
  async createProduct(token, productData) {
    const response = await this.authenticatedRequest('post', '/api/v1/products', token)
      .send(productData);
    
    if (response.status === 201) {
      return response.body.product;
    }
    throw new Error(`Product creation failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  /**
   * Create an order via API
   */
  async createOrder(token, orderData) {
    const response = await this.authenticatedRequest('post', '/api/v1/orders', token)
      .send(orderData);
    
    if (response.status === 201) {
      return response.body.order;
    }
    throw new Error(`Order creation failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  /**
   * Add item to cart via API
   */
  async addToCart(token, productId, quantity = 1) {
    const response = await this.authenticatedRequest('post', '/api/v1/cart/items', token)
      .send({ productId, quantity });
    
    if (response.status === 201) {
      return response.body.cartItem;
    }
    throw new Error(`Add to cart failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  /**
   * Get user cart via API
   */
  async getCart(token) {
    const response = await this.authenticatedRequest('get', '/api/v1/cart', token);
    
    if (response.status === 200) {
      return response.body.cart;
    }
    throw new Error(`Get cart failed: ${response.body.error?.message || 'Unknown error'}`);
  }
}

module.exports = ApiTestUtils;