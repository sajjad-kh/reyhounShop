// Script to fix products with undefined image URLs
const { getPrismaClient, connectDatabase } = require('./src/utils/database');

async function fixUndefinedImages() {
  try {
    // Connect to database first
    await connectDatabase();
    
    console.log('\n=== Fixing Products with Undefined Image URLs ===\n');
    
    // Find all images with undefined URLs
    const badImages = await getPrismaClient().productImage.findMany({
      where: {
        url: {
          contains: 'undefined'
        }
      },
      include: {
        product: true
      }
    });

    console.log(`Found ${badImages.length} images with undefined URLs\n`);

    // Delete these images
    for (const img of badImages) {
      console.log(`Deleting image ${img.id} from product "${img.product.name}" (ID: ${img.productId})`);
      console.log(`  URL: ${img.url}`);
      
      await getPrismaClient().productImage.delete({
        where: { id: img.id }
      });
      
      console.log(`  ✅ Deleted\n`);
    }

    console.log(`\n✅ Fixed ${badImages.length} images with undefined URLs`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUndefinedImages();
