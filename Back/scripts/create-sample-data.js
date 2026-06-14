const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🛍️ Creating sample data...');

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: 'user@test.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Create sample products
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'لپ تاپ ایسوس',
          description: 'لپ تاپ ایسوس با پردازنده قدرتمند',
          price: 25000000,
          stock: 10,
          reservedStock: 0,
          categoryId: 1,
          isActive: true
        }
      }),
      prisma.product.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'گوشی سامسونگ',
          description: 'گوشی هوشمند سامسونگ با کیفیت بالا',
          price: 15000000,
          stock: 15,
          reservedStock: 0,
          categoryId: 1,
          isActive: true
        }
      })
    ]);

    console.log(`✅ Created ${products.length} products`);

    // Create or get cart
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id }
      });
    }

    // Add items to cart
    const cartItems = await Promise.all([
      prisma.cartItem.upsert({
        where: { id: 1 },
        update: { quantity: 2 },
        create: {
          cartId: cart.id,
          productId: 1,
          quantity: 2
        }
      }),
      prisma.cartItem.upsert({
        where: { id: 2 },
        update: { quantity: 1 },
        create: {
          cartId: cart.id,
          productId: 2,
          quantity: 1
        }
      })
    ]);

    console.log(`✅ Created ${cartItems.length} cart items`);
    console.log('\n🛒 Cart contents:');
    
    for (const item of cartItems) {
      const product = products.find(p => p.id === item.productId);
      console.log(`  - ${product.name} x${item.quantity} = ${(product.price * item.quantity).toLocaleString()} ریال`);
    }

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();