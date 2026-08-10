const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  listMyTests,
  addTest,
  updateTest,
  deleteTest
} = require('../controllers/labController');

const router = express.Router();

router.use(protect, authorizeRoles('lab'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/tests', listMyTests);
router.post('/tests', addTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

module.exports = router;