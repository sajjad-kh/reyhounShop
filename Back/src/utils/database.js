const { databaseConfig } = require('../config/database');
const { databaseHealthCheck } = require('./databaseHealth');

let prisma = null;

/**
 * Connect to database using the new configuration system
 */
const connectDatabase = async () => {
  try {
    prisma = await databaseConfig.initialize();
    
    // Initialize health check with the prisma client
    databaseHealthCheck.initialize(prisma);
    
    // Log connection information
    const connectionInfo = databaseConfig.getConnectionInfo();
    console.log('📊 Database connection info:', {
      provider: connectionInfo.provider,
      ...(connectionInfo.host && { host: connectionInfo.host }),
      ...(connectionInfo.database && { database: connectionInfo.database }),
      ...(connectionInfo.file && { file: connectionInfo.file }),
    });
    
    return prisma;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from database
 */
const disconnectDatabase = async () => {
  try {
    await databaseConfig.disconnect();
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
};

/**
 * Get Prisma client instance
 */
const getPrismaClient = () => {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
};

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  get prisma() {
    if (!prisma) {
      console.warn('⚠️  Prisma client accessed before database connection. This may cause issues.');
      return null;
    }
    return prisma;
  },
  connectDatabase,
  disconnectDatabase,
  getPrismaClient,
  databaseConfig,
  databaseHealthCheck
};