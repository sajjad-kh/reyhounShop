const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeRecentAddresses() {
  try {
    console.log('🗑️ Removing recent addresses...');

    // Get all addresses ordered by ID (newest first)
    const addresses = await prisma.address.findMany({
      orderBy: { id: 'desc' },
      take: 5 // Get last 5 addresses
    });

    console.log(`📋 Found ${addresses.length} recent addresses:`);
    addresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ID: ${addr.id} - ${addr.title} (${addr.city})`);
    });

    // Delete the last 3 addresses
    const addressesToDelete = addresses.slice(0, 3);
    
    if (addressesToDelete.length > 0) {
      console.log(`\n🗑️ Deleting ${addressesToDelete.length} addresses...`);
      
      for (const addr of addressesToDelete) {
        await prisma.address.delete({
          where: { id: addr.id }
        });
        console.log(`✅ Deleted: ${addr.title} (ID: ${addr.id})`);
      }
    }

    console.log('\n🎉 Recent addresses removed successfully!');

  } catch (error) {
    console.error('❌ Error removing addresses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeRecentAddresses();