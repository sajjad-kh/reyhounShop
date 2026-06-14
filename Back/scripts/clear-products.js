const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearProducts() {
  try {
    console.log('🗑️ Clearing products and cart data...');

    // Delete cart items first (foreign key constraint)
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deletedCartItems.count} cart items`);

    // Delete carts
    const deletedCarts = await prisma.cart.deleteMany({});
    console.log(`✅ Deleted ${deletedCarts.count} carts`);

    // Delete product images
    const deletedImages = await prisma.productImage.deleteMany({});
    console.log(`✅ Deleted ${deletedImages.count} product images`);

    // Delete reviews
    const deletedReviews = await prisma.review.deleteMany({});
    console.log(`✅ Deleted ${deletedReviews.count} reviews`);

    // Delete wishlist items
    const deletedWishlist = await prisma.wishlist.deleteMany({});
    console.log(`✅ Deleted ${deletedWishlist.count} wishlist items`);

    // Delete products
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.count} products`);

    console.log('\n🎉 All products and related data cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearProducts();