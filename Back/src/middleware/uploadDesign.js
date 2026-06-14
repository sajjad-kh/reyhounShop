const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = path.join(__dirname, '../../uploads/designs');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, uploadPath);
  },

  filename: (_, file, cb) => {
    const unique =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, `design-${unique}${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  const allowed = [
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('INVALID_FILE_TYPE'));
  }

  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});