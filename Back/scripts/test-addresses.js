const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAddresses() {
  try {
    console.log('🏠 Testing addresses...');

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: 'user@test.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 User found: ${user.name} (ID: ${user.id})`);

    // Get addresses
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { id: 'desc' }
      ]
    });

    console.log(`🏠 Found ${addresses.length} addresses:`);
    addresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ${addr.title} - ${addr.city}, ${addr.province}`);
    });

    // Test creating an address
    console.log('\n🔧 Creating test address...');
    const newAddress = await prisma.address.create({
      data: {
        userId: user.id,
        title: 'خانه',
        address: 'تهران، خیابان ولیعصر، پلاک 123',
        city: 'تهران',
        province: 'تهران',
        postalCode: '1234567890',
        isDefault: true
      }
    });

    console.log('✅ Test address created:', newAddress.title);

  } catch (error) {
    console.error('❌ Error testing addresses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAddresses();