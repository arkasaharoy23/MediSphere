const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { listMine } = require('../controllers/medicalRecordController');

const router = express.Router();

router.get('/mine', protect, authorizeRoles('patient'), listMine);

module.exports = router;