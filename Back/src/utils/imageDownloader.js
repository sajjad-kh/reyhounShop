/**
 * Image Downloader Utility
 * Downloads images from external URLs and saves them locally
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('./logger');

const logger = createLogger('ImageDownloader');

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const DOWNLOAD_TIMEOUT = 10000; // 10 seconds
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

/**
 * Download an image from an external URL and save it locally
 * @param {string} url - External image URL
 * @param {string} filename - Desired filename for the saved image
 * @returns {Promise<string|null>} Local file path on success, null on failure
 */
async function downloadImage(url, filename) {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      logger.error('Invalid URL provided', { url });
      return null;
    }

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      logger.error('Invalid filename provided', { filename });
      return null;
    }

    logger.info('Starting image download', { url, filename });

    // Download image with timeout and size limit
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

    // Validate content type
    const contentType = response.headers['content-type'];
    if (!contentType || !ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase())) {
      logger.error('Invalid image content type', { 
        contentType, 
        url,
        allowedTypes: ALLOWED_IMAGE_TYPES 
      });
      return null;
    }

    // Validate file size
    const fileSize = response.data.length;
    if (fileSize > MAX_FILE_SIZE) {
      logger.error('Image file size exceeds limit', { 
        fileSize, 
        maxSize: MAX_FILE_SIZE,
        url 
      });
      return null;
    }

    // Ensure uploads/products directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save image to local file system
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, response.data);

    // Return relative path for database storage
    const relativePath = `/uploads/products/${filename}`;
    
    logger.info('Image downloaded successfully', { 
      url, 
      filename, 
      filepath: relativePath,
      fileSize 
    });

    return relativePath;

  } catch (error) {
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      logger.error('Image download timeout', { 
        url, 
        timeout: DOWNLOAD_TIMEOUT,
        error: error.message 
      });
    } else if (error.code === 'ERR_BAD_REQUEST' || error.response?.status >= 400) {
      logger.error('Image download failed - HTTP error', { 
        url, 
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.message 
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      logger.error('Image download failed - Network error', { 
        url, 
        error: error.message 
      });
    } else {
      logger.error('Image download failed - Unknown error', { 
        url, 
        error: error.message,
        stack: error.stack 
      });
    }

    return null;
  }
}

/**
 * Generate a unique filename for a downloaded image
 * @param {string} basalamId - Basalam product ID
 * @param {string} imageUrl - Original image URL
 * @returns {string} Generated filename
 */
function generateFilename(basalamId, imageUrl) {
  try {
    // Extract extension from URL
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    let ext = path.extname(pathname).toLowerCase();
    
    // Default to .jpg if no extension found
    if (!ext || !['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      ext = '.jpg';
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `basalam-${basalamId}-${timestamp}${ext}`;
    
    return filename;
  } catch (error) {
    logger.error('Failed to generate filename', { 
      basalamId, 
      imageUrl, 
      error: error.message 
    });
    
    // Fallback filename
    return `basalam-${basalamId}-${Date.now()}.jpg`;
  }
}

module.exports = {
  downloadImage,
  generateFilename,
  MAX_FILE_SIZE,
  DOWNLOAD_TIMEOUT,
  ALLOWED_IMAGE_TYPES
};
