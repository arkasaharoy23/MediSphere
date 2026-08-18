const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  listDoctors,
  listHospitals,
  listLabs,
  listLabTests,
  listPharmacies,
  listPharmacyMedicines
} = require('../controllers/patientController');

const router = express.Router();

router.use(protect, authorizeRoles('patient'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/doctors', listDoctors);
router.get('/hospitals', listHospitals);
router.get('/labs', listLabs);
router.get('/labs/:labId/tests', listLabTests);
router.get('/pharmacies', listPharmacies);
router.get('/pharmacies/:pharmacyId/medicines', listPharmacyMedicines);

module.exports = router;