const db = require('../database/db');
const config = require('../config/config');

exports.getOverviewStats = (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalRides = db.prepare('SELECT COUNT(*) as count FROM rides').get().count;
    const activeRides = db.prepare("SELECT COUNT(*) as count FROM rides WHERE status = 'active'").get().count;
    const totalBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status IN ('confirmed', 'completed')").get().count;

    const aggregateSavings = db.prepare(`
      SELECT
        COALESCE(SUM(co2_saved_kg), 0) as total_co2,
        COALESCE(SUM(money_saved), 0) as total_money
      FROM users
    `).get();

    return res.json({
      success: true,
      stats: {
        campusName: config.CAMPUS_NAME,
        totalUsers,
        totalRides,
        activeRides,
        totalBookings,
        totalCo2SavedKg: Math.round(aggregateSavings.total_co2 * 10) / 10,
        totalMoneySaved: Math.round(aggregateSavings.total_money),
        sharedMilesSaved: Math.round(aggregateSavings.total_co2 / config.AVG_CAR_EMISSION_KG_PER_MILE),
        treesEquivalent: Math.round(aggregateSavings.total_co2 / 21) // 1 mature tree absorbs ~21kg CO2/year
      }
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
};

exports.getLeaderboard = (req, res) => {
  try {
    const ecoLeaders = db.prepare(`
      SELECT id, name, role, department, avatar, co2_saved_kg, total_rides, rating
      FROM users
      ORDER BY co2_saved_kg DESC
      LIMIT 5
    `).all();

    const topDrivers = db.prepare(`
      SELECT id, name, role, department, avatar, rating, total_rides, vehicle_model
      FROM users
      WHERE is_driver = 1
      ORDER BY rating DESC, total_rides DESC
      LIMIT 5
    `).all();

    return res.json({
      success: true,
      ecoLeaders,
      topDrivers
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard.' });
  }
};

exports.getCampusLocations = (req, res) => {
  const locations = [
    { name: 'Greendale Central Library (Main Quad)', type: 'campus', lat: 37.4275, lng: -122.1697 },
    { name: 'Science & Engineering Complex', type: 'campus', lat: 37.4290, lng: -122.1730 },
    { name: 'North Campus Dormitories', type: 'campus', lat: 37.4320, lng: -122.1650 },
    { name: 'West Campus Student Residences', type: 'campus', lat: 37.4260, lng: -122.1780 },
    { name: 'East Campus Sports Complex & Gym', type: 'campus', lat: 37.4250, lng: -122.1600 },
    { name: 'Campus Main Gate / Visitor Center', type: 'campus', lat: 37.4340, lng: -122.1680 },
    { name: 'Downtown Metro Station & Plaza', type: 'off_campus', lat: 37.4420, lng: -122.1620 },
    { name: 'Central Train Station (Main Line)', type: 'off_campus', lat: 37.4480, lng: -122.1550 },
    { name: 'West Suburbs Shopping Mall', type: 'off_campus', lat: 37.4150, lng: -122.1900 },
    { name: 'International Airport (Terminal 2)', type: 'off_campus', lat: 37.6213, lng: -122.3790 },
    { name: 'City Innovation & Tech Park', type: 'off_campus', lat: 37.4080, lng: -122.1450 }
  ];

  return res.json({
    success: true,
    locations
  });
};

exports.getNotifications = (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(userId).count;

    return res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

exports.markNotificationsRead = (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    return res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
};
