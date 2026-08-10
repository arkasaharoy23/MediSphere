const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createBooking,
  listMine,
  cancelBooking,
  updateStatus,
  uploadReport
} = require('../controllers/testBookingController');

const router = express.Router();

const reportUpload = upload.fields([{ name: 'testReport', maxCount: 1 }]);

router.use(protect, authorizeRoles('patient', 'lab'));

router.post('/', authorizeRoles('patient'), createBooking);
router.get('/mine', listMine);
router.put('/:id/cancel', authorizeRoles('patient'), cancelBooking);
router.put('/:id/status', authorizeRoles('lab'), updateStatus);
router.post('/:id/report', authorizeRoles('lab'), reportUpload, uploadReport);

module.exports = router;