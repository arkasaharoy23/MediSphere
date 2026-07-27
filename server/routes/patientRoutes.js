const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/patientController');

const router = express.Router();

router.use(protect, authorizeRoles('patient'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;