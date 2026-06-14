const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function checkActiveProductImages() {
  try {
    console.log('🔍 بررسی تصاویر محصولات فعال...\n');
    
    // Get active products (with stock > 0)
    const products = await prisma.product.findMany({
      where: {
        stock: {
          gt: 0
        }
      },
      include: {
        images: true,
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📦 تعداد ${products.length} محصول فعال پیدا شد\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');

    let totalMissing = 0;
    let totalExists = 0;

    for (const product of products) {
      console.log(`\n📦 محصول: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   موجودی: ${product.stock}`);
      console.log(`   تعداد تصاویر در DB: ${product.images.length}`);

      if (product.images.length === 0) {
        console.log(`   ⚠️  بدون تصویر در دیتابیس`);
        continue;
      }

      for (const image of product.images) {
        const filepath = path.join(process.cwd(), image.url.replace(/^\//, ''));
        
        try {
          const stats = await fs.stat(filepath);
          console.log(`   ✅ تصویر موجود: ${image.url} (${(stats.size / 1024).toFixed(2)} KB)`);
          totalExists++;
        } catch (error) {
          console.log(`   ❌ تصویر گمشده: ${image.url}`);
          console.log(`      مسیر کامل: ${filepath}`);
          totalMissing++;
        }
      }
      console.log('───────────────────────────────────────────────────────────────────────────────');
    }

    console.log(`\n📊 خلاصه نتایج:`);
    console.log(`   - محصولات فعال: ${products.length}`);
    console.log(`   - تصاویر موجود: ${totalExists}`);
    console.log(`   - تصاویر گمشده: ${totalMissing}`);

  } catch (error) {
    console.error('❌ خطا:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActiveProductImages();
