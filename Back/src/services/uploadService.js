const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class UploadService {

  constructor() {
    this.allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    this.maxFileSize = 5 * 1024 * 1024;
  }

  /* =========================================================
     BASE STORAGE FACTORY
  ========================================================= */

  createStorage(folder, prefix) {
    return multer.diskStorage({

      destination: async (req, file, cb) => {
        try {
          const uploadDir = path.join(
            process.cwd(),
            'uploads',
            folder
          );

          await fs.mkdir(uploadDir, { recursive: true });

          cb(null, uploadDir);
        } catch (err) {
          cb(err);
        }
      },

      filename: (req, file, cb) => {
        try {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);

          const ext = path.extname(file.originalname || '');

          cb(null, `${prefix}-${unique}${ext}`);
        } catch (err) {
          cb(err);
        }
      }
    });
  }

  /* =========================================================
     BASE FILTER
  ========================================================= */

  fileFilter(req, file, cb) {
    if (!this.allowedTypes.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'), false);
    }
    cb(null, true);
  }

  /* =========================================================
     BASE UPLOADER
  ========================================================= */

  uploader(folder, prefix, maxFiles = 10) {
    return multer({
      storage: this.createStorage(folder, prefix),
      fileFilter: this.fileFilter.bind(this),
      limits: {
        fileSize: this.maxFileSize,
        files: maxFiles
      }
    });
  }

  /* =========================================================
     PRODUCT UPLOAD (MULTIPLE IMAGES)
  ========================================================= */

  get productUpload() {
    return this.uploader('products', 'product');
  }

  multiple(fieldName, maxCount = 10) {
    return this.productUpload.array(fieldName, maxCount);
  }

  /* =========================================================
     PAYMENT PROOF UPLOAD (SINGLE FILE)
  ========================================================= */

  get paymentProofUpload() {
    return this.uploader('payment-proofs', 'payment', 1);
  }

  singlePaymentProof() {
    return this.paymentProofUpload.single('paymentProof');
  }

  /* =========================================================
     ORDER FILES (MULTIPLE USER FILES)
  ========================================================= */

  get orderFilesUpload() {
    return this.uploader('order-files', 'order-file');
  }

  multipleOrderFiles(fieldName = 'userFiles', max = 10) {
    return this.orderFilesUpload.array(fieldName, max);
  }

  /* =========================================================
     ORDER MIXED UPLOAD (payment + files)
  ========================================================= */

  get orderUpload() {
    return multer({
      storage: multer.diskStorage({

        destination: async (req, file, cb) => {
          try {
            let folder = 'misc';

            if (file.fieldname === 'paymentProof') {
              folder = 'payment-proofs';
            } else if (file.fieldname === 'userFiles') {
              folder = 'order-files';
            }

            const uploadDir = path.join(
              process.cwd(),
              'uploads',
              folder
            );

            await fs.mkdir(uploadDir, { recursive: true });

            cb(null, uploadDir);

          } catch (err) {
            cb(err);
          }
        },

        filename: (req, file, cb) => {
          try {
            const unique =
              Date.now() + '-' + Math.round(Math.random() * 1e9);

            const ext = path.extname(file.originalname || '');

            let prefix = 'file';

            if (file.fieldname === 'paymentProof') {
              prefix = 'payment';
            } else if (file.fieldname === 'userFiles') {
              prefix = 'order-file';
            }

            cb(null, `${prefix}-${unique}${ext}`);

          } catch (err) {
            cb(err);
          }
        }
      }),

      fileFilter: this.fileFilter.bind(this),

      limits: {
        fileSize: this.maxFileSize,
        files: 11
      }
    });
  }

  /* =========================================================
     VALIDATE FILES (manual check)
  ========================================================= */

  validateFiles(files = []) {
    const errors = [];

    for (const file of files) {

      if (file.size > this.maxFileSize) {
        errors.push(`${file.originalname} exceeds 5MB`);
      }

      if (!this.allowedTypes.includes(file.mimetype)) {
        errors.push(`${file.originalname} has invalid type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /* =========================================================
     FILE URL HELPER
  ========================================================= */

  getFileUrl(folder, filename) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }

  /* =========================================================
     DELETE FILE
  ========================================================= */

  async deleteFile(folder, filename) {
    try {
      const filePath = path.join(
        process.cwd(),
        'uploads',
        folder,
        filename
      );

      await fs.unlink(filePath);
      return true;

    } catch (err) {
      console.error('DELETE_FILE_ERROR:', err);
      return false;
    }
  }
}

module.exports = new UploadService();