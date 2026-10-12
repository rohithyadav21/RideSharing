const db = require('../database/db');

exports.createReview = (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { ride_id, reviewee_id, rating, comment } = req.body;

    if (!ride_id || !reviewee_id || !rating) {
      return res.status(400).json({ success: false, message: 'Ride ID, reviewee ID, and rating are required.' });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    if (reviewerId === Number(reviewee_id)) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself.' });
    }

    // Check if review already submitted
    const existing = db.prepare(`
      SELECT id FROM reviews
      WHERE ride_id = ? AND reviewer_id = ? AND reviewee_id = ?
    `).get(ride_id, reviewerId, reviewee_id);

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already submitted a review for this ride.' });
    }

    const stmt = db.prepare(`
      INSERT INTO reviews (ride_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(ride_id, reviewerId, reviewee_id, numRating, comment ? comment.trim() : null);

    // Recalculate average rating for reviewee
    const avgData = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM reviews
      WHERE reviewee_id = ?
    `).get(reviewee_id);

    if (avgData && avgData.avg_rating) {
      const roundedRating = Math.round(avgData.avg_rating * 10) / 10;
      db.prepare('UPDATE users SET rating = ? WHERE id = ?').run(roundedRating, reviewee_id);
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted! Thank you for helping keep the campus community safe and reliable.'
    });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

exports.getUserReviews = (req, res) => {
  try {
    const userId = req.params.userId;

    const reviews = db.prepare(`
      SELECT
        rev.*,
        u.name AS reviewer_name,
        u.avatar AS reviewer_avatar,
        u.role AS reviewer_role,
        r.origin,
        r.destination,
        r.departure_date
      FROM reviews rev
      JOIN users u ON rev.reviewer_id = u.id
      JOIN rides r ON rev.ride_id = r.id
      WHERE rev.reviewee_id = ?
      ORDER BY rev.created_at DESC
    `).all(userId);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM reviews
      WHERE reviewee_id = ?
    `).get(userId);

    return res.json({
      success: true,
      stats: {
        totalReviews: stats.total_reviews || 0,
        averageRating: stats.average_rating ? Math.round(stats.average_rating * 10) / 10 : 5.0
      },
      reviews
    });
  } catch (err) {
    console.error('Get user reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
};
