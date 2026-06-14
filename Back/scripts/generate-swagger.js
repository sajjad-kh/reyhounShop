/**
 * Generate and save swagger.json file
 * This script generates the OpenAPI specification and saves it as a JSON file
 */

const fs = require('fs');
const path = require('path');
const { specs } = require('../src/config/swagger');

// Generate the swagger.json file
function generateSwaggerJson() {
  try {
    console.log('🔄 Generating swagger.json...');
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the swagger specification to file
    const outputPath = path.join(outputDir, 'swagger.json');
    fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));
    
    console.log('✅ swagger.json generated successfully!');
    console.log(`📁 File location: ${outputPath}`);
    console.log(`📊 Total endpoints documented: ${countEndpoints(specs)}`);
    console.log(`🏷️  Tags: ${specs.tags?.map(tag => tag.name).join(', ') || 'None'}`);
    
    // Also create a minified version
    const minifiedPath = path.join(outputDir, 'swagger.min.json');
    fs.writeFileSync(minifiedPath, JSON.stringify(specs));
    console.log(`📦 Minified version: ${minifiedPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('❌ Error generating swagger.json:', error.message);
    process.exit(1);
  }
}

// Count total endpoints in the specification
function countEndpoints(spec) {
  if (!spec.paths) return 0;
  
  let count = 0;
  Object.keys(spec.paths).forEach(path => {
    Object.keys(spec.paths[path]).forEach(method => {
      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
        count++;
      }
    });
  });
  
  return count;
}

// Run the generator
if (require.main === module) {
  generateSwaggerJson();
}

module.exports = { generateSwaggerJson };