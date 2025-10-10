const apiKeyService = require('../services/apiKeyService');
const apiKeyScopeService = require('../services/apiKeyScopeService');
const ApiKeyLog = require('../models/apiKeyLog.model');

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('x-api-key');
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false,
        message: 'API key required. Include x-api-key header.' 
      });
    }

    // Get client IP for IP whitelist validation
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Validate the API key
    const keyData = await apiKeyService.validateKey(apiKey, clientIP);
    
    if (!keyData) {
      // Log failed authentication attempt
      await logApiUsage(req, res, apiKey, null, null, 401, 0, 'Invalid API key or IP not allowed');
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid API key or IP not allowed' 
      });
    }

    // Check scope permissions
    const method = req.method;
    const endpoint = req.originalUrl || req.url;
    
    if (!apiKeyScopeService.hasPermission(keyData.scope, method, endpoint)) {
      // Log failed authorization attempt
      await logApiUsage(req, res, apiKey, keyData.id, keyData.name, 403, 0, 'Insufficient scope permissions');
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient scope permissions',
        error: {
          type: 'SCOPE_PERMISSION_DENIED',
          details: {
            requiredScope: keyData.scope,
            method: method,
            endpoint: endpoint
          }
        }
      });
    }

    // Set user context for API key
    req.user = {
      id: keyData.id,
      role: apiKeyScopeService.requiresOwnerRole(keyData.scope) ? 'owner' : 'user',
      firstName: keyData.name,
      authMethod: 'api-key',
      apiKeyId: keyData.id,
      scope: keyData.scope
    };

    // Add API key info to request
    req.apiKey = {
      id: keyData.id,
      name: keyData.name,
      scope: keyData.scope,
      allowedIPs: keyData.allowedIPs
    };

    // Log successful authentication
    const startTime = Date.now();
    
    // Override res.json to capture response status and time
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log the API usage asynchronously
      logApiUsage(req, res, apiKey, keyData.id, keyData.name, statusCode, responseTime, null)
        .catch(err => console.error('Error logging API usage:', err));
      
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

// Helper function to log API usage
async function logApiUsage(req, res, apiKey, apiKeyId, apiKeyName, statusCode, responseTime, errorMessage) {
  try {
    // Don't log sensitive data in request body
    let requestBody = null;
    if (req.body && Object.keys(req.body).length > 0) {
      // Create a sanitized copy without sensitive fields
      requestBody = { ...req.body };
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
      sensitiveFields.forEach(field => {
        if (requestBody[field]) {
          requestBody[field] = '[REDACTED]';
        }
      });
    }

    const logEntry = new ApiKeyLog({
      apiKeyId: apiKeyId || 'unknown',
      apiKeyName: apiKeyName || 'unknown',
      endpoint: req.originalUrl || req.url,
      method: req.method,
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || '',
      requestBody: requestBody,
      responseStatus: statusCode,
      responseTime: responseTime,
      errorMessage: errorMessage
    });

    await logEntry.save();
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Don't throw error to avoid breaking the main request
  }
}

// Middleware for optional API key authentication (used with JWT)
const optionalApiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('x-api-key');
    
    if (!apiKey) {
      // No API key provided, continue without setting req.user
      return next();
    }

    // Get client IP for IP whitelist validation
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Validate the API key
    const keyData = await apiKeyService.validateKey(apiKey, clientIP);
    
    if (!keyData) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid API key or IP not allowed' 
      });
    }

    // Check scope permissions
    const method = req.method;
    const endpoint = req.originalUrl || req.url;
    
    if (!apiKeyScopeService.hasPermission(keyData.scope, method, endpoint)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient scope permissions',
        error: {
          type: 'SCOPE_PERMISSION_DENIED',
          details: {
            requiredScope: keyData.scope,
            method: method,
            endpoint: endpoint
          }
        }
      });
    }

    // Set user context for API key
    req.user = {
      id: keyData.id,
      role: apiKeyScopeService.requiresOwnerRole(keyData.scope) ? 'owner' : 'user',
      firstName: keyData.name,
      authMethod: 'api-key',
      apiKeyId: keyData.id,
      scope: keyData.scope
    };

    // Add API key info to request
    req.apiKey = {
      id: keyData.id,
      name: keyData.name,
      scope: keyData.scope,
      allowedIPs: keyData.allowedIPs
    };

    // Log successful authentication
    const startTime = Date.now();
    
    // Override res.json to capture response status and time
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log the API usage asynchronously
      logApiUsage(req, res, apiKey, keyData.id, keyData.name, statusCode, responseTime, null)
        .catch(err => console.error('Error logging API usage:', err));
      
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Optional API key authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

module.exports = {
  apiKeyAuth,
  optionalApiKeyAuth
};
