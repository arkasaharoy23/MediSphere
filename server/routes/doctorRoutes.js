const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, listMyPatients } = require('../controllers/doctorController');

const router = express.Router();

router.use(protect, authorizeRoles('doctor'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/patients', listMyPatients);

module.exports = router;