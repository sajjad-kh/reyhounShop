const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.product.findUnique({
  where: { id: 24 },
  include: { images: true }
}).then(product => {
  console.log('محصول 24:');
  console.log(JSON.stringify(product, null, 2));
  prisma.$disconnect();
});
