/**
 * Axios Configuration
 * Sets up request/response interceptors for authentication
 */

import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = '/api';

// Request interceptor to add authentication headers
axios.interceptors.request.use(
  (config) => {
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    const authBypass = localStorage.getItem('authBypass');

    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add x-auth-bypass header for development mode
    if (authBypass === 'true') {
      config.headers['x-auth-bypass'] = 'true';
    } else {
      config.headers['x-auth-bypass'] = 'false';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
