const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany();
    console.log('Total products:', products.length);
    products.forEach(p => {
      console.log(`- ${p.name} (ID: ${p.id}, Stock: ${p.stock})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
