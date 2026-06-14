const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkImageUrls() {
  try {
    console.log('🔍 بررسی URL های تصاویر محصولات...\n');
    
    const products = await prisma.product.findMany({
      where: {
        stock: {
          gt: 0
        }
      },
      include: {
        images: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📦 تعداد ${products.length} محصول فعال\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');

    products.forEach(product => {
      console.log(`\n📦 ${product.name} (ID: ${product.id})`);
      
      if (product.images.length === 0) {
        console.log('   ⚠️  بدون تصویر');
        return;
      }

      product.images.forEach((img, index) => {
        const hasFullUrl = img.url.startsWith('http://') || img.url.startsWith('https://');
        const hasRelativePath = img.url.startsWith('/');
        
        console.log(`   تصویر ${index + 1}:`);
        console.log(`      URL: ${img.url}`);
        console.log(`      نوع: ${hasFullUrl ? '🌐 URL کامل' : hasRelativePath ? '📁 مسیر نسبی' : '❓ نامشخص'}`);
        console.log(`      اصلی: ${img.isMain ? '✅' : '❌'}`);
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    
    // Count URL types
    const allImages = products.flatMap(p => p.images);
    const fullUrls = allImages.filter(img => img.url.startsWith('http://') || img.url.startsWith('https://')).length;
    const relativePaths = allImages.filter(img => img.url.startsWith('/') && !img.url.startsWith('http')).length;
    
    console.log('\n📊 خلاصه:');
    console.log(`   - کل تصاویر: ${allImages.length}`);
    console.log(`   - URL کامل: ${fullUrls}`);
    console.log(`   - مسیر نسبی: ${relativePaths}`);

  } catch (error) {
    console.error('❌ خطا:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrls();
