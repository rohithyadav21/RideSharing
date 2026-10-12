# 🚗 Campus Ride Sharing System

A full-stack, web-based transportation platform designed specifically for college campuses. **CampusRide** connects college students and faculty commuting to and from campus to share rides, split fuel expenses, alleviate parking bottlenecks, and reduce campus greenhouse gas emissions.

---

## 📖 Abstract

Campus Ride Sharing is a web-based system designed to help college students and staff share rides while travelling to and from the campus. The main aim of this project is to provide a convenient, affordable, and safe transportation option for the campus community.

In this system, users can register and create a profile, post their available rides, or search for rides based on their starting location, destination, date, and time. Students who need transportation can view suitable rides and connect with the ride provider. The system also provides details such as available seats, ride timing, vehicle details, and contact information.

The Campus Ride Sharing system helps reduce individual travel costs, traffic congestion, and unnecessary fuel consumption. It also encourages students to share transportation and build better connections within the campus community. The system includes features such as user registration, ride posting, ride searching, booking, real-time seat availability, ride history, in-app coordination chat, and user feedback.

---

## ✨ Key Features

### 1. 🪪 User Registration & Profile Management
- **Campus Verified Members:** Register with college email domain, student/faculty ID, department, contact number, and avatar.
- **Dual Role Capabilities:** Any user can act as both a **Passenger** and a **Driver**.
- **Vehicle Profiles:** Drivers register car model, color, license plate, and seat capacity.
- **Community Trust Scores:** Average star ratings and badges (e.g. *Verified Campus Driver*, *Top Eco Champion*).

### 2. 🚘 Ride Posting (Driver Portal)
- Post upcoming commutes with starting point, destination, landmarks, and departure schedule.
- Set commute directions: **To Campus**, **From Campus**, **Inter-Campus**, or **Off-Campus/Transit Hub**.
- Flexible cost models: Set a fair cost-per-seat contribution ($) or offer **100% Free** eco-carpools.
- Configurable ride preferences: Luggage space, music enabled, AC, quiet study trip, or **Women-Only Commute**.

