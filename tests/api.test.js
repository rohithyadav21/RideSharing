const assert = require('node:assert');
const http = require('node:http');
const { app, server } = require('../server');
const config = require('../src/config/config');

const BASE_URL = `http://127.0.0.1:${config.PORT}/api`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Campus Ride Sharing Automated API Tests...\n');

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert.strictEqual(health.status, 200, 'Health check should return 200');
    console.log('✅ Health Check: Passed');

    // 2. Demo Users
    const demo = await request('GET', '/auth/demo-users');
    assert.strictEqual(demo.status, 200);
    assert.ok(demo.body.demoUsers.length >= 3, 'Should return seed demo users');
    console.log(`✅ Demo Users endpoint: Passed (${demo.body.demoUsers.length} accounts loaded)`);

    const driverUser = demo.body.demoUsers.find(u => u.is_driver);
    const riderUser = demo.body.demoUsers.find(u => !u.is_driver);
    const driverToken = driverUser.token;
    const riderToken = riderUser.token;

    // 3. User Registration
    const testEmail = `test.student.${Date.now()}@greendale.edu`;
    const regRes = await request('POST', '/auth/register', {
      name: 'Taylor Swift',
      email: testEmail,
      password: 'password123',
      role: 'student',
      campus_id: 'GD-2026-TEST',
      department: 'Music & Arts',
      phone: '+1 (555) 999-8888'
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
    assert.ok(regRes.body.token, 'Should return JWT token');
    console.log('✅ User Registration: Passed');

    // 4. User Login
    const loginRes = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'password123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.name, 'Taylor Swift');
    console.log('✅ User Login: Passed');

    // 5. Driver Posts a Ride
    const postRideRes = await request('POST', '/rides', {
      origin: 'Campus North Residences',
      destination: 'Downtown Train Station',
      direction: 'from_campus',
      departure_date: new Date().toISOString().split('T')[0],
      departure_time: '19:00',
      total_seats: 3,
      price_per_seat: 3.5,
      vehicle_info: 'Honda Civic Hybrid',
      notes: 'Evening express to city center'
    }, driverToken);

    assert.strictEqual(postRideRes.status, 201, 'Ride posting should succeed');
    const createdRideId = postRideRes.body.ride.id;
    console.log(`✅ Ride Posting: Passed (Created ride #${createdRideId})`);

    // 6. Search Rides
    const searchRes = await request('GET', `/rides?origin=North&destination=Downtown`);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.rides.length >= 1, 'Should find the newly created ride');
    console.log('✅ Ride Search & Filters: Passed');

    // 7. Rider Books a Seat
    const bookRes = await request('POST', '/bookings', {
      ride_id: createdRideId,
      seats_booked: 1,
      pickup_point: 'North Gate Front',
      special_requests: '1 small backpack'
    }, riderToken);

    assert.strictEqual(bookRes.status, 201, 'Booking request should succeed');
    const bookingId = bookRes.body.bookingId;
    console.log(`✅ Seat Booking Request: Passed (Booking #${bookingId})`);

    // 8. Driver Approves Booking Request
    const approveRes = await request('PUT', `/bookings/${bookingId}/status`, {
      status: 'confirmed'
    }, driverToken);

    assert.strictEqual(approveRes.status, 200);
    console.log('✅ Driver Booking Approval (Seat allocation): Passed');

    // Verify available seats decremented
    const rideDetails = await request('GET', `/rides/${createdRideId}`);
    assert.strictEqual(rideDetails.body.ride.available_seats, 2, 'Available seats should decrement from 3 to 2');
    console.log('✅ Seat Inventory Decrement: Passed');

    // 9. In-Ride Chat Messaging
    const sendMsgRes = await request('POST', `/messages/${createdRideId}`, {
      message: 'Hello! I am on my way to North Gate.'
    }, riderToken);
    assert.strictEqual(sendMsgRes.status, 201);

    const getMsgRes = await request('GET', `/messages/${createdRideId}`, null, driverToken);
    assert.strictEqual(getMsgRes.status, 200);
    assert.ok(getMsgRes.body.messages.length >= 1, 'Should retrieve message');
    console.log('✅ Ride Coordination Chat: Passed');

    // 10. Mark Trip Completed & Review
    const completeRes = await request('PUT', `/rides/${createdRideId}/status`, {
      status: 'completed'
    }, driverToken);
    assert.strictEqual(completeRes.status, 200);
    console.log('✅ Complete Ride Trip & Eco Metrics: Passed');

    // 11. Leave Review
    const reviewRes = await request('POST', '/reviews', {
      ride_id: createdRideId,
      reviewee_id: driverUser.id,
      rating: 5,
      comment: 'Fantastic ride! Great conversation and on time.'
    }, riderToken);
    assert.strictEqual(reviewRes.status, 201);
    console.log('✅ Post Trip Review & Rating: Passed');

    // 12. Eco Impact & Overview Stats
    const statsRes = await request('GET', '/stats/overview');
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.stats.totalCo2SavedKg > 0);
    console.log(`✅ Campus Sustainability Stats: Passed (${statsRes.body.stats.totalCo2SavedKg} kg CO₂ recorded)`);

    console.log('\n==================================================');
    console.log('🎉 ALL 12 AUTOMATED TEST SUITES PASSED FLAWLESSLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
