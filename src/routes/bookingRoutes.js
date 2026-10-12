const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, bookingController.createBooking);
router.get('/my', requireAuth, bookingController.getMyBookings);
router.get('/ride/:rideId', requireAuth, bookingController.getBookingsForRide);
router.put('/:id/status', requireAuth, bookingController.updateBookingStatus);

module.exports = router;
