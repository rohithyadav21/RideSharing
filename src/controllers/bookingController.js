const db = require('../database/db');

exports.createBooking = (req, res) => {
  try {
    const passengerId = req.user.id;
    const {
      ride_id, seats_booked = 1, pickup_point,
      dropoff_point, special_requests
    } = req.body;

    if (!ride_id) {
      return res.status(400).json({ success: false, message: 'Ride ID is required.' });
    }

    const requestedSeats = Math.max(1, Number(seats_booked));

    // Check ride
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'The requested ride does not exist.' });
    }

    if (ride.driver_id === passengerId) {
      return res.status(400).json({ success: false, message: 'You cannot book a seat on your own posted ride.' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This ride is no longer accepting new bookings.' });
    }

    if (ride.available_seats < requestedSeats) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.available_seats} seat(s) currently available on this ride.`
      });
    }

    // Check if user already booked this ride
    const existingBooking = db.prepare(`
      SELECT id, status FROM bookings
      WHERE ride_id = ? AND passenger_id = ? AND status IN ('pending', 'confirmed')
    `).get(ride_id, passengerId);

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingBooking.status} booking request for this ride.`
      });
    }

    const totalPrice = ride.price_per_seat * requestedSeats;

    const stmt = db.prepare(`
      INSERT INTO bookings (
        ride_id, passenger_id, seats_booked, total_price,
        pickup_point, dropoff_point, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(
      ride_id,
      passengerId,
      requestedSeats,
      totalPrice,
      pickup_point || ride.origin,
      dropoff_point || ride.destination,
      special_requests || null
    );

    const bookingId = Number(result.lastInsertRowid);

    // Notify driver
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, link_type, link_id)
      VALUES (?, ?, ?, 'ride', ?)
    `).run(
      ride.driver_id,
      'New Ride Booking Request',
      `${req.user.name} requested ${requestedSeats} seat(s) for your trip (${ride.origin} → ${ride.destination}).`,
      ride_id
    );

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted! Waiting for the driver to confirm.',
      bookingId
    });
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ success: false, message: 'Failed to request booking.' });
  }
};

exports.getMyBookings = (req, res) => {
  try {
    const passengerId = req.user.id;

    const bookings = db.prepare(`
      SELECT
        b.*,
        r.origin,
        r.origin_landmark,
        r.destination,
        r.destination_landmark,
        r.departure_date,
        r.departure_time,
        r.direction,
        r.price_per_seat,
        r.status AS ride_status,
        r.vehicle_info,
        u.id AS driver_id,
        u.name AS driver_name,
        u.email AS driver_email,
        u.phone AS driver_phone,
        u.avatar AS driver_avatar,
        u.rating AS driver_rating
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON r.driver_id = u.id
      WHERE b.passenger_id = ?
      ORDER BY r.departure_date DESC, r.departure_time DESC
    `).all(passengerId);

    return res.json({
      success: true,
      bookings
    });
  } catch (err) {
    console.error('Get my bookings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
  }
};

exports.getBookingsForRide = (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user.id;

    const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.driver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not the driver of this ride.' });
    }

    const bookings = db.prepare(`
      SELECT
        b.*,
        u.name AS passenger_name,
        u.email AS passenger_email,
        u.phone AS passenger_phone,
        u.avatar AS passenger_avatar,
        u.department AS passenger_department,
        u.campus_id AS passenger_campus_id,
        u.rating AS passenger_rating,
        u.total_rides AS passenger_total_rides
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = ?
      ORDER BY b.created_at ASC
    `).all(rideId);

    return res.json({
      success: true,
      bookings
    });
  } catch (err) {
    console.error('Get ride bookings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve ride requests.' });
  }
};

exports.updateBookingStatus = (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body; // 'confirmed', 'rejected', 'cancelled'
    const userId = req.user.id;

    const booking = db.prepare(`
      SELECT b.*, r.driver_id, r.available_seats, r.origin, r.destination
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isDriver = booking.driver_id === userId;
    const isPassenger = booking.passenger_id === userId;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this booking.' });
    }

    if (status === 'confirmed' || status === 'rejected') {
      if (!isDriver) {
        return res.status(403).json({ success: false, message: 'Only the driver can confirm or reject bookings.' });
      }

      if (status === 'confirmed') {
        if (booking.status === 'confirmed') {
          return res.status(400).json({ success: false, message: 'This booking is already confirmed.' });
        }

        if (booking.available_seats < booking.seats_booked) {
          return res.status(400).json({ success: false, message: 'Not enough available seats left to confirm this request.' });
        }

        // Deduct seats
        db.prepare('UPDATE rides SET available_seats = available_seats - ? WHERE id = ?')
          .run(booking.seats_booked, booking.ride_id);

        // Update booking status
        db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('confirmed', bookingId);

        // Notify passenger
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, link_type, link_id)
          VALUES (?, ?, ?, 'booking', ?)
        `).run(
          booking.passenger_id,
          'Ride Booking Confirmed! 🎉',
          `Your driver confirmed your seat for ${booking.origin} → ${booking.destination}. Have a safe journey!`,
          bookingId
        );
      } else if (status === 'rejected') {
        db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('rejected', bookingId);

        // Notify passenger
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, link_type, link_id)
          VALUES (?, ?, ?, 'booking', ?)
        `).run(
          booking.passenger_id,
          'Booking Request Declined',
          `Your request for ${booking.origin} → ${booking.destination} was declined by the driver.`,
          bookingId
        );
      }
    } else if (status === 'cancelled') {
      // Cancelled by passenger or driver
      if (booking.status === 'confirmed') {
        // Restore seats
        db.prepare('UPDATE rides SET available_seats = available_seats + ? WHERE id = ?')
          .run(booking.seats_booked, booking.ride_id);
      }

      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', bookingId);

      // Notify the other party
      const notifyTarget = isPassenger ? booking.driver_id : booking.passenger_id;
      const cancelledBy = isPassenger ? 'Passenger' : 'Driver';
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, link_type, link_id)
        VALUES (?, ?, ?, 'booking', ?)
      `).run(
        notifyTarget,
        `Booking Cancelled by ${cancelledBy}`,
        `A booking on ride ${booking.origin} → ${booking.destination} was cancelled.`,
        bookingId
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid status update action.' });
    }

    return res.json({
      success: true,
      message: `Booking has been ${status}.`,
      status
    });
  } catch (err) {
    console.error('Update booking status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
  }
};
