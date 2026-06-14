const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateAddressData() {
  try {
    console.log('🔄 Migrating existing address data...');

    // Get all addresses without fullName or phone
    const addresses = await prisma.address.findMany({
      where: {
        OR: [
          { fullName: null },
          { phone: null }
        ]
      },
      include: {
        user: true
      }
    });

    console.log(`📋 Found ${addresses.length} addresses to update`);

    for (const address of addresses) {
      const updateData = {};
      
      // Set fullName from user name if not exists
      if (!address.fullName) {
        updateData.fullName = address.user.name;
      }
      
      // Set phone from user phone if not exists
      if (!address.phone) {
        updateData.phone = address.user.phone || '';
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.address.update({
          where: { id: address.id },
          data: updateData
        });

        console.log(`✅ Updated address ${address.id}: ${address.title}`);
      }
    }

    console.log('\n🎉 Address data migration completed!');

  } catch (error) {
    console.error('❌ Error migrating address data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAddressData();