const express = require('express');
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

router.post('/', authorizeRoles('patient'), createAppointment);
router.get('/mine', listMine);
router.patch('/:id/cancel', cancelAppointment);
router.patch('/:id/confirm', authorizeRoles('doctor'), confirmAppointment);
router.patch('/:id/complete', authorizeRoles('doctor'), completeAppointment);

module.exports = router;