const db = require('../database/db');

exports.getRideMessages = (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user.id;

    // Verify user is either driver or has booked this ride
    const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    const isDriver = ride.driver_id === userId;
    const isPassenger = db.prepare('SELECT id FROM bookings WHERE ride_id = ? AND passenger_id = ?').get(rideId, userId);

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ success: false, message: 'Only ride participants can view the coordination chat.' });
    }

    const messages = db.prepare(`
      SELECT
        m.id,
        m.ride_id,
        m.sender_id,
        m.message,
        m.created_at,
        u.name AS sender_name,
        u.avatar AS sender_avatar,
        u.role AS sender_role,
        CASE WHEN u.id = ? THEN 1 ELSE 0 END AS is_mine
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ride_id = ?
      ORDER BY m.created_at ASC
    `).all(userId, rideId);

    return res.json({
      success: true,
      messages
    });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
};

exports.sendMessage = (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    // Verify participation
    const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    const isDriver = ride.driver_id === userId;
    const isPassenger = db.prepare('SELECT id FROM bookings WHERE ride_id = ? AND passenger_id = ?').get(rideId, userId);

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ success: false, message: 'You must be part of this ride to send messages.' });
    }

    const stmt = db.prepare(`
      INSERT INTO messages (ride_id, sender_id, message)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(rideId, userId, message.trim());
    const newMessage = db.prepare(`
      SELECT
        m.id,
        m.ride_id,
        m.sender_id,
        m.message,
        m.created_at,
        u.name AS sender_name,
        u.avatar AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(Number(result.lastInsertRowid));

    return res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};
