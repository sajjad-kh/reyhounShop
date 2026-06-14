const { PrismaClient } = require('../node_modules/.prisma/test-client');
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '7d';

// Global test database instance
global.testDb = new PrismaClient();

// Setup and teardown hooks
beforeAll(async () => {
  // Ensure test database is clean
  await global.testDb.$executeRaw`PRAGMA foreign_keys = OFF;`;
  
  // Clean all tables
  const tables = await global.testDb.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
  `;
  
  for (const table of tables) {
    await global.testDb.$executeRawUnsafe(`DELETE FROM "${table.name}";`);
  }
  
  await global.testDb.$executeRaw`PRAGMA foreign_keys = ON;`;
});

afterAll(async () => {
  await global.testDb.$disconnect();
});

// Clean database between tests
afterEach(async () => {
  // Clean all tables except migrations
  const tables = await global.testDb.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
  `;
  
  await global.testDb.$executeRaw`PRAGMA foreign_keys = OFF;`;
  
  for (const table of tables) {
    await global.testDb.$executeRawUnsafe(`DELETE FROM "${table.name}";`);
  }
  
  await global.testDb.$executeRaw`PRAGMA foreign_keys = ON;`;
});