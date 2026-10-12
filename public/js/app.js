// Main Application Controller
const app = {
  async init() {
    console.log('🚀 Initializing Campus Ride Sharing App...');

    // Set default dates on inputs
    const today = new Date().toISOString().split('T')[0];
    const postDateInput = document.getElementById('postDate');
    if (postDateInput) postDateInput.value = today;

    // Load demo users & current session
    await this.loadDemoUsers();
    await this.restoreUserSession();

    // Load initial data
    await this.fetchOverviewStats();
    await this.fetchRides();

    // Check for pending requests badge
    this.checkPendingBadges();
  },

  // Navigation Controller
  navigateTo(viewId, subTab = null) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');

    const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
    if (activeLink) activeLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'explore') {
      this.fetchRides();
    } else if (viewId === 'my-rides') {
      this.loadMyRidesHub(subTab);
    } else if (viewId === 'eco') {
      this.loadEcoDashboard();
    }
  },

  // Auth & Session
  async loadDemoUsers() {
    try {
      const res = await API.auth.getDemoUsers();
      if (res.success && res.demoUsers) {
        State.demoUsers = res.demoUsers;
        this.renderDemoUserDropdown();
      }
    } catch (err) {
      console.warn('Could not load demo accounts:', err);
    }
  },

  renderDemoUserDropdown() {
    const listEl = document.getElementById('demoUserList');
    if (!listEl) return;

    listEl.innerHTML = State.demoUsers.map(u => {
      const isCurrent = State.currentUser && State.currentUser.id === u.id;
      return `
        <div class="demo-user-item ${isCurrent ? 'active-user' : ''}" onclick="app.switchDemoUser(${u.id})">
          <img src="${u.avatar}" class="avatar-sm" style="width: 28px; height: 28px;">
          <div class="demo-user-info">
            <span class="demo-user-name">${u.name} ${u.is_driver ? '🚘' : '🎒'}</span>
            <span class="demo-user-meta">${u.role.toUpperCase()} • ${u.department.split('&')[0]}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  async restoreUserSession() {
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.auth.getMe();
        if (res.success && res.user) {
          State.setCurrentUser(res.user);
          this.updateUserUI(res.user);
          return;
        }
      } catch (e) {
        API.setToken(null);
      }
    }

    // Default to first demo driver (Alex Rivera) if no session exists
    if (State.demoUsers.length > 0) {
      this.switchDemoUser(State.demoUsers[0].id);
    } else {
      this.showGuestUI();
    }
  },

  switchDemoUser(userId) {
    const user = State.demoUsers.find(u => u.id === userId);
    if (!user) return;

    API.setToken(user.token);
    State.setCurrentUser(user);
    this.updateUserUI(user);
    this.toggleDemoDropdown(false);
    Components.showToast(`Switched active profile to ${user.name} (${user.is_driver ? 'Driver' : 'Passenger'})`, 'success');

    // Refresh current view
    const activeView = document.querySelector('.app-view.active');
    if (activeView && activeView.id === 'view-my-rides') {
      this.loadMyRidesHub();
    } else {
      this.fetchRides();
    }
    this.checkPendingBadges();
  },

  updateUserUI(user) {
    document.getElementById('userChip').classList.remove('hidden');
    document.getElementById('guestControls').classList.add('hidden');

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').src = user.avatar;
    document.getElementById('userRoleBadge').textContent = user.role.toUpperCase();

    const roleNameEl = document.getElementById('currentRoleName');
    if (roleNameEl) {
      const shortName = user.name.split(' ')[0];
      roleNameEl.textContent = `${shortName} (${user.is_driver ? 'Driver' : 'Rider'})`;
    }

    // Pre-fill vehicle in Post Ride form if driver
    const carInput = document.getElementById('postVehicleInfo');
    if (carInput && user.vehicle_model) {
      carInput.value = `${user.vehicle_model} (${user.vehicle_color || ''}) • ${user.vehicle_plate || ''}`;
    }

    this.renderDemoUserDropdown();
  },

  showGuestUI() {
    document.getElementById('userChip').classList.add('hidden');
    document.getElementById('guestControls').classList.remove('hidden');
  },

  toggleDemoDropdown(forceState = null) {
    const dropdown = document.getElementById('demoDropdown');
    if (!dropdown) return;

    if (forceState !== null) {
      dropdown.classList.toggle('hidden', !forceState);
    } else {
      dropdown.classList.toggle('hidden');
    }
  },

  // Overview Stats
  async fetchOverviewStats() {
    try {
      const res = await API.stats.getOverview();
      if (res.success && res.stats) {
        State.ecoStats = res.stats;
        document.getElementById('statRidesCount').textContent = res.stats.activeRides;
        document.getElementById('statCo2Saved').textContent = `${res.stats.totalCo2SavedKg} kg`;
        document.getElementById('statMoneySaved').textContent = `$${res.stats.totalMoneySaved}`;
      }
    } catch (err) {
      console.warn('Failed to load stats overview:', err);
    }
  },

  // Explore Rides & Search
  async fetchRides() {
    const grid = document.getElementById('ridesGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Scanning campus commutes...</p>
      </div>
    `;

    try {
      const res = await API.rides.getAll(State.filters);
      if (res.success) {
        State.rides = res.rides;
        this.renderRidesGrid(res.rides);
      }
    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Could not load campus rides</h3>
          <p>${err.message}</p>
          <button class="btn btn-outline btn-sm" style="margin-top:1rem;" onclick="app.fetchRides()">Retry</button>
        </div>
      `;
    }
  },

  renderRidesGrid(rides) {
    const grid = document.getElementById('ridesGrid');
    const subtitle = document.getElementById('ridesCountSubtitle');
    if (!grid) return;

    if (subtitle) {
      subtitle.textContent = `Found ${rides.length} scheduled carpool ${rides.length === 1 ? 'ride' : 'rides'} matching your search`;
    }

    if (rides.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🚗</div>
          <h3>No rides found matching this criteria</h3>
          <p>Be the first to offer a ride for this route or adjust your filter terms!</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="app.navigateTo('post-ride')">
            + Offer a Ride Now
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = rides.map(r => Components.renderRideCard(r)).join('');
  },

  setDirectionFilter(dir) {
    State.filters.direction = dir;
    document.querySelectorAll('.filter-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-direction') === dir);
    });
    this.fetchRides();
  },

  handleSearchSubmit(e) {
    e.preventDefault();
    State.filters.origin = document.getElementById('searchOrigin').value.trim();
    State.filters.destination = document.getElementById('searchDestination').value.trim();
    State.filters.date = document.getElementById('searchDate').value;
    State.filters.minSeats = document.getElementById('searchSeats').value;
    this.fetchRides();
  },

  quickFilterToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('searchDate').value = today;
    State.filters.date = today;
    this.fetchRides();
  },

  quickFilterFree() {
    State.filters.maxPrice = 0;
    this.fetchRides();
  },

  quickFilterReset() {
    document.getElementById('searchOrigin').value = '';
    document.getElementById('searchDestination').value = '';
    document.getElementById('searchDate').value = '';
    document.getElementById('searchSeats').value = '1';
    State.filters = { origin: '', destination: '', date: '', direction: 'all', minSeats: 1, maxPrice: null };
    this.setDirectionFilter('all');
  },

  // Ride Details & Booking Modal
  async openRideDetailsModal(rideId) {
    const modal = document.getElementById('rideModal');
    const content = document.getElementById('modalRideContent');
    if (!modal || !content) return;

    content.innerHTML = '<div class="spinner"></div>';
    modal.classList.remove('hidden');

    try {
      const res = await API.rides.getById(rideId);
      if (res.success && res.ride) {
        State.activeRide = res.ride;
        document.getElementById('modalRideTitle').textContent = `Ride Details • ${res.ride.origin} ➔ ${res.ride.destination}`;
        content.innerHTML = Components.renderRideModalContent(res.ride, res.bookings, res.reviews, State.currentUser);
      }
    } catch (err) {
      content.innerHTML = `<p style="color:var(--danger);">Error loading ride details: ${err.message}</p>`;
    }
  },

  openBookingModal(rideId) {
    this.openRideDetailsModal(rideId);
  },

  openBookingFormFromDetails(rideId) {
    const ride = State.activeRide;
    if (!ride) return;

    const content = document.getElementById('modalRideContent');
    const maxSeats = ride.available_seats;

    content.innerHTML = `
      <form id="bookingForm" onsubmit="app.handleBookingSubmit(event, ${ride.id})">
        <h3 style="margin-bottom:0.75rem;">Reserve Your Seat</h3>
        <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1.25rem;">
          Ride: <strong>${ride.origin}</strong> ➔ <strong>${ride.destination}</strong><br>
          Departure: <strong>${Components.formatDate(ride.departure_date)} at ${Components.formatTime(ride.departure_time)}</strong>
        </p>

        <div class="form-group">
          <label for="bookSeatsCount">Seats Needed *</label>
          <select id="bookSeatsCount" required onchange="app.updateBookingPriceCalc(${ride.price_per_seat})">
            ${Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => `<option value="${n}">${n} Seat${n > 1 ? 's' : ''}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="bookPickupPoint">Specific Pickup Location / Landmark</label>
          <input type="text" id="bookPickupPoint" value="${ride.origin_landmark || ride.origin}" placeholder="e.g. Near Coffee Haven">
        </div>

        <div class="form-group">
          <label for="bookSpecialRequests">Note for Driver (Optional)</label>
          <textarea id="bookSpecialRequests" rows="2" placeholder="e.g. Carrying a small instrument, or running 2 mins late..."></textarea>
        </div>

        <div style="background:var(--bg-alt); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Contribution</div>
            <div id="bookingTotalPriceDisplay" style="font-size:1.5rem; font-weight:800; color:var(--text-main);">
              ${ride.price_per_seat === 0 ? 'FREE' : `$${ride.price_per_seat.toFixed(2)}`}
            </div>
          </div>
          <span class="badge-tag" style="margin:0;">Green Carpool</span>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="app.openRideDetailsModal(${ride.id})">Back</button>
          <button type="submit" class="btn btn-primary">Confirm & Send Request 🚀</button>
        </div>
      </form>
    `;
  },

  updateBookingPriceCalc(pricePerSeat) {
    const seats = Number(document.getElementById('bookSeatsCount').value);
    const total = seats * pricePerSeat;
    const display = document.getElementById('bookingTotalPriceDisplay');
    if (display) {
      display.textContent = total === 0 ? 'FREE' : `$${total.toFixed(2)}`;
    }
  },

  async handleBookingSubmit(e, rideId) {
    e.preventDefault();
    const seats = Number(document.getElementById('bookSeatsCount').value);
    const pickup = document.getElementById('bookPickupPoint').value.trim();
    const requests = document.getElementById('bookSpecialRequests').value.trim();

    try {
      const res = await API.bookings.create({
        ride_id: rideId,
        seats_booked: seats,
        pickup_point: pickup,
        special_requests: requests
      });

      if (res.success) {
        this.closeModal('rideModal');
        Components.showToast('Booking request sent to driver! Track it in My Bookings.', 'success');
        this.navigateTo('my-rides', 'passenger-bookings');
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // Post Ride Form
  handleDirectionChange(dir) {
    const destInput = document.getElementById('postDestination');
    const originInput = document.getElementById('postOrigin');
    if (dir === 'to_campus') {
      destInput.value = 'Greendale Central Campus Quad';
    } else if (dir === 'from_campus') {
      originInput.value = 'Greendale Campus Main Gate';
    }
  },

  async handlePostRideSubmit(e) {
    e.preventDefault();

    const rideData = {
      direction: document.getElementById('postDirection').value,
      origin: document.getElementById('postOrigin').value.trim(),
      origin_landmark: document.getElementById('postOriginLandmark').value.trim(),
      destination: document.getElementById('postDestination').value.trim(),
      destination_landmark: document.getElementById('postDestLandmark').value.trim(),
      departure_date: document.getElementById('postDate').value,
      departure_time: document.getElementById('postTime').value,
      estimated_duration_mins: Number(document.getElementById('postDuration').value),
      total_seats: Number(document.getElementById('postTotalSeats').value),
      price_per_seat: Number(document.getElementById('postPrice').value),
      vehicle_info: document.getElementById('postVehicleInfo').value.trim(),
      notes: document.getElementById('postNotes').value.trim(),
      preferences: {
        luggage: document.getElementById('prefLuggage').checked,
        music: document.getElementById('prefMusic').checked,
        ac: document.getElementById('prefAc').checked,
        women_only: document.getElementById('prefWomenOnly').checked
      }
    };

    try {
      const res = await API.rides.create(rideData);
      if (res.success) {
        Components.showToast('Ride posted to campus successfully! 🚘', 'success');
        document.getElementById('postRideForm').reset();
        this.navigateTo('my-rides', 'driver-rides');
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // My Rides & Bookings Hub
  switchMyRidesTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabId}`);
    });

    if (tabId === 'passenger-bookings') {
      this.loadPassengerBookings();
    } else {
      this.loadDriverRides();
    }
  },

  async loadMyRidesHub(subTab = null) {
    const tabToLoad = subTab || 'passenger-bookings';
    this.switchMyRidesTab(tabToLoad);
  },

  async loadPassengerBookings() {
    const container = document.getElementById('passengerBookingsList');
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await API.bookings.getMy();
      if (res.success) {
        State.myBookings = res.bookings;
        if (res.bookings.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🎫</div>
              <h3>No passenger bookings yet</h3>
              <p>Explore available rides and book a seat for your daily campus commute!</p>
              <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="app.navigateTo('explore')">
                Explore Campus Rides 🚗
              </button>
            </div>
          `;
          return;
        }

        container.innerHTML = res.bookings.map(b => Components.renderPassengerBookingCard(b)).join('');
      }
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger); text-align:center;">${err.message}</p>`;
    }
  },

  async loadDriverRides() {
    const container = document.getElementById('driverRidesList');
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await API.rides.getMyPosted();
      if (res.success) {
        State.myPostedRides = res.rides;

        if (res.rides.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🚘</div>
              <h3>No posted rides yet</h3>
              <p>Are you driving to or from campus? Offer empty seats and save fuel costs!</p>
              <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="app.navigateTo('post-ride')">
                + Offer Your First Ride
              </button>
            </div>
          `;
          return;
        }

        // Fetch bookings for each ride to render passenger requests
        const cardsHtml = await Promise.all(res.rides.map(async r => {
          try {
            const bRes = await API.bookings.getForRide(r.id);
            return Components.renderDriverRideCard(r, bRes.bookings || []);
          } catch (e) {
            return Components.renderDriverRideCard(r, []);
          }
        }));

        container.innerHTML = cardsHtml.join('');
      }
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger); text-align:center;">${err.message}</p>`;
    }
  },

  async updateBookingRequestStatus(bookingId, status) {
    try {
      const res = await API.bookings.updateStatus(bookingId, status);
      if (res.success) {
        Components.showToast(`Booking request ${status}!`, 'success');
        this.loadDriverRides();
        this.checkPendingBadges();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await API.bookings.updateStatus(bookingId, 'cancelled');
      if (res.success) {
        Components.showToast('Booking cancelled.', 'info');
        this.loadPassengerBookings();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async updateRideTripStatus(rideId, status) {
    if (!confirm(`Mark this ride as ${status}? This will calculate eco savings and complete all passenger trips.`)) return;
    try {
      const res = await API.rides.updateStatus(rideId, status);
      if (res.success) {
        Components.showToast(`Ride trip marked as ${status}! Eco savings recorded 🌿`, 'success');
        this.loadDriverRides();
        this.fetchOverviewStats();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async cancelPostedRide(rideId) {
    if (!confirm('Are you sure you want to cancel this entire ride? Passengers will be notified.')) return;
    try {
      const res = await API.rides.delete(rideId);
      if (res.success) {
        Components.showToast('Ride cancelled.', 'info');
        this.loadDriverRides();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async checkPendingBadges() {
    const badge = document.getElementById('pendingRequestsBadge');
    if (!badge || !State.currentUser || !State.currentUser.is_driver) return;

    try {
      const res = await API.rides.getMyPosted();
      if (res.success) {
        const hasPending = res.rides.some(r => r.pending_requests_count > 0);
        badge.classList.toggle('hidden', !hasPending);
      }
    } catch (e) {}
  },

  // Coordination Chat Modal
  async openChatModal(rideId) {
    State.activeChatRideId = rideId;
    const modal = document.getElementById('chatModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    await this.fetchChatMessages(rideId);

    // Start polling every 4 seconds
    clearInterval(State.chatPollingInterval);
    State.chatPollingInterval = setInterval(() => {
      if (State.activeChatRideId) {
        this.fetchChatMessages(State.activeChatRideId, false);
      }
    }, 4000);
  },

  async fetchChatMessages(rideId, scrollToBottom = true) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    try {
      const res = await API.messages.get(rideId);
      if (res.success) {
        if (res.messages.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.875rem;">
              💬 Start the conversation! Coordinate exact pickup landmarks or timing.
            </div>
          `;
          return;
        }

        container.innerHTML = res.messages.map(m => Components.renderChatMessage(m)).join('');
        if (scrollToBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">${err.message}</p>`;
    }
  },

  async handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !State.activeChatRideId) return;

    input.value = '';

    try {
      await API.messages.send(State.activeChatRideId, msg);
      await this.fetchChatMessages(State.activeChatRideId, true);
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // Review & Rating Modal
  openReviewModal(rideId, revieweeId, revieweeName) {
    document.getElementById('reviewRideId').value = rideId;
    document.getElementById('reviewRevieweeId').value = revieweeId;
    document.getElementById('reviewTargetPrompt').textContent = `Rate your carpool experience with ${revieweeName}:`;
    document.getElementById('reviewModal').classList.remove('hidden');
  },

  async handleSubmitReview(e) {
    e.preventDefault();
    const rideId = document.getElementById('reviewRideId').value;
    const revieweeId = document.getElementById('reviewRevieweeId').value;
    const rating = document.querySelector('input[name="starRating"]:checked').value;
    const comment = document.getElementById('reviewComment').value.trim();

    try {
      const res = await API.reviews.submit({
        ride_id: Number(rideId),
        reviewee_id: Number(revieweeId),
        rating: Number(rating),
        comment
      });

      if (res.success) {
        this.closeModal('reviewModal');
        Components.showToast('Feedback submitted! Thank you for supporting campus trust. ⭐', 'success');
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // Eco Dashboard
  async loadEcoDashboard() {
    await this.fetchOverviewStats();
    const stats = State.ecoStats;
    if (stats) {
      document.getElementById('ecoCo2Val').textContent = `${stats.totalCo2SavedKg} kg`;
      document.getElementById('ecoMoneyVal').textContent = `$${stats.totalMoneySaved}`;
      document.getElementById('ecoMilesVal').textContent = `${stats.sharedMilesSaved} mi`;
      document.getElementById('ecoMembersVal').textContent = stats.totalUsers;
      document.getElementById('ecoTreesEquiv').textContent = `Equivalent to planting ${stats.treesEquivalent} mature trees on campus`;
    }

    try {
      const res = await API.stats.getLeaderboard();
      if (res.success) {
        const ecoList = document.getElementById('ecoLeaderboardList');
        const driverList = document.getElementById('driverLeaderboardList');

        if (ecoList) {
          ecoList.innerHTML = res.ecoLeaders.map((u, i) => Components.renderLeaderboardItem(u, 'eco', i)).join('');
        }
        if (driverList) {
          driverList.innerHTML = res.topDrivers.map((u, i) => Components.renderLeaderboardItem(u, 'driver', i)).join('');
        }
      }
    } catch (e) {}
  },

  // User Profile Modal
  openProfileModal() {
    const user = State.currentUser;
    if (!user) return;

    const modal = document.getElementById('profileModal');
    const content = document.getElementById('profileContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); margin-bottom: 0.5rem;">
        <h3 style="font-size: 1.25rem;">${user.name}</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">${user.email}</p>
        <span class="badge-role" style="display: inline-block; margin-top: 0.35rem;">${user.role.toUpperCase()} • ${user.department}</span>
      </div>

      <div class="pass-details-grid">
        <div class="pass-details-item">
          <span>Campus ID</span>
          <strong>${user.campus_id}</strong>
        </div>
        <div class="pass-details-item">
          <span>Phone</span>
          <strong>${user.phone}</strong>
        </div>
        <div class="pass-details-item">
          <span>Driver Status</span>
          <strong>${user.is_driver ? 'Verified Campus Driver 🚘' : 'Campus Rider 🎒'}</strong>
        </div>
        <div class="pass-details-item">
          <span>Community Rating</span>
          <strong>★ ${user.rating ? user.rating.toFixed(1) : '5.0'} (${user.total_rides || 0} rides)</strong>
        </div>
        <div class="pass-details-item">
          <span>Personal CO₂ Saved</span>
          <strong>${user.co2_saved_kg ? user.co2_saved_kg.toFixed(1) : 0} kg</strong>
        </div>
        <div class="pass-details-item">
          <span>Travel Costs Saved</span>
          <strong>$${user.money_saved ? user.money_saved.toFixed(0) : 0}</strong>
        </div>
      </div>

      ${user.is_driver && user.vehicle_model ? `
        <div style="background: var(--bg-alt); padding: 0.85rem; border-radius: var(--radius-md); margin-top: 1rem;">
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Registered Vehicle</span>
          <div style="font-weight: 700; font-size: 0.95rem; margin-top: 0.2rem;">
            ${user.vehicle_model} (${user.vehicle_color || ''}) • Plate: ${user.vehicle_plate || 'CAMPUS'}
          </div>
        </div>
      ` : ''}

      <div class="modal-actions" style="margin-top: 2rem;">
        <button class="btn btn-outline" onclick="app.closeModal('profileModal')">Close</button>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  // Auth Modal
  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    document.getElementById('authModal').classList.remove('hidden');
  },

  switchAuthTab(tab) {
    document.getElementById('tabAuthLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabAuthRegister').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.getElementById('authModalTitle').textContent = tab === 'login' ? 'Sign In to CampusRide' : 'Create Campus Account';
  },

  toggleRegisterDriverFields(isDriver) {
    document.getElementById('regDriverFields').classList.toggle('hidden', !isDriver);
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await API.auth.login(email, password);
      if (res.success) {
        API.setToken(res.token);
        State.setCurrentUser(res.user);
        this.updateUserUI(res.user);
        this.closeModal('authModal');
        Components.showToast(`Welcome back, ${res.user.name}!`, 'success');
        this.fetchRides();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const isDriver = document.getElementById('regIsDriver').checked;

    const userData = {
      name: document.getElementById('regName').value.trim(),
      role: document.getElementById('regRole').value,
      email: document.getElementById('regEmail').value.trim(),
      campus_id: document.getElementById('regCampusId').value.trim(),
      department: document.getElementById('regDepartment').value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      password: document.getElementById('regPassword').value,
      is_driver: isDriver ? 1 : 0,
      vehicle_model: isDriver ? document.getElementById('regCarModel').value.trim() : null,
      vehicle_plate: isDriver ? document.getElementById('regCarPlate').value.trim() : null
    };

    try {
      const res = await API.auth.register(userData);
      if (res.success) {
        API.setToken(res.token);
        State.setCurrentUser(res.user);
        this.updateUserUI(res.user);
        this.closeModal('authModal');
        Components.showToast('Account created successfully! Welcome to CampusRide 🎉', 'success');
        this.fetchRides();
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  showSafetyModal() {
    document.getElementById('safetyModal').classList.remove('hidden');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    if (modalId === 'chatModal') {
      clearInterval(State.chatPollingInterval);
      State.activeChatRideId = null;
    }
  },

  closeModalOnOverlay(e, modalId) {
    if (e.target && e.target.classList.contains('modal-overlay')) {
      this.closeModal(modalId);
    }
  }
};

// Global click listener to close demo dropdown when clicked outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('demoDropdown');
  const btn = document.querySelector('.demo-switcher-btn');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
      dropdown.classList.add('hidden');
    }
  }
});

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
