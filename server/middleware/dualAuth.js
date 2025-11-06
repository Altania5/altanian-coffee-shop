const jwt = require('jsonwebtoken');
const { apiKeyAuth } = require('./apiKeyAuth');

/**
 * Dual authentication middleware that supports both JWT and API key authentication
 * Tries JWT first, then falls back to API key if JWT is not present
 */
const dualAuth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    const apiKey = req.header('x-api-key');

    // If both are provided, JWT takes precedence
    if (token) {
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (verified) {
          req.user = {
            id: verified.id,
            role: verified.role,
            firstName: verified.firstName,
            authMethod: 'jwt'
          };
          return next();
        }
      } catch (jwtError) {
        // JWT verification failed, continue to API key check
        console.log('JWT verification failed, trying API key:', jwtError.message);
      }
    }

    // If no JWT or JWT failed, try API key
    if (apiKey) {
      return apiKeyAuth(req, res, next);
    }

    // No valid authentication found
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Provide either x-auth-token (JWT) or x-api-key header.' 
    });

  } catch (error) {
    console.error('Dual authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

/**
 * Optional dual authentication middleware
 * Allows requests to proceed without authentication but sets req.user if valid auth is provided
 */
const optionalDualAuth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    const apiKey = req.header('x-api-key');

    // If both are provided, JWT takes precedence
    if (token) {
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (verified) {
          req.user = {
            id: verified.id,
            role: verified.role,
            firstName: verified.firstName,
            authMethod: 'jwt'
          };
          return next();
        }
      } catch (jwtError) {
        // JWT verification failed, continue to API key check
        console.log('JWT verification failed, trying API key:', jwtError.message);
      }
    }

    // If no JWT or JWT failed, try API key
    if (apiKey) {
      return apiKeyAuth(req, res, next);
    }

    // No authentication provided, continue without setting req.user
    next();

  } catch (error) {
    console.error('Optional dual authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

module.exports = {
  dualAuth,
  optionalDualAuth
};

