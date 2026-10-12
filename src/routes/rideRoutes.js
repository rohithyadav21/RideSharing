const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, rideController.getRides);
router.get('/my/posted', requireAuth, rideController.getMyPostedRides);
router.get('/:id', optionalAuth, rideController.getRideById);
router.post('/', requireAuth, rideController.createRide);
router.put('/:id/status', requireAuth, rideController.updateRideStatus);
router.delete('/:id', requireAuth, rideController.deleteRide);

module.exports = router;
