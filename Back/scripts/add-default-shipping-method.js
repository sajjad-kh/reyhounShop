const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDefaultShippingMethod() {
  try {
    console.log('📦 Adding default shipping method...\n');

    // Check if any shipping methods exist
    const existingMethods = await prisma.shippingMethod.findMany();
    
    if (existingMethods.length > 0) {
      console.log('✅ Shipping methods already exist:', existingMethods.length);
      existingMethods.forEach(method => {
        console.log(`  - ID: ${method.id}, Name: ${method.name}`);
      });
      return;
    }

    // Create default shipping method
    const defaultMethod = await prisma.shippingMethod.create({
      data: {
        basalamId: 1,
        name: 'ارسال عادی',
        description: 'ارسال با پست معمولی',
        baseCost: 50000,
        additionalCost: 10000,
        additionalDimensionsCost: 5000,
        isPrivate: false,
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    console.log('✅ Default shipping method created!');
    console.log('📦 ID:', defaultMethod.id);
    console.log('📝 Name:', defaultMethod.name);
    console.log('💰 Base Cost:', defaultMethod.baseCost);
    console.log('\n🎉 You can now sync products from Basalam!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultShippingMethod();
