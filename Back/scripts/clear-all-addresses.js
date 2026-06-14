const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllAddresses() {
  try {
    console.log('🗑️ Clearing all addresses...');

    const deletedAddresses = await prisma.address.deleteMany({});
    console.log(`✅ Deleted ${deletedAddresses.count} addresses`);

    console.log('\n🎉 All addresses cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing addresses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllAddresses();