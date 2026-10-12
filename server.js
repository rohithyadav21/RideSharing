const express = require('express');
const cors = require('cors');
const path = require('node:path');
const config = require('./src/config/config');

// Ensure database tables exist
require('./src/database/db');

const authRoutes = require('./src/routes/authRoutes');
const rideRoutes = require('./src/routes/rideRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const statsRoutes = require('./src/routes/statsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Campus Ride Sharing API',
    campus: config.CAMPUS_NAME
  });
});

// Dedicated auth pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'), { dotfiles: 'allow' });
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'), { dotfiles: 'allow' });
});

// SPA fallback for frontend client routing (compatible with Express 5)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'), { dotfiles: 'allow' });
  }
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start HTTP server
const PORT = config.PORT;
const server = app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚗 Campus Ride Sharing Server Running!`);
  console.log(`📍 Web Interface & API: http://localhost:${PORT}`);
  console.log(`🏫 Campus: ${config.CAMPUS_NAME}`);
  console.log(`==================================================\n`);
});

module.exports = { app, server };
