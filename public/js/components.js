// UI Components & Template Generators
const Components = {
  formatDate(dateStr) {
    if (!dateStr) return '';
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return dateStr;
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  },

  getDirectionLabel(dir) {
    switch (dir) {
      case 'to_campus': return '🏫 To Campus';
      case 'from_campus': return '🏡 From Campus';
      case 'inter_campus': return '🔄 Inter-Campus';
      default: return '🚗 Commute';
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  },

  renderRideCard(ride) {
    const isFull = ride.available_seats === 0;
    const isFew = ride.available_seats === 1;
    const seatsClass = isFull ? 'seats-full' : (isFew ? 'seats-few' : 'seats-available');
    const seatsText = isFull ? 'Full (0 seats)' : `${ride.available_seats} ${ride.available_seats === 1 ? 'seat' : 'seats'} left`;

    const priceText = ride.price_per_seat === 0 ? 'FREE' : `$${ride.price_per_seat.toFixed(2)}`;

    const isDriver = State.currentUser && State.currentUser.id === ride.driver_id;

    return `
      <div class="ride-card">
        <div>
          <div class="card-top-header">
            <span class="direction-badge direction-${ride.direction}">
              ${Components.getDirectionLabel(ride.direction)}
            </span>
            <div>
              <span class="price-tag">${priceText}</span>
              ${ride.price_per_seat > 0 ? '<span class="price-sub">/seat</span>' : ''}
            </div>
          </div>

          <div class="route-flow">
            <div class="route-point">
              <div class="point-name">${ride.origin}</div>
              ${ride.origin_landmark ? `<div class="point-landmark">📍 ${ride.origin_landmark}</div>` : ''}
            </div>
            <div class="route-point destination">
              <div class="point-name">${ride.destination}</div>
              ${ride.destination_landmark ? `<div class="point-landmark">🎯 ${ride.destination_landmark}</div>` : ''}
            </div>
          </div>

          <div class="ride-meta-bar">
            <div class="meta-item">
              <span>📅</span>
              <strong>${Components.formatDate(ride.departure_date)}</strong>
            </div>
            <div class="meta-item">
              <span>⏰</span>
              <strong>${Components.formatTime(ride.departure_time)}</strong>
            </div>
            <div class="meta-item">
              <span>⏱️</span>
              <span>~${ride.estimated_duration_mins} min</span>
            </div>
          </div>

          <div class="driver-strip">
            <div class="driver-profile">
              <img src="${ride.driver_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${ride.driver_name}" class="driver-avatar">
              <div>
                <div class="driver-name-text">${ride.driver_name}</div>
                <div class="driver-rating-badge">★ ${ride.driver_rating.toFixed(1)} (${ride.driver_total_rides || 0} rides)</div>
              </div>
            </div>
            <span class="seats-badge ${seatsClass}">${seatsText}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-outline btn-sm" onclick="app.openRideDetailsModal(${ride.id})">
            Details & Route
          </button>
          ${isDriver ? `
            <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('my-rides', 'driver-rides')">
              Manage Ride 🚘
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" ${isFull ? 'disabled' : ''} onclick="app.openBookingModal(${ride.id})">
              ${isFull ? 'Ride Full' : 'Book Seat 🎫'}
            </button>
          `}
        </div>
      </div>
    `;
  },

  renderRideModalContent(ride, bookings = [], reviews = [], currentUser = null) {
    const isDriver = currentUser && currentUser.id === ride.driver_id;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const myBooking = currentUser ? bookings.find(b => b.passenger_id === currentUser.id && ['pending', 'confirmed'].includes(b.status)) : null;

    const prefs = ride.preferences || {};

    return `
      <div>
        <div class="pass-route" style="margin-bottom: 1rem;">
          <span>${ride.origin}</span>
          <span style="color: var(--primary);">➔</span>
          <span>${ride.destination}</span>
        </div>

        <div class="pass-details-grid">
          <div class="pass-details-item">
            <span>Departure Date & Time</span>
            <strong>${Components.formatDate(ride.departure_date)} at ${Components.formatTime(ride.departure_time)}</strong>
          </div>
          <div class="pass-details-item">
            <span>Estimated Duration</span>
            <strong>${ride.estimated_duration_mins} minutes</strong>
          </div>
          <div class="pass-details-item">
            <span>Contribution per Seat</span>
            <strong>${ride.price_per_seat === 0 ? 'FREE (Eco Shared)' : `$${ride.price_per_seat.toFixed(2)}`}</strong>
          </div>
          <div class="pass-details-item">
            <span>Available Seats</span>
            <strong>${ride.available_seats} of ${ride.total_seats} available</strong>
          </div>
          <div class="pass-details-item">
            <span>Vehicle Info</span>
            <strong>${ride.vehicle_info || 'Campus Verified Vehicle'}</strong>
          </div>
          <div class="pass-details-item">
            <span>Pickup Landmark</span>
            <strong>${ride.origin_landmark || 'Contact Driver'}</strong>
          </div>
        </div>

        ${ride.notes ? `
          <div style="background: var(--bg-alt); padding: 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.875rem;">
            <strong>📝 Driver Notes:</strong> ${ride.notes}
          </div>
        ` : ''}

        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Ride Amenities & Policies:</h4>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${prefs.luggage ? '<span class="tag-chip">🧳 Luggage Friendly</span>' : ''}
            ${prefs.music ? '<span class="tag-chip">🎵 Music Enabled</span>' : ''}
            ${prefs.ac ? '<span class="tag-chip">❄️ Air Conditioned</span>' : ''}
            ${prefs.women_only ? '<span class="tag-chip" style="background:#fce7f3; color:#9d174d; border-color:#fbcfe8;">👩 Women-Only Commute</span>' : ''}
          </div>
        </div>

        <!-- Driver Profile Box -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 1.5rem; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <img src="${ride.driver_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 800; font-size: 1rem;">${ride.driver_name}</div>
              <div style="font-size: 0.775rem; color: var(--text-muted);">${ride.driver_department || 'Campus Department'} • ${ride.driver_role}</div>
              <div style="font-size: 0.8rem; color: #b45309; font-weight: 700;">★ ${ride.driver_rating.toFixed(1)} Driver Rating</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge-tag" style="margin: 0;">Verified Campus Driver</span>
          </div>
        </div>

        <!-- Confirmed Co-Riders -->
        ${confirmedBookings.length > 0 ? `
          <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Confirmed Passengers (${confirmedBookings.length}):</h4>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${confirmedBookings.map(b => `
                <div style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-alt); padding: 0.35rem 0.65rem; border-radius: var(--radius-full); font-size: 0.8rem;">
                  <img src="${b.passenger_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + b.passenger_name}" style="width: 22px; height: 22px; border-radius: 50%;">
                  <span>${b.passenger_name} (${b.seats_booked} seat)</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="modal-actions">
          <button class="btn btn-outline" onclick="app.closeModal('rideModal')">Close</button>
          
          ${isDriver ? `
            <button class="btn btn-primary" onclick="app.closeModal('rideModal'); app.navigateTo('my-rides', 'driver-rides');">
              Manage in Driver Hub 🚘
            </button>
          ` : myBooking ? `
            <button class="btn btn-secondary" onclick="app.closeModal('rideModal'); app.openChatModal(${ride.id});">
              Open Ride Chat 💬
            </button>
          ` : `
            <button class="btn btn-primary" ${ride.available_seats === 0 ? 'disabled' : ''} onclick="app.openBookingFormFromDetails(${ride.id})">
              ${ride.available_seats === 0 ? 'Fully Booked' : 'Proceed to Book Seat 🚗'}
            </button>
          `}
        </div>
      </div>
    `;
  },

  renderPassengerBookingCard(b) {
    const statusClass = `status-${b.status}`;
    const passClass = `pass-status-${b.status}`;

    return `
      <div class="pass-card ${passClass}">
        <div class="pass-sidebar"></div>
        <div class="pass-body">
          <div class="pass-header">
            <div>
              <span class="status-badge ${statusClass}">${b.status.toUpperCase()}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Booking #${b.id}</span>
            </div>
            <strong style="font-size: 1.15rem; color: var(--text-main);">
              ${b.total_price === 0 ? 'FREE' : `$${b.total_price.toFixed(2)}`}
            </strong>
          </div>

          <div class="pass-route">
            <span>${b.origin}</span>
            <span style="color: var(--primary);">➔</span>
            <span>${b.destination}</span>
          </div>

          <div class="pass-details-grid">
            <div class="pass-details-item">
              <span>Date & Departure</span>
              <strong>${Components.formatDate(b.departure_date)} at ${Components.formatTime(b.departure_time)}</strong>
            </div>
            <div class="pass-details-item">
              <span>Driver</span>
              <strong>${b.driver_name} (${b.driver_phone})</strong>
            </div>
            <div class="pass-details-item">
              <span>Vehicle</span>
              <strong>${b.vehicle_info || 'Campus Carpool'}</strong>
            </div>
            <div class="pass-details-item">
              <span>Seats Reserved</span>
              <strong>${b.seats_booked} Passenger Seat(s)</strong>
            </div>
          </div>

          ${b.pickup_point ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">📍 <strong>Your Pickup Spot:</strong> ${b.pickup_point}</div>` : ''}

          <div class="pass-actions">
            ${['pending', 'confirmed'].includes(b.status) ? `
              <button class="btn btn-outline btn-sm" onclick="app.openChatModal(${b.ride_id})">
                💬 Ride Chat & Coordination
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="app.cancelBooking(${b.id})">
                Cancel Booking
              </button>
            ` : ''}

            ${b.status === 'completed' ? `
              <button class="btn btn-primary btn-sm" onclick="app.openReviewModal(${b.ride_id}, ${b.driver_id}, '${b.driver_name}')">
                ⭐ Leave Driver Review
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  renderDriverRideCard(ride, bookings = []) {
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

    return `
      <div class="driver-ride-card">
        <div class="card-top-header">
          <div>
            <span class="direction-badge direction-${ride.direction}">
              ${Components.getDirectionLabel(ride.direction)}
            </span>
            <span class="status-badge status-${ride.status}" style="margin-left: 0.5rem;">${ride.status.toUpperCase()}</span>
          </div>
          <div>
            <span class="price-tag">${ride.price_per_seat === 0 ? 'FREE' : `$${ride.price_per_seat.toFixed(2)}`}</span>
            <span class="price-sub">/seat</span>
          </div>
        </div>

        <div class="pass-route" style="margin: 0.75rem 0;">
          <span>${ride.origin}</span>
          <span style="color: var(--primary);">➔</span>
          <span>${ride.destination}</span>
        </div>

        <div class="pass-details-grid">
          <div class="pass-details-item">
            <span>Scheduled</span>
            <strong>${Components.formatDate(ride.departure_date)} at ${Components.formatTime(ride.departure_time)}</strong>
          </div>
          <div class="pass-details-item">
            <span>Seat Capacity</span>
            <strong>${ride.available_seats} left of ${ride.total_seats} seats</strong>
          </div>
          <div class="pass-details-item">
            <span>Vehicle</span>
            <strong>${ride.vehicle_info}</strong>
          </div>
        </div>

        <!-- Pending Requests Section -->
        ${pendingBookings.length > 0 ? `
          <div class="driver-requests-box">
            <h4 style="font-size: 0.875rem; color: #b45309; margin-bottom: 0.65rem;">
              ⏳ Pending Booking Requests (${pendingBookings.length}):
            </h4>
            ${pendingBookings.map(b => `
              <div class="request-item">
                <div class="request-passenger-info">
                  <img src="${b.passenger_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + b.passenger_name}" style="width: 32px; height: 32px; border-radius: 50%;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">${b.passenger_name} (${b.passenger_department || 'Student'})</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Requested ${b.seats_booked} seat(s) • Phone: ${b.passenger_phone}</div>
                    ${b.special_requests ? `<div style="font-size: 0.75rem; color: var(--text-sub);">Note: "${b.special_requests}"</div>` : ''}
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary btn-sm" onclick="app.updateBookingRequestStatus(${b.id}, 'confirmed')">Accept ✓</button>
                  <button class="btn btn-danger-outline btn-sm" onclick="app.updateBookingRequestStatus(${b.id}, 'rejected')">Decline ✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Confirmed Riders List -->
        ${confirmedBookings.length > 0 ? `
          <div style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px dashed var(--border);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">
              Confirmed Passengers (${confirmedBookings.length}):
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${confirmedBookings.map(b => `
                <div style="background: var(--bg-alt); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.825rem; display: flex; align-items: center; gap: 0.4rem;">
                  <span>👤 ${b.passenger_name}</span>
                  <span style="color: var(--text-muted); font-size: 0.75rem;">(${b.passenger_phone})</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Driver Ride Controls -->
        <div class="pass-actions" style="margin-top: 1.25rem;">
          <button class="btn btn-outline btn-sm" onclick="app.openChatModal(${ride.id})">
            💬 Group Chat (${confirmedBookings.length + pendingBookings.length} participants)
          </button>
          
          ${ride.status === 'active' ? `
            <button class="btn btn-primary btn-sm" onclick="app.updateRideTripStatus(${ride.id}, 'completed')">
              Mark Trip Completed 🏁
            </button>
            <button class="btn btn-danger-outline btn-sm" onclick="app.cancelPostedRide(${ride.id})">
              Cancel Ride
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderChatMessage(msg) {
    const isMine = msg.is_mine === 1 || (State.currentUser && msg.sender_id === State.currentUser.id);
    const bubbleClass = isMine ? 'mine' : 'other';

    return `
      <div class="chat-bubble ${bubbleClass}">
        ${!isMine ? `<div class="chat-sender-name">${msg.sender_name}</div>` : ''}
        <div>${msg.message}</div>
        <div class="chat-time">${Components.formatTime(msg.created_at ? msg.created_at.split(' ')[1] : '')}</div>
      </div>
    `;
  },

  renderLeaderboardItem(item, type, rank) {
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    const rankDisplay = rank < 3 ? medals[rank] : `#${rank + 1}`;

    const scoreDisplay = type === 'eco' 
      ? `${item.co2_saved_kg.toFixed(1)} kg CO₂` 
      : `★ ${item.rating.toFixed(1)} (${item.total_rides} trips)`;

    return `
      <div class="leaderboard-item">
        <div class="leader-rank">${rankDisplay}</div>
        <div class="leader-info">
          <img src="${item.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.name}" class="avatar-sm">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem;">${item.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${item.department || item.role}</div>
          </div>
        </div>
        <div class="leader-score">${scoreDisplay}</div>
      </div>
    `;
  }
};
