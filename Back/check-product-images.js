const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductImages() {
  try {
    console.log('🔍 بررسی تصاویر محصولات در دیتابیس...\n');
    
    const products = await prisma.product.findMany({
      include: {
        images: true,
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (products.length === 0) {
      console.log('❌ هیچ محصولی در دیتابیس پیدا نشد.');
      return;
    }

    console.log(`✅ تعداد ${products.length} محصول پیدا شد:\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    products.forEach((product, index) => {
      console.log(`\n📦 محصول ${index + 1}:`);
      console.log(`   ID: ${product.id}`);
      console.log(`   نام: ${product.name}`);
      console.log(`   دسته‌بندی: ${product.category.name}`);
      console.log(`   قیمت: ${product.price.toLocaleString('fa-IR')} ریال`);
      console.log(`   موجودی: ${product.stock}`);
      console.log(`   تعداد تصاویر: ${product.images.length}`);
      
      if (product.images.length > 0) {
        console.log(`   تصاویر:`);
        product.images.forEach((img, imgIndex) => {
          console.log(`      ${imgIndex + 1}. URL: ${img.url}`);
          console.log(`         اصلی: ${img.isMain ? 'بله' : 'خیر'}`);
        });
      } else {
        console.log(`   ⚠️  بدون تصویر`);
      }
      console.log('───────────────────────────────────────────────────────────────────────────────');
    });

    console.log(`\n📊 خلاصه آمار:`);
    console.log(`   - کل محصولات: ${products.length}`);
    console.log(`   - محصولات با تصویر: ${products.filter(p => p.images.length > 0).length}`);
    console.log(`   - محصولات بدون تصویر: ${products.filter(p => p.images.length === 0).length}`);
    
    const totalImages = products.reduce((sum, p) => sum + p.images.length, 0);
    console.log(`   - کل تصاویر: ${totalImages}`);

  } catch (error) {
    console.error('❌ خطا در دریافت اطلاعات:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductImages();
