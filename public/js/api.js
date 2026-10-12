// Client-Side API Helper for Campus Ride Sharing
const API = (() => {
  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('campus_ride_token');
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('campus_ride_token', token);
    } else {
      localStorage.removeItem('campus_ride_token');
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  return {
    getToken,
    setToken,

    auth: {
      login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
      getMe: () => request('/auth/me'),
      updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
      getDemoUsers: () => request('/auth/demo-users')
    },

    rides: {
      getAll: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            params.append(key, val);
          }
        });
        const query = params.toString() ? `?${params.toString()}` : '';
        return request(`/rides${query}`);
      },
      getById: (id) => request(`/rides/${id}`),
      create: (rideData) => request('/rides', { method: 'POST', body: JSON.stringify(rideData) }),
      updateStatus: (id, status) => request(`/rides/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
      delete: (id) => request(`/rides/${id}`, { method: 'DELETE' }),
      getMyPosted: () => request('/rides/my/posted')
    },

    bookings: {
      create: (bookingData) => request('/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
      getMy: () => request('/bookings/my'),
      getForRide: (rideId) => request(`/bookings/ride/${rideId}`),
      updateStatus: (id, status) => request(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
    },

    messages: {
      get: (rideId) => request(`/messages/${rideId}`),
      send: (rideId, message) => request(`/messages/${rideId}`, { method: 'POST', body: JSON.stringify({ message }) })
    },

    reviews: {
      submit: (reviewData) => request('/reviews', { method: 'POST', body: JSON.stringify(reviewData) }),
      getUserReviews: (userId) => request(`/reviews/user/${userId}`)
    },

    stats: {
      getOverview: () => request('/stats/overview'),
      getLeaderboard: () => request('/stats/leaderboard'),
      getLocations: () => request('/stats/locations'),
      getNotifications: () => request('/stats/notifications'),
      markNotificationsRead: () => request('/stats/notifications/read', { method: 'POST' })
    }
  };
})();
