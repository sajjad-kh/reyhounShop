// Test image download from Basalam
const { downloadImage, generateFilename } = require('./src/utils/imageDownloader');

async function testImageDownload() {
  try {
    console.log('\n=== Testing Image Download ===\n');
    
    // Test with a sample Basalam image URL
    // Replace this with an actual Basalam image URL
    const testImageUrl = 'https://dkstatics-public.digikala.com/digikala-products/120753485.jpg';
    const basalamId = 'test-123';
    
    console.log(`Test Image URL: ${testImageUrl}`);
    console.log(`Basalam ID: ${basalamId}\n`);
    
    // Generate filename
    const filename = generateFilename(basalamId, testImageUrl);
    console.log(`Generated filename: ${filename}\n`);
    
    // Try to download
    console.log('Attempting to download image...\n');
    const localPath = await downloadImage(testImageUrl, filename);
    
    if (localPath) {
      console.log(`✅ Success! Image downloaded to: ${localPath}`);
    } else {
      console.log('❌ Failed to download image');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testImageDownload();
