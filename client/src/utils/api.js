import axios from 'axios';

// API utility for handling base URL in development vs production
const getBaseURL = () => {
  // Check if we're in development mode (localhost:3000)
  const isDevelopment = window.location.hostname === 'localhost' && window.location.port === '3000';
  
  if (isDevelopment) {
    // Force localhost URL in development, ignore REACT_APP_API_BASE_URL
    return 'http://localhost:5003';
  }
  return process.env.REACT_APP_API_BASE_URL || 'https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com';
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;