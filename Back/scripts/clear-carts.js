const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearCarts() {
  try {
    console.log('🛒 Clearing all user carts...');

    // Delete cart items first (foreign key constraint)
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deletedCartItems.count} cart items`);

    // Delete carts
    const deletedCarts = await prisma.cart.deleteMany({});
    console.log(`✅ Deleted ${deletedCarts.count} carts`);

    console.log('\n🎉 All user carts cleared successfully!');
    console.log('📝 Note: Products and users remain unchanged');

  } catch (error) {
    console.error('❌ Error clearing carts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCarts();