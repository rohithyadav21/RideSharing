// Application State Store
const State = {
  currentUser: null,
  demoUsers: [],
  rides: [],
  filters: {
    origin: '',
    destination: '',
    date: '',
    direction: 'all',
    minSeats: 1,
    maxPrice: null
  },
  activeRide: null,
  activeChatRideId: null,
  chatPollingInterval: null,
  myBookings: [],
  myPostedRides: [],
  ecoStats: null,

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('campus_user_info', JSON.stringify(user));
    } else {
      localStorage.removeItem('campus_user_info');
    }
  },

  loadStoredUser() {
    try {
      const stored = localStorage.getItem('campus_user_info');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      this.currentUser = null;
    }
  }
};
