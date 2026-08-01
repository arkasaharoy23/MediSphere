const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createPrescription, listMine } = require('../controllers/prescriptionController');

const router = express.Router();

router.use(protect, authorizeRoles('doctor'));

router.post('/', createPrescription);
router.get('/mine', listMine);

module.exports = router;