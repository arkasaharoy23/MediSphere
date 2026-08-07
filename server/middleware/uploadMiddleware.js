const multer = require('multer');

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// These fields hold certificates that get reviewed by admins and doctors —
// restricted to JPG only for consistent, predictable scans.
const jpgOnlyFields = new Set(['registrationCertificate', 'degreeCertificate']);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (jpgOnlyFields.has(file.fieldname)) {
    if (file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error(`${file.fieldname} must be a JPG file`), false);
    }
    return;
  }

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