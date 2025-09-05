import axios from 'axios';
import getApiConfig from '../config/api';

// Create axios instance with proper configuration
const apiConfig = getApiConfig();
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to include auth token
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

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      console.log('Authentication failed - token removed');
      // You could redirect to login here if needed
      // window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
