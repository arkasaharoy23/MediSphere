const multer = require('multer');

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, or PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});

module.exports = upload;