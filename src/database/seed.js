const bcrypt = require('bcryptjs');
const db = require('./db');

function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('🌱 Starting database seeding for Campus Ride Sharing...');

  // Clear existing data in reverse order of foreign keys
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM reviews;
    DELETE FROM messages;
    DELETE FROM bookings;
    DELETE FROM rides;
    DELETE FROM users;
  `);

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (
      name, email, password, role, campus_id, department, phone, avatar, bio,
      is_driver, vehicle_model, vehicle_color, vehicle_plate, vehicle_seats,
      rating, total_rides, co2_saved_kg, money_saved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@greendale.edu',
      password: passwordHash,
      role: 'student',
      campus_id: 'GD-2023-8821',
      department: 'Computer Science & Engineering',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      bio: 'Senior CS student. Commuting daily from Downtown. Chill music lover and eco enthusiast!',
      is_driver: 1,
      vehicle_model: 'Honda Civic Hybrid',
      vehicle_color: 'Midnight Blue',
      vehicle_plate: 'CAMPUS-88',
      vehicle_seats: 4,
      rating: 4.9,
      total_rides: 38,
      co2_saved_kg: 142.5,
      money_saved: 320.0
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@greendale.edu',
      password: passwordHash,
      role: 'student',
      campus_id: 'GD-2024-4190',
      department: 'Mechanical Engineering',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Grad student at Robotics Lab. Morning commuter from Northside. Punctual & safe driver.',
      is_driver: 1,
      vehicle_model: 'Toyota Prius',
      vehicle_color: 'Silver Metallic',
      vehicle_plate: 'GRN-PRIUS',
      vehicle_seats: 3,
      rating: 5.0,
      total_rides: 25,
      co2_saved_kg: 98.2,
      money_saved: 215.0
    },
    {
      name: 'Dr. Marcus Vance',
      email: 'marcus.vance@greendale.edu',
      password: passwordHash,
      role: 'faculty',
      campus_id: 'FAC-PHYS-102',
      department: 'Department of Physics & Astronomy',
      phone: '+1 (555) 456-7890',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Associate Professor. Daily commute from West Suburbs. Happy to offer rides to students and staff.',
      is_driver: 1,
      vehicle_model: 'Tesla Model 3',
      vehicle_color: 'Pearl White',
      vehicle_plate: 'ELEC-99',
      vehicle_seats: 3,
      rating: 4.95,
      total_rides: 54,
      co2_saved_kg: 210.0,
      money_saved: 460.0
    },
    {
      name: 'Maya Lin',
      email: 'maya.lin@greendale.edu',
      password: passwordHash,
      role: 'student',
      campus_id: 'GD-2025-1044',
      department: 'Biological Sciences',
      phone: '+1 (555) 567-8901',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      bio: 'Sophomore biology major living at West Campus Dorms. Daily campus commuter.',
      is_driver: 0,
      vehicle_model: null,
      vehicle_color: null,
      vehicle_plate: null,
      vehicle_seats: 0,
      rating: 4.8,
      total_rides: 19,
      co2_saved_kg: 64.0,
      money_saved: 145.0
    },
    {
      name: 'David Kim',
      email: 'david.kim@greendale.edu',
      password: passwordHash,
      role: 'student',
      campus_id: 'GD-2024-7721',
      department: 'School of Business',
      phone: '+1 (555) 678-9012',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Finance junior. Often travels between East Campus and Central Metro station.',
      is_driver: 0,
      vehicle_model: null,
      vehicle_color: null,
      vehicle_plate: null,
      vehicle_seats: 0,
      rating: 5.0,
      total_rides: 14,
      co2_saved_kg: 48.5,
      money_saved: 110.0
    }
  ];

  const userIds = [];
  for (const u of users) {
    const res = insertUser.run(
      u.name, u.email, u.password, u.role, u.campus_id, u.department, u.phone,
      u.avatar, u.bio, u.is_driver, u.vehicle_model, u.vehicle_color, u.vehicle_plate,
      u.vehicle_seats, u.rating, u.total_rides, u.co2_saved_kg, u.money_saved
    );
    userIds.push(Number(res.lastInsertRowid));
  }

  const [alexId, priyaId, marcusId, mayaId, davidId] = userIds;

  // 2. Insert Rides
  const insertRide = db.prepare(`
    INSERT INTO rides (
      driver_id, origin, origin_landmark, destination, destination_landmark,
      direction, departure_date, departure_time, estimated_duration_mins,
      total_seats, available_seats, price_per_seat, vehicle_info, notes,
      preferences, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rides = [
    {
      driver_id: alexId,
      origin: 'Downtown Metro Station',
      origin_landmark: 'East Exit, beside Coffee Haven',
      destination: 'Campus Science & Tech Complex',
      destination_landmark: 'Building B Front Entrance',
      direction: 'to_campus',
      departure_date: getFormattedDate(0), // Today
      departure_time: '08:30',
      estimated_duration_mins: 25,
      total_seats: 3,
      available_seats: 1,
      price_per_seat: 3.0,
      vehicle_info: 'Honda Civic Hybrid (Blue) • CAMPUS-88',
      notes: 'Leaving sharply at 8:30 AM. Trunk space available for backpacks and small bags.',
      preferences: JSON.stringify({ luggage: true, music: true, ac: true, women_only: false, smoking: false }),
      status: 'active'
    },
    {
      driver_id: priyaId,
      origin: 'Northside Residential Park',
      origin_landmark: 'Oak & 4th Street corner',
      destination: 'Greendale Central Library',
      destination_landmark: 'Clock Tower Drop-off Zone',
      direction: 'to_campus',
      departure_date: getFormattedDate(0), // Today
      departure_time: '09:15',
      estimated_duration_mins: 20,
      total_seats: 3,
      available_seats: 2,
      price_per_seat: 2.5,
      vehicle_info: 'Toyota Prius (Silver) • GRN-PRIUS',
      notes: 'Quiet ride ideal for morning study or revision. Friendly conversation welcome.',
      preferences: JSON.stringify({ luggage: true, music: false, ac: true, women_only: false, smoking: false }),
      status: 'active'
    },
    {
      driver_id: marcusId,
      origin: 'West Suburbs Shopping District',
      origin_landmark: 'Near Supermarket main gate',
      destination: 'Faculty Quad & Admin Building',
      destination_landmark: 'Staff Car Park Gate 2',
      direction: 'to_campus',
      departure_date: getFormattedDate(1), // Tomorrow
      departure_time: '08:00',
      estimated_duration_mins: 30,
      total_seats: 3,
      available_seats: 3,
      price_per_seat: 0.0, // Free faculty ride!
      vehicle_info: 'Tesla Model 3 (Pearl White) • ELEC-99',
      notes: 'Faculty and student friendly ride. Zero fuel contribution required—let’s cut carbon together!',
      preferences: JSON.stringify({ luggage: true, music: true, ac: true, women_only: false, smoking: false }),
      status: 'active'
    },
    {
      driver_id: alexId,
      origin: 'Campus Main Gate',
      origin_landmark: 'Visitor Center roundabout',
      destination: 'Central Transit Hub & Railway Station',
      destination_landmark: 'Platform 1 Drop-off',
      direction: 'from_campus',
      departure_date: getFormattedDate(1), // Tomorrow
      departure_time: '17:30',
      estimated_duration_mins: 35,
      total_seats: 3,
      available_seats: 2,
      price_per_seat: 4.0,
      vehicle_info: 'Honda Civic Hybrid (Blue) • CAMPUS-88',
      notes: 'Heading home after afternoon labs. Perfect for students taking the 6:15 PM outbound train.',
      preferences: JSON.stringify({ luggage: true, music: true, ac: true, women_only: false, smoking: false }),
      status: 'active'
    },
    {
      driver_id: priyaId,
      origin: 'East Campus Sports Complex',
      origin_landmark: 'Gymnasium Lobby',
      destination: 'Downtown Art Museum & Market',
      destination_landmark: 'Market Square Fountain',
      direction: 'from_campus',
      departure_date: getFormattedDate(2), // In 2 days
      departure_time: '18:00',
      estimated_duration_mins: 22,
      total_seats: 2,
      available_seats: 2,
      price_per_seat: 3.0,
      vehicle_info: 'Toyota Prius (Silver) • GRN-PRIUS',
      notes: 'Friday evening commute to downtown for dinner and social events.',
      preferences: JSON.stringify({ luggage: false, music: true, ac: true, women_only: true, smoking: false }),
      status: 'active'
    }
  ];

  const rideIds = [];
  for (const r of rides) {
    const res = insertRide.run(
      r.driver_id, r.origin, r.origin_landmark, r.destination, r.destination_landmark,
      r.direction, r.departure_date, r.departure_time, r.estimated_duration_mins,
      r.total_seats, r.available_seats, r.price_per_seat, r.vehicle_info, r.notes,
      r.preferences, r.status
    );
    rideIds.push(Number(res.lastInsertRowid));
  }

  // 3. Insert Bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      ride_id, passenger_id, seats_booked, total_price, pickup_point,
      dropoff_point, special_requests, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Maya booked 1 seat on Alex's ride (Confirmed)
  const b1 = insertBooking.run(
    rideIds[0], mayaId, 1, 3.0,
    'Downtown Metro Station - Coffee Haven',
    'Science Complex',
    'Have a laptop backpack with me.',
    'confirmed'
  );

  // David booked 1 seat on Alex's ride (Pending approval)
  const b2 = insertBooking.run(
    rideIds[0], davidId, 1, 3.0,
    'Downtown Metro Station',
    'Library junction drop-off',
    'Is it okay to be dropped near the library?',
    'pending'
  );

  // Maya booked 1 seat on Alex's tomorrow return ride (Confirmed)
  const b3 = insertBooking.run(
    rideIds[3], mayaId, 1, 4.0,
    'Campus Main Gate',
    'Railway Station',
    'Weekend luggage bag.',
    'confirmed'
  );

  // 4. Insert Messages for Ride 1
  const insertMessage = db.prepare(`
    INSERT INTO messages (ride_id, sender_id, message, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  insertMessage.run(rideIds[0], alexId, 'Hey Maya! Thanks for booking. I will be waiting right beside Coffee Haven by 8:25 AM.', '-45 minutes');
  insertMessage.run(rideIds[0], mayaId, 'Awesome Alex, see you there at 8:25! I will be wearing a green jacket.', '-30 minutes');
  insertMessage.run(rideIds[0], alexId, 'Sounds great! Look for the blue Honda Civic.', '-20 minutes');

  // 5. Insert Reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (ride_id, reviewer_id, reviewee_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReview.run(rideIds[0], mayaId, alexId, 5, 'Super punctual, clean car, and great playlist! Saved me 40 minutes on transit.');
  insertReview.run(rideIds[1], davidId, priyaId, 5, 'Priya was wonderful and right on time. Smooth drive all the way to the library.');
  insertReview.run(rideIds[2], mayaId, marcusId, 5, 'Dr. Vance gives fantastic rides! Discussed astrophysics on the way to campus.');

  // 6. Insert Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, link_type, link_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotification.run(alexId, 'New Booking Request', 'David Kim requested 1 seat on your Downtown -> Science Complex ride.', 'ride', rideIds[0]);
  insertNotification.run(mayaId, 'Booking Confirmed!', 'Alex Rivera confirmed your ride request for today 08:30 AM.', 'ride', rideIds[0]);

  console.log('✅ Database seeded successfully with:');
  console.log(`   - ${users.length} campus users (students & faculty)`);
  console.log(`   - ${rides.length} active campus rides`);
  console.log(`   - Sample bookings, coordinates, chats, and ratings!`);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
