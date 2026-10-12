const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/config');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

exports.register = async (req, res) => {
  try {
    const {
      name, email, password, role = 'student', campus_id, department,
      phone, avatar, bio, is_driver = 0, vehicle_model, vehicle_color,
      vehicle_plate, vehicle_seats = 4
    } = req.body;

    if (!name || !email || !password || !campus_id || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all required registration fields.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7,0d9488,4f46e5`;

    const stmt = db.prepare(`
      INSERT INTO users (
        name, email, password, role, campus_id, department, phone, avatar, bio,
        is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      normalizedEmail,
      hashedPassword,
      role,
      campus_id.trim(),
      department || 'General Studies',
      phone.trim(),
      defaultAvatar,
      bio || 'Greendale campus community member',
      is_driver ? 1 : 0,
      vehicle_model || null,
      vehicle_color || null,
      vehicle_plate || null,
      Number(vehicle_seats) || 4
    );

    const newUser = db.prepare('SELECT id, name, email, role, campus_id, department, phone, avatar, bio, is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats, rating, total_rides, co2_saved_kg, money_saved FROM users WHERE id = ?').get(Number(result.lastInsertRowid));

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Campus Ride Sharing.',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
};

exports.updateProfile = (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, department, phone, bio, avatar,
      is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats
    } = req.body;

    const stmt = db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        department = COALESCE(?, department),
        phone = COALESCE(?, phone),
        bio = COALESCE(?, bio),
        avatar = COALESCE(?, avatar),
        is_driver = COALESCE(?, is_driver),
        vehicle_model = COALESCE(?, vehicle_model),
        vehicle_color = COALESCE(?, vehicle_color),
        vehicle_plate = COALESCE(?, vehicle_plate),
        vehicle_seats = COALESCE(?, vehicle_seats)
      WHERE id = ?
    `);

    stmt.run(
      name, department, phone, bio, avatar,
      is_driver !== undefined ? (is_driver ? 1 : 0) : null,
      vehicle_model, vehicle_color, vehicle_plate,
      vehicle_seats !== undefined ? Number(vehicle_seats) : null,
      userId
    );

    const updatedUser = db.prepare('SELECT id, name, email, role, campus_id, department, phone, avatar, bio, is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats, rating, total_rides, co2_saved_kg, money_saved FROM users WHERE id = ?').get(userId);

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Error updating user profile.' });
  }
};

exports.getDemoUsers = (req, res) => {
  try {
    const demoUsers = db.prepare(`
      SELECT id, name, email, role, department, is_driver, vehicle_model, rating, total_rides, avatar
      FROM users
      ORDER BY id ASC
    `).all();

    const usersWithTokens = demoUsers.map(u => ({
      ...u,
      token: generateToken(u)
    }));

    return res.json({
      success: true,
      demoUsers: usersWithTokens
    });
  } catch (err) {
    console.error('Demo users error:', err);
    return res.status(500).json({ success: false, message: 'Could not load demo accounts.' });
  }
};
