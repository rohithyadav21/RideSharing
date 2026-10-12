const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { requireAuth } = require('../middleware/auth');

router.get('/overview', statsController.getOverviewStats);
router.get('/leaderboard', statsController.getLeaderboard);
router.get('/locations', statsController.getCampusLocations);
router.get('/notifications', requireAuth, statsController.getNotifications);
router.post('/notifications/read', requireAuth, statsController.markNotificationsRead);

module.exports = router;
