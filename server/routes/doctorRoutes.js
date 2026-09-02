const express = require('express');
const { protect, authorizeRoles, requireVerified } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { getProfile, updateProfile, addDegree, resubmitApplication, listMyPatients } = require('../controllers/doctorController');

const router = express.Router();

const resubmitUpload = upload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 }
]);

const addDegreeUpload = upload.fields([{ name: 'additionalDegreeCertificate', maxCount: 1 }]);

router.use(protect, authorizeRoles('doctor'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/degrees', addDegreeUpload, addDegree);
router.put('/resubmit', resubmitUpload, resubmitApplication);
router.get('/patients', listMyPatients, requireVerified);

module.exports = router;