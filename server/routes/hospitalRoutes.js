const express = require('express');
const { protect, authorizeRoles, requireVerified } = require('../middleware/authMiddleware');
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
router.post('/departments', requireVerified, addDepartment);
router.delete('/departments/:id', requireVerified, deleteDepartment);

router.get('/doctors', listAffiliatedDoctors);
router.delete('/doctors/:doctorUserId', requireVerified, removeDoctorAffiliation);

router.get('/appointments', listHospitalAppointments);

router.get('/beds', listBeds);
router.post('/beds', requireVerified, addBedCategory);
router.put('/beds/:id', requireVerified, updateBedCategory);
router.delete('/beds/:id', requireVerified, deleteBedCategory);

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;