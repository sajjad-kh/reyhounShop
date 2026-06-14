const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DOWNLOAD_TIMEOUT = 10000; // 10 seconds

async function downloadImage(url, filepath) {
  try {
    console.log(`   📥 دانلود از: ${url}`);
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT,
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Ensure directory exists
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });

    // Save file
    await fs.writeFile(filepath, response.data);
    
    const fileSize = response.data.length;
    console.log(`   ✅ ذخیره شد: ${filepath} (${(fileSize / 1024).toFixed(2)} KB)`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ خطا: ${error.message}`);
    return false;
  }
}

async function fixMissingImages() {
  try {
    console.log('🔍 بررسی تصاویر گمشده...\n');
    
    // Get all products with images
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: 'Basalam-'
        }
      },
      include: {
        images: true
      }
    });

    console.log(`📦 تعداد ${products.length} محصول باسلام پیدا شد\n`);

    let missingCount = 0;
    let downloadedCount = 0;
    let failedCount = 0;

    for (const product of products) {
      if (product.images.length === 0) {
        console.log(`⚠️  محصول "${product.name}" بدون تصویر است`);
        continue;
      }

      for (const image of product.images) {
        // Check if file exists
        const filepath = path.join(process.cwd(), image.url.replace(/^\//, ''));
        
        try {
          await fs.access(filepath);
          // File exists, skip
        } catch (error) {
          // File doesn't exist
          missingCount++;
          console.log(`\n❌ تصویر گمشده برای محصول: ${product.name}`);
          console.log(`   مسیر: ${image.url}`);
          
          // Extract Basalam ID from product name
          const match = product.name.match(/Basalam-(\d+)/);
          if (!match) {
            console.log(`   ⚠️  نمی‌توان ID باسلام را استخراج کرد`);
            failedCount++;
            continue;
          }
          
          const basalamId = match[1];
          
          // Try to download from Basalam
          // We need to construct the Basalam image URL
          // Format: https://basalam.com/picture/{id}/original
          const basalamImageUrl = `https://basalam.com/picture/${basalamId}/original`;
          
          console.log(`   🔄 تلاش برای دانلود مجدد...`);
          const success = await downloadImage(basalamImageUrl, filepath);
          
          if (success) {
            downloadedCount++;
          } else {
            failedCount++;
          }
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 خلاصه نتایج:');
    console.log(`   - تصاویر گمشده: ${missingCount}`);
    console.log(`   - دانلود موفق: ${downloadedCount}`);
    console.log(`   - دانلود ناموفق: ${failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ خطا:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingImages();
