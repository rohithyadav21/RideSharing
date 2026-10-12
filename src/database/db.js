const { DatabaseSync } = require('node:sqlite');
const config = require('../config/config');

// Initialize SQLite database instance
const db = new DatabaseSync(config.DB_PATH);

// Enable WAL mode for high concurrency & Foreign Keys
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables Schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      campus_id TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      is_driver INTEGER DEFAULT 0,
      vehicle_model TEXT,
      vehicle_color TEXT,
      vehicle_plate TEXT,
      vehicle_seats INTEGER DEFAULT 4,
      rating REAL DEFAULT 5.0,
      total_rides INTEGER DEFAULT 0,
      co2_saved_kg REAL DEFAULT 0.0,
      money_saved REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      origin_landmark TEXT,
      destination TEXT NOT NULL,
      destination_landmark TEXT,
      direction TEXT DEFAULT 'to_campus',
      departure_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      estimated_duration_mins INTEGER DEFAULT 25,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      price_per_seat REAL NOT NULL DEFAULT 0.0,
      vehicle_info TEXT,
      notes TEXT,
      preferences TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      seats_booked INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL DEFAULT 0.0,
      pickup_point TEXT,
      dropoff_point TEXT,
      special_requests TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_type TEXT,
      link_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rides_date ON rides(departure_date);
    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(passenger_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id);
    CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id);
  `);
}

// Run schema initialization
initSchema();

module.exports = db;
