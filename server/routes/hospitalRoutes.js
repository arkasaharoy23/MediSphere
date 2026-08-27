const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  listDirectory,
  listDepartmentsForHospital,
  listDepartments,
  addDepartment,
  deleteDepartment,
  listAffiliatedDoctors,
  removeDoctorAffiliation,
  listHospitalAppointments,
  listBeds,
  addBedCategory,
  updateBedCategory,
  deleteBedCategory,
  resubmitApplication
} = require('../controllers/hospitalController');

const router = express.Router();

const resubmitUpload = upload.fields([
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 }
]);

// Any authenticated role can browse verified hospitals (used by doctors picking an affiliation).
router.get('/directory', protect, listDirectory);
router.get('/:hospitalUserId/departments', protect, listDepartmentsForHospital);

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

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;