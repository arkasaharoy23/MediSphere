const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getProfile,
  updateProfile,
  updateLocation,
  listAssignedRequests,
  resolveRequest,
  resubmitApplication
} = require('../controllers/ambulanceController');

const router = express.Router();

const resubmitUpload = upload.fields([
  { name: 'rcDocument', maxCount: 1 },
  { name: 'driverLicenseDoc', maxCount: 1 },
  { name: 'driverPhoto', maxCount: 1 },
  { name: 'driverIdDoc', maxCount: 1 },
  { name: 'permitDocument', maxCount: 1 }
]);

router.use(protect, authorizeRoles('ambulance'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/location', updateLocation);

router.get('/requests', listAssignedRequests);
router.put('/requests/:id/resolve', resolveRequest);

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;