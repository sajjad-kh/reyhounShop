// Test script to check product images in database
const { getPrismaClient, connectDatabase } = require('./src/utils/database');

async function checkProductImages() {
  try {
    // Connect to database first
    await connectDatabase();
    
    const products = await getPrismaClient().product.findMany({
      include: {
        images: true
      },
      take: 10
    });

    console.log('\n=== Product Images Check ===\n');
    
    products.forEach(product => {
      console.log(`Product: ${product.name} (ID: ${product.id})`);
      console.log(`  Images count: ${product.images.length}`);
      
      if (product.images.length > 0) {
        product.images.forEach((img, index) => {
          console.log(`  Image ${index + 1}:`);
          console.log(`    ID: ${img.id}`);
          console.log(`    URL: ${img.url}`);
          console.log(`    Is Main: ${img.isMain}`);
        });
      } else {
        console.log('  No images found');
      }
      console.log('');
    });

    // Check all product images
    const allImages = await getPrismaClient().productImage.findMany({
      include: {
        product: true
      }
    });

    console.log(`\n=== Total Product Images in Database: ${allImages.length} ===\n`);
    
    if (allImages.length > 0) {
      allImages.forEach(img => {
        console.log(`Product: ${img.product.name} (ID: ${img.productId})`);
        console.log(`  Image ID: ${img.id}`);
        console.log(`  URL: "${img.url}"`);
        console.log(`  Is Main: ${img.isMain}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProductImages();