### 3. 🔍 Smart Ride Discovery & Filtering (Rider Portal)
- Real-time search with instant filters:
  - Origin & Destination keywords
  - Date & time
  - Commute direction tabs
  - Passenger seats needed
  - Quick filter buttons (*Today's Rides*, *Free / Split Only*)
- Visual indicators showing real-time seat inventory (*"1 seat left"*, *"3 seats available"*).

### 4. 🎫 Booking & Seat Reservation Lifecycle
- **Passenger Seat Request:** Reserve 1 or more seats with custom pickup points and driver notes.
- **Driver Approval Workflow:** Drivers review passenger requests with instant **Accept ✓** or **Decline ✕** controls.
- **Automatic Seat Inventory:** Seats automatically decrement on confirmation and return to inventory on cancellation.
- **Digital Boarding Pass:** Confirmed trips generate a boarding pass card displaying driver contact details and trip itinerary.

### 5. 💬 In-App Ride Coordination Chat
- Dedicated coordination chat room for every ride.
- Passengers and drivers coordinate exact pickup gates, landmarks, and timing adjustments in real-time.

### 6. 🌿 Eco-Impact & Carbon Savings Dashboard
- Calculates real-time environmental metrics based on EPA vehicle emission standards ($0.404\text{ kg CO}_2/\text{mile}$):
  - **Total $\text{CO}_2$ Prevented (kg)**
  - **Financial Travel Savings ($)**
  - **Shared Carpool Miles**
  - **Campus Trees Equivalent**
- Campus leaderboard highlighting top eco contributors and highest-rated drivers.

### 7. ⭐ Community Ratings & Feedback
- Leave 1-to-5 star ratings and detailed reviews after trip completion.
- Driver profiles automatically reflect verified reputation scores.

### 8. 🛡️ Campus Safety Guidelines & SOS
- 24/7 Campus Police Transit Safety hotline integration.
- Guidelines for verifying college ID, vehicle plate matching, and designated campus pickup zones.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend** | **Node.js (v24+) & Express.js** | RESTful API, route controllers, session handling |
| **Database** | **SQLite with WAL Mode** | Native `node:sqlite`, persistent zero-setup database |
| **Security** | **JWT & Bcrypt.js** | Stateless JSON Web Tokens, salted password hashing |
| **Frontend** | **HTML5, CSS3, Modern ES6+** | Single Page Application (SPA), responsive UI, CSS Grid |
| **Testing** | **Node Test Runner** | Automated end-to-end integration test suite |

---

## 📂 Project Directory Structure

```
campus-ride-sharing/
├── .env                  # Environment configuration (Port, JWT Secret, DB path)
├── .env.example          # Sample environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and npm scripts
├── server.js             # Main Express server and API router entry point
├── src/
│   ├── config/
│   │   └── config.js     # Centralized system constants and emissions formulas
│   ├── database/
│   │   ├── db.js         # SQLite schema initialization and connection
│   │   └── seed.js       # Seed script with realistic students, rides, and reviews
│   ├── middleware/
│   │   └── auth.js       # JWT authentication and user session verification
│   ├── routes/
│   │   ├── authRoutes.js # Login, registration, profile, and demo users
│   │   ├── rideRoutes.js # Search, post, details, and ride status updates
│   │   ├── bookingRoutes.js # Booking requests, driver approvals, cancellations
│   │   ├── messageRoutes.js # Ride coordination chat messaging
│   │   ├── reviewRoutes.js  # Ratings and driver reviews
│   │   └── statsRoutes.js   # Campus eco metrics and leaderboard
│   └── controllers/
│       ├── authController.js
│       ├── rideController.js
│       ├── bookingController.js
│       ├── messageController.js
│       ├── reviewController.js
│       └── statsController.js
├── public/
│   ├── index.html        # Main interactive SPA container
│   ├── css/
│   │   └── styles.css    # Clean modern campus styling, cards, and modal layouts
│   └── js/
│       ├── api.js        # Client API request client
│       ├── state.js      # Global reactive state store
│       ├── components.js # Reusable HTML template renderers
│       └── app.js        # View routing and event handling logic
└── tests/
    └── api.test.js       # 12-suite automated API verification tests
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
Ensure **Node.js (v18 or higher, v24 recommended)** is installed on your computer:
```bash
node -v
npm -v
```

### 2. Installation
Navigate into the project directory:
```bash
cd campus-ride-sharing
npm install
```

### 3. Initialize & Seed Database
Populate the database with pre-configured campus rides, students, and reviews:
```bash
npm run seed
```

### 4. Run the Application
Start the server:
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Running Automated Tests

Run the comprehensive 12-suite API test to verify registration, ride discovery, seat inventory decrementing, and coordination messaging:
```bash
npm test
```

---

## 👥 Pre-Configured Demo Accounts

For immediate testing, use the **⚡ Demo Role** dropdown in the navigation header to switch profiles with one click:

| Name | Role | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Rivera** | Senior Student | `alex.rivera@greendale.edu` | `password123` | **Driver** • Honda Civic Hybrid (CAMPUS-88) |
| **Priya Sharma** | Grad Student | `priya.sharma@greendale.edu` | `password123` | **Driver** • Toyota Prius (GRN-PRIUS) |
| **Dr. Marcus Vance**| Faculty | `marcus.vance@greendale.edu` | `password123` | **Driver** • Tesla Model 3 (ELEC-99) • Free Rides |
| **Maya Lin** | Sophomore | `maya.lin@greendale.edu` | `password123` | **Passenger** • West Campus Dorms Commuter |
| **David Kim** | Junior | `david.kim@greendale.edu` | `password123` | **Passenger** • Business School Commuter |

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` - Create student/staff account
- `POST /api/auth/login` - Authenticate and obtain JWT
- `GET  /api/auth/me` - Fetch profile of logged-in user
- `PUT  /api/auth/profile` - Update profile and vehicle specifications
- `GET  /api/auth/demo-users` - Fetch pre-seeded demo accounts

### Rides
- `GET    /api/rides` - Search rides (`?origin=&destination=&date=&direction=&minSeats=`)
- `GET    /api/rides/:id` - Fetch ride details, passenger list, and driver reviews
- `POST   /api/rides` - Post a new ride
- `PUT    /api/rides/:id/status` - Update status (`active`, `completed`, `cancelled`)
- `DELETE /api/rides/:id` - Cancel posted ride
- `GET    /api/rides/my/posted` - Fetch rides created by the active driver

### Bookings
- `POST /api/bookings` - Request seat reservation
- `GET  /api/bookings/my` - Fetch booking passes for current passenger
- `GET  /api/bookings/ride/:rideId` - Fetch all passenger requests for a specific ride
- `PUT  /api/bookings/:id/status` - Accept (`confirmed`), decline (`rejected`), or cancel

### Coordination Chat & Feedback
- `GET  /api/messages/:rideId` - View ride chat history
- `POST /api/messages/:rideId` - Send message to ride group
- `POST /api/reviews` - Submit trip rating and comment
- `GET  /api/stats/overview` - Campus sustainability impact metrics and counters
