const express = require('express');
const { requireVerified } = require('../middleware/verificationMiddleware');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createAppointment,
  listMine,
  cancelAppointment,
  confirmAppointment,
  completeAppointment
} = require('../controllers/appointmentController');

const router = express.Router();

router.use(protect);

router.post('/',protect, authorizeRoles('patient'), requireVerified, createAppointment);
router.get('/mine', listMine);
router.patch('/:id/cancel', cancelAppointment);
router.patch('/:id/confirm', protect, authorizeRoles('doctor'), requireVerified, confirmAppointment);
router.patch('/:id/complete', protect, authorizeRoles('doctor'), requireVerified, completeAppointment);

module.exports = router;