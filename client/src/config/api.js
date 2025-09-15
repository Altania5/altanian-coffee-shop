// API configuration for different environments
const API_CONFIG = {
  production: {
    baseURL: 'https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com',
  },
  development: {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002',  // Point to local server for dev
  }
};

const getApiConfig = () => {
  return process.env.NODE_ENV === 'production' 
    ? API_CONFIG.production 
    : API_CONFIG.development;
};

export default getApiConfig;
