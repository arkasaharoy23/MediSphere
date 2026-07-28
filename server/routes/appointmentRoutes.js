const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createAppointment, listMine, cancelAppointment } = require('../controllers/appointmentController');

const router = express.Router();

router.use(protect);

router.post('/', authorizeRoles('patient'), createAppointment);
router.get('/mine', listMine);
router.patch('/:id/cancel', cancelAppointment);

module.exports = router;