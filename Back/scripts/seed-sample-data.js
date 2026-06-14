const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('🌱 Starting to seed sample data...');

    // Create categories
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'Enternal'
        }
      }),
      prisma.category.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'Basalam'
        }
      }),
    ]);

    console.log('✅ Categories created:', categories.length);

    // Wait a bit for categories to be committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // No sample products - only categories
    const products = [];

    console.log('✅ Products created:', products.length);
    console.log('\n🎉 Sample data seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${products.length} products`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
