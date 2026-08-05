const express = require('express');
const rateLimit = require('express-rate-limit');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { register, login } = require('../controllers/authController');
const { success } = require('../utils/response');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { ok: false, message: 'Too many attempts, please try again later' }
});

const registerUpload = upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'rcDocument', maxCount: 1 },
  { name: 'driverLicenseDoc', maxCount: 1 },
  { name: 'driverPhoto', maxCount: 1 },
  { name: 'driverIdDoc', maxCount: 1 },
  { name: 'permitDocument', maxCount: 1 }
]);

router.post('/register', authLimiter, registerUpload, register);
router.post('/login', authLimiter, login);
router.get('/session', protect, (req, res) => success(res, req.user));

module.exports = router;