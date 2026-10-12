const path = require('node:path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'campus_rideshare_jwt_secret_token_key_fallback_2026',
  JWT_EXPIRES_IN: '7d',
  DB_PATH: path.resolve(__dirname, '../../campus_rides.sqlite'),
  CAMPUS_NAME: 'Greendale University',
  AVG_CAR_EMISSION_KG_PER_MILE: 0.404, // US EPA average passenger vehicle emissions
  AVG_TRIP_MILES: 8.5
};
