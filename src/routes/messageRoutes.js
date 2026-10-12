const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

router.get('/:rideId', requireAuth, messageController.getRideMessages);
router.post('/:rideId', requireAuth, messageController.sendMessage);

module.exports = router;
