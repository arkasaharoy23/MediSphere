const express = require('express');
const { protect, authorizeRoles, requireVerified } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getProfile,
  updateProfile,
  listMyMedicines,
  addMedicine,
  updateMedicine,
  updateStock,
  deleteMedicine,
  resubmitApplication
} = require('../controllers/pharmacyController');

const router = express.Router();

const resubmitUpload = upload.fields([{ name: 'document', maxCount: 1 }]);

router.use(protect, authorizeRoles('pharmacy'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/medicines', listMyMedicines);
router.post('/medicines', requireVerified, addMedicine);
router.put('/medicines/:id', requireVerified, updateMedicine);
router.put('/medicines/:id/stock', requireVerified, updateStock);
router.delete('/medicines/:id', requireVerified, deleteMedicine);

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;