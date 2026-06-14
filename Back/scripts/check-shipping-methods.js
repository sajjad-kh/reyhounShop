const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkShippingMethods() {
  try {
    const methods = await prisma.shippingMethod.findMany({
      where: { isActive: true }
    });

    console.log('📦 Active Shipping Methods:', methods.length);
    
    if (methods.length === 0) {
      console.log('⚠️  No active shipping methods found!');
      console.log('💡 You need to sync shipping methods first.');
    } else {
      console.log('\n✅ Available shipping methods:');
      methods.forEach(method => {
        console.log(`  - ID: ${method.id}, Name: ${method.name}, Cost: ${method.baseCost}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShippingMethods();
