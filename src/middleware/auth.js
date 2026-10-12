const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/db');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const stmt = db.prepare('SELECT id, name, email, role, campus_id, department, phone, avatar, bio, is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats, rating, total_rides, co2_saved_kg, money_saved FROM users WHERE id = ?');
    const user = stmt.get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const stmt = db.prepare('SELECT id, name, email, role, campus_id, department, phone, avatar, bio, is_driver, rating FROM users WHERE id = ?');
    req.user = stmt.get(decoded.id) || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
