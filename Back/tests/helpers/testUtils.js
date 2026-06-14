const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Test data factory functions
 */
class TestDataFactory {
  static async createUser(overrides = {}) {
    const defaultUser = {
      email: `test${Date.now()}@example.com`,
      password: await bcrypt.hash('password123', 10),
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
      role: 'CUSTOMER',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: false,
      ...overrides
    };

    return await global.testDb.user.create({
      data: defaultUser
    });
  }

  static async createCategory(overrides = {}) {
    const defaultCategory = {
      name: `Test Category ${Date.now()}`,
      description: 'Test category description',
      isActive: true,
      ...overrides
    };

    return await global.testDb.category.create({
      data: defaultCategory
    });
  }

  static async createProduct(categoryId, overrides = {}) {
    const defaultProduct = {
      name: `Test Product ${Date.now()}`,
      description: 'Test product description',
      price: 99.99,
      stock: 100,
      categoryId,
      isActive: true,
      ...overrides
    };

    return await global.testDb.product.create({
      data: defaultProduct
    });
  }

  static async createOrder(userId, overrides = {}) {
    const defaultOrder = {
      userId,
      status: 'PENDING',
      totalAmount: 99.99,
      trackingCode: `TRK${Date.now()}`,
      ...overrides
    };

    return await global.testDb.order.create({
      data: defaultOrder
    });
  }

  static async createCart(userId) {
    return await global.testDb.cart.create({
      data: {
        userId,
        totalAmount: 0
      }
    });
  }

  static generateJWT(userId, role = 'CUSTOMER') {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }
}

/**
 * Test assertion helpers
 */
class TestAssertions {
  static expectValidUser(user) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  }

  static expectValidProduct(product) {
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('stock');
    expect(product).toHaveProperty('categoryId');
    expect(product).toHaveProperty('createdAt');
    expect(product).toHaveProperty('updatedAt');
  }

  static expectValidOrder(order) {
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('userId');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('totalAmount');
    expect(order).toHaveProperty('trackingCode');
    expect(order).toHaveProperty('createdAt');
    expect(order).toHaveProperty('updatedAt');
  }

  static expectApiError(response, statusCode, errorCode = null) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    if (errorCode) {
      expect(response.body.error).toHaveProperty('code', errorCode);
    }
  }

  static expectApiSuccess(response, statusCode = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).not.toHaveProperty('error');
  }
}

/**
 * Database cleanup utilities
 */
class TestCleanup {
  static async cleanAllTables() {
    const tables = await global.testDb.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
    `;
    
    await global.testDb.$executeRaw`PRAGMA foreign_keys = OFF;`;
    
    for (const table of tables) {
      await global.testDb.$executeRawUnsafe(`DELETE FROM "${table.name}";`);
    }
    
    await global.testDb.$executeRaw`PRAGMA foreign_keys = ON;`;
  }

  static async cleanTable(tableName) {
    await global.testDb.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
  }
}

module.exports = {
  TestDataFactory,
  TestAssertions,
  TestCleanup
};