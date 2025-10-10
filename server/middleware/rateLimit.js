const rateLimitService = require('../services/rateLimitService');

/**
 * Rate limiting middleware for API keys
 * @param {number} windowSize - Time window in seconds (default: 60)
 * @returns {Function} Express middleware function
 */
const rateLimit = (windowSize = 60) => {
  return (req, res, next) => {
    // Only apply rate limiting to API key authenticated requests
    if (!req.user || !req.user.apiKeyId) {
      return next();
    }

    const { apiKeyId, scope } = req.user;
    
    try {
      const result = rateLimitService.checkRateLimit(apiKeyId, scope, windowSize);
      
      // Add rate limit headers to response
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit: result.headers['X-RateLimit-Limit'],
              remaining: result.headers['X-RateLimit-Remaining'],
              resetTime: result.headers['X-RateLimit-Reset'],
              window: result.headers['X-RateLimit-Window']
            }
          }
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
};

/**
 * Optional rate limiting middleware (doesn't block requests)
 * @param {number} windowSize - Time window in seconds (default: 60)
 * @returns {Function} Express middleware function
 */
const optionalRateLimit = (windowSize = 60) => {
  return (req, res, next) => {
    // Only apply rate limiting to API key authenticated requests
    if (!req.user || !req.user.apiKeyId) {
      return next();
    }

    const { apiKeyId, scope } = req.user;
    
    try {
      const result = rateLimitService.checkRateLimit(apiKeyId, scope, windowSize);
      
      // Add rate limit headers to response
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Log rate limit status but don't block
      if (!result.allowed) {
        console.warn(`Rate limit exceeded for API key ${apiKeyId}:`, {
          remaining: result.headers['X-RateLimit-Remaining'],
          resetTime: result.headers['X-RateLimit-Reset']
        });
      }

      next();
    } catch (error) {
      console.error('Optional rate limit middleware error:', error);
      next();
    }
  };
};

/**
 * Get rate limit information for an API key
 * @param {string} apiKeyId - API key ID
 * @param {string} scope - API key scope
 * @param {number} windowSize - Time window in seconds
 * @returns {Object} Rate limit information
 */
const getRateLimitInfo = (apiKeyId, scope, windowSize = 60) => {
  return rateLimitService.getRateLimitInfo(apiKeyId, scope, windowSize);
};

/**
 * Get bucket status for an API key
 * @param {string} apiKeyId - API key ID
 * @param {string} scope - API key scope
 * @param {number} windowSize - Time window in seconds
 * @returns {Object} Bucket status
 */
const getBucketStatus = (apiKeyId, scope, windowSize = 60) => {
  return rateLimitService.getBucketStatus(apiKeyId, scope, windowSize);
};

/**
 * Reset rate limit bucket for an API key
 * @param {string} apiKeyId - API key ID
 * @param {string} scope - API key scope
 * @param {number} windowSize - Time window in seconds
 */
const resetBucket = (apiKeyId, scope, windowSize = 60) => {
  return rateLimitService.resetBucket(apiKeyId, scope, windowSize);
};

module.exports = {
  rateLimit,
  optionalRateLimit,
  getRateLimitInfo,
  getBucketStatus,
  resetBucket
};
