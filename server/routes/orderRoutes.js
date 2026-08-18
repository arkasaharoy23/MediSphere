const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createOrder, listMine, cancelOrder, updateStatus } = require('../controllers/orderController');

const router = express.Router();

const prescriptionUpload = upload.fields([{ name: 'prescriptionImage', maxCount: 1 }]);

router.use(protect, authorizeRoles('patient', 'pharmacy'));

router.post('/', authorizeRoles('patient'), prescriptionUpload, createOrder);
router.get('/mine', listMine);
router.put('/:id/cancel', authorizeRoles('patient'), cancelOrder);
router.put('/:id/status', authorizeRoles('pharmacy'), updateStatus);

module.exports = router;