const db = require('../database/db');
const config = require('../config/config');

exports.getRides = (req, res) => {
  try {
    const {
      origin, destination, date, direction,
      minSeats = 1, maxPrice, status = 'active'
    } = req.query;

    let sql = `
      SELECT
        r.*,
        u.name AS driver_name,
        u.email AS driver_email,
        u.avatar AS driver_avatar,
        u.phone AS driver_phone,
        u.rating AS driver_rating,
        u.total_rides AS driver_total_rides,
        u.department AS driver_department,
        u.role AS driver_role
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (origin && origin.trim()) {
      sql += ' AND (r.origin LIKE ? OR r.origin_landmark LIKE ?)';
      const term = `%${origin.trim()}%`;
      params.push(term, term);
    }

    if (destination && destination.trim()) {
      sql += ' AND (r.destination LIKE ? OR r.destination_landmark LIKE ?)';
      const term = `%${destination.trim()}%`;
      params.push(term, term);
    }

    if (date && date.trim()) {
      sql += ' AND r.departure_date = ?';
      params.push(date.trim());
    }

    if (direction && direction !== 'all') {
      sql += ' AND r.direction = ?';
      params.push(direction);
    }

    if (minSeats) {
      sql += ' AND r.available_seats >= ?';
      params.push(Number(minSeats));
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      sql += ' AND r.price_per_seat <= ?';
      params.push(Number(maxPrice));
    }

    sql += ' ORDER BY r.departure_date ASC, r.departure_time ASC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    // Parse JSON preferences
    const rides = rows.map(ride => ({
      ...ride,
      preferences: ride.preferences ? JSON.parse(ride.preferences) : {}
    }));

    return res.json({
      success: true,
      count: rides.length,
      rides
    });
  } catch (err) {
    console.error('Get rides error:', err);
    return res.status(500).json({ success: false, message: 'Failed to search rides.' });
  }
};

exports.getRideById = (req, res) => {
  try {
    const rideId = req.params.id;

    const ride = db.prepare(`
      SELECT
        r.*,
        u.name AS driver_name,
        u.email AS driver_email,
        u.avatar AS driver_avatar,
        u.phone AS driver_phone,
        u.rating AS driver_rating,
        u.total_rides AS driver_total_rides,
        u.department AS driver_department,
        u.role AS driver_role,
        u.campus_id AS driver_campus_id,
        u.vehicle_model AS driver_vehicle_model,
        u.vehicle_plate AS driver_vehicle_plate
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = ?
    `).get(rideId);

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    ride.preferences = ride.preferences ? JSON.parse(ride.preferences) : {};

    // Get bookings for this ride
    const bookings = db.prepare(`
      SELECT
        b.*,
        u.name AS passenger_name,
        u.email AS passenger_email,
        u.phone AS passenger_phone,
        u.avatar AS passenger_avatar,
        u.department AS passenger_department,
        u.campus_id AS passenger_campus_id,
        u.rating AS passenger_rating
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = ?
      ORDER BY b.created_at ASC
    `).all(rideId);

    // Get driver recent reviews
    const reviews = db.prepare(`
      SELECT
        rev.*,
        u.name AS reviewer_name,
        u.avatar AS reviewer_avatar
      FROM reviews rev
      JOIN users u ON rev.reviewer_id = u.id
      WHERE rev.reviewee_id = ?
      ORDER BY rev.created_at DESC
      LIMIT 5
    `).all(ride.driver_id);

    return res.json({
      success: true,
      ride,
      bookings,
      reviews
    });
  } catch (err) {
    console.error('Get ride details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get ride details.' });
  }
};

exports.createRide = (req, res) => {
  try {
    const driverId = req.user.id;
    const {
      origin, origin_landmark, destination, destination_landmark,
      direction = 'to_campus', departure_date, departure_time,
      estimated_duration_mins = 25, total_seats = 3, price_per_seat = 0.0,
      vehicle_info, notes, preferences = {}
    } = req.body;

    if (!origin || !destination || !departure_date || !departure_time || !total_seats) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory ride details.' });
    }

    // Auto-promote user to driver if not already
    db.prepare('UPDATE users SET is_driver = 1 WHERE id = ? AND is_driver = 0').run(driverId);

    const vehicleDesc = vehicle_info || (req.user.vehicle_model ? `${req.user.vehicle_model} (${req.user.vehicle_color || ''})` : 'Personal Vehicle');

    const stmt = db.prepare(`
      INSERT INTO rides (
        driver_id, origin, origin_landmark, destination, destination_landmark,
        direction, departure_date, departure_time, estimated_duration_mins,
        total_seats, available_seats, price_per_seat, vehicle_info, notes,
        preferences, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(
      driverId,
      origin.trim(),
      origin_landmark ? origin_landmark.trim() : null,
      destination.trim(),
      destination_landmark ? destination_landmark.trim() : null,
      direction,
      departure_date,
      departure_time,
      Number(estimated_duration_mins) || 25,
      Number(total_seats),
      Number(total_seats), // Initially available seats = total seats
      Number(price_per_seat) || 0.0,
      vehicleDesc,
      notes || null,
      JSON.stringify(preferences)
    );

    const newRideId = Number(result.lastInsertRowid);
    const newRide = db.prepare('SELECT * FROM rides WHERE id = ?').get(newRideId);

    return res.status(201).json({
      success: true,
      message: 'Ride posted successfully! Fellow campus members can now discover and book your ride.',
      ride: newRide
    });
  } catch (err) {
    console.error('Create ride error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post ride.' });
  }
};

exports.updateRideStatus = (req, res) => {
  try {
    const rideId = req.params.id;
    const { status } = req.body; // 'active', 'in_progress', 'completed', 'cancelled'
    const userId = req.user.id;

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.driver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the driver can update this ride status.' });
    }

    const validStatuses = ['active', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ride status.' });
    }

    db.prepare('UPDATE rides SET status = ? WHERE id = ?').run(status, rideId);

    // If completed, update driver and passengers stats (CO2 saved, total rides)
    if (status === 'completed') {
      const co2Gained = config.AVG_TRIP_MILES * config.AVG_CAR_EMISSION_KG_PER_MILE;
      const moneyGained = ride.price_per_seat;

      // Update driver
      db.prepare(`
        UPDATE users SET
          total_rides = total_rides + 1,
          co2_saved_kg = co2_saved_kg + ?,
          money_saved = money_saved + ?
        WHERE id = ?
      `).run(co2Gained, moneyGained, userId);

      // Update confirmed passengers
      const confirmedBookings = db.prepare('SELECT passenger_id, seats_booked FROM bookings WHERE ride_id = ? AND status = ?').all(rideId, 'confirmed');
      for (const booking of confirmedBookings) {
        db.prepare(`
          UPDATE users SET
            total_rides = total_rides + 1,
            co2_saved_kg = co2_saved_kg + ?,
            money_saved = money_saved + 5.0
          WHERE id = ?
        `).run(co2Gained * booking.seats_booked, booking.passenger_id);

        db.prepare('UPDATE bookings SET status = ? WHERE ride_id = ? AND passenger_id = ?').run('completed', rideId, booking.passenger_id);
      }
    }

    return res.json({
      success: true,
      message: `Ride marked as ${status}.`,
      status
    });
  } catch (err) {
    console.error('Update ride status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update ride status.' });
  }
};

exports.deleteRide = (req, res) => {
  try {
    const rideId = req.params.id;
    const userId = req.user.id;

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.driver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the driver can cancel this ride.' });
    }

    db.prepare('UPDATE rides SET status = ? WHERE id = ?').run('cancelled', rideId);
    db.prepare('UPDATE bookings SET status = ? WHERE ride_id = ? AND status = ?').run('cancelled', rideId, 'confirmed');

    return res.json({
      success: true,
      message: 'Ride cancelled successfully.'
    });
  } catch (err) {
    console.error('Delete ride error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel ride.' });
  }
};

exports.getMyPostedRides = (req, res) => {
  try {
    const driverId = req.user.id;

    const rides = db.prepare(`
      SELECT
        r.*,
        (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'confirmed') AS confirmed_passengers_count,
        (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'pending') AS pending_requests_count
      FROM rides r
      WHERE r.driver_id = ?
      ORDER BY r.departure_date DESC, r.departure_time DESC
    `).all(driverId);

    const parsed = rides.map(r => ({
      ...r,
      preferences: r.preferences ? JSON.parse(r.preferences) : {}
    }));

    return res.json({
      success: true,
      rides: parsed
    });
  } catch (err) {
    console.error('Get my posted rides error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve posted rides.' });
  }
};
