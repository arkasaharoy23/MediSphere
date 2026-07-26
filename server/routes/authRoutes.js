const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { register, login } = require('../controllers/authController');
const { success } = require('../utils/response');

const router = express.Router();

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

router.post('/register', registerUpload, register);
router.post('/login', login);
router.get('/session', protect, (req, res) => success(res, req.user));

module.exports = router;