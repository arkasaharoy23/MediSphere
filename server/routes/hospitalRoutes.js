const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  listDirectory,
  listDepartments,
  addDepartment,
  deleteDepartment,
  listAffiliatedDoctors,
  removeDoctorAffiliation,
  listHospitalAppointments,
  listBeds,
  addBedCategory,
  updateBedCategory,
  deleteBedCategory
} = require('../controllers/hospitalController');

const router = express.Router();

// Any authenticated role can browse verified hospitals (used by doctors picking an affiliation).
router.get('/directory', protect, listDirectory);

router.use(protect, authorizeRoles('hospital'));

router.get('/departments', listDepartments);
router.post('/departments', addDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/doctors', listAffiliatedDoctors);
router.delete('/doctors/:doctorUserId', removeDoctorAffiliation);

router.get('/appointments', listHospitalAppointments);

router.get('/beds', listBeds);
router.post('/beds', addBedCategory);
router.put('/beds/:id', updateBedCategory);
router.delete('/beds/:id', deleteBedCategory);

module.exports = router;