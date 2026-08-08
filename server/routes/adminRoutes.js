const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  listByRole,
  verifyUser,
  listDegreeUpdates,
  reviewDegreeUpdate,
  listUsers,
  toggleUserActive,
  getAnalytics
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorizeRoles('admin'));

router.get('/providers/:role', listByRole);
router.post('/verify/:userId', verifyUser);
router.get('/doctors/degree-updates', listDegreeUpdates);
router.post('/doctors/:userId/degrees/:degreeId', reviewDegreeUpdate);
router.get('/users', listUsers);
router.post('/users/:userId/toggle-active', toggleUserActive);
router.get('/analytics', getAnalytics);

module.exports = router;