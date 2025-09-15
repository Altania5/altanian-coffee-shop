// API utility for handling base URL in development vs production
const getBaseURL = () => {
  // In development, use empty string to leverage proxy
  // In production, use the full URL
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return process.env.REACT_APP_API_BASE_URL || '';
};

export default getBaseURL;