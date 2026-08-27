const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
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
router.post('/medicines', addMedicine);
router.put('/medicines/:id', updateMedicine);
router.put('/medicines/:id/stock', updateStock);
router.delete('/medicines/:id', deleteMedicine);

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;