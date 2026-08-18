const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  listMyMedicines,
  addMedicine,
  updateMedicine,
  updateStock,
  deleteMedicine
} = require('../controllers/pharmacyController');

const router = express.Router();

router.use(protect, authorizeRoles('pharmacy'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/medicines', listMyMedicines);
router.post('/medicines', addMedicine);
router.put('/medicines/:id', updateMedicine);
router.put('/medicines/:id/stock', updateStock);
router.delete('/medicines/:id', deleteMedicine);

module.exports = router;