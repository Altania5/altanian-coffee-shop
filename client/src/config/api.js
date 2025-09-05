// API configuration for different environments
const API_CONFIG = {
  production: {
    baseURL: 'https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com',
  },
  development: {
    baseURL: process.env.NODE_ENV === 'development' 
      ? 'https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com'  // Point to Heroku for local dev
      : '',  // Use relative URLs in production build
  }
};

const getApiConfig = () => {
  return process.env.NODE_ENV === 'production' 
    ? API_CONFIG.production 
    : API_CONFIG.development;
};

export default getApiConfig;
