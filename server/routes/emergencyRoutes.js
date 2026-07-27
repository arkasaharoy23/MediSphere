const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { triggerSOS, listMine, cancelSOS, listActive } = require('../controllers/emergencyController');

const router = express.Router();

router.use(protect);

router.post('/', authorizeRoles('patient'), triggerSOS);
router.get('/mine', authorizeRoles('patient'), listMine);
router.patch('/:id/cancel', authorizeRoles('patient'), cancelSOS);
router.get('/active', authorizeRoles('ambulance', 'admin'), listActive);

module.exports = router;