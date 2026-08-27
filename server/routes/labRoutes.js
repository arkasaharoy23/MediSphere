const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getProfile,
  updateProfile,
  listMyTests,
  addTest,
  updateTest,
  deleteTest,
  resubmitApplication
} = require('../controllers/labController');

const router = express.Router();

const resubmitUpload = upload.fields([{ name: 'document', maxCount: 1 }]);

router.use(protect, authorizeRoles('lab'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/tests', listMyTests);
router.post('/tests', addTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

router.put('/resubmit', resubmitUpload, resubmitApplication);

module.exports = router;