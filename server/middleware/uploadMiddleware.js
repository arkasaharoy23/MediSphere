const multer = require('multer');

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// These fields hold certificates that get reviewed by admins and doctors —
// each is locked to a single specific format for consistent, predictable review.
const fieldTypeOverrides = {
  registrationCertificate: 'image/jpeg',
  degreeCertificate: 'application/pdf',
  additionalDegreeCertificate: 'application/pdf',
  testReport: 'application/pdf'
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const requiredType = fieldTypeOverrides[file.fieldname];
  if (requiredType) {
    if (file.mimetype === requiredType) {
      cb(null, true);
    } else {
      const label = requiredType === 'application/pdf' ? 'PDF' : 'JPG';
      cb(new Error(`${file.fieldname} must be a ${label} file`), false);
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