const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');
const apiKeyScopeService = require('../services/apiKeyScopeService');
const rateLimitService = require('../services/rateLimitService');
const ApiKeyLog = require('../models/apiKeyLog.model');

/**
 * @route   GET /api-keys
 * @desc    Get all API keys (owner only)
 * @access  Private (Owner)
 */
router.get('/', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const keys = await apiKeyService.listKeys();
    
    res.json({
      success: true,
      keys,
      count: keys.length
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch API keys'
    });
  }
});

/**
 * @route   POST /api-keys
 * @desc    Create a new API key (owner only)
 * @access  Private (Owner)
 */
router.post('/', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { name, description, scope, allowedIPs } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Validate scope if provided
    if (scope && !apiKeyScopeService.validateScope(scope)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope: ${scope}`,
        availableScopes: apiKeyScopeService.getAvailableScopes().map(s => s.name)
      });
    }

    const newKey = await apiKeyService.createKey(
      name,
      description || '',
      scope || null,
      allowedIPs || []
    );
    
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      key: newKey
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create API key'
    });
  }
});

/**
 * @route   GET /api-keys/:id
 * @desc    Get specific API key details (owner only)
 * @access  Private (Owner)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const key = await apiKeyService.getKeyById(req.params.id);
    
    res.json({
      success: true,
      key
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'API key not found'
    });
  }
});

/**
 * @route   PUT /api-keys/:id/revoke
 * @desc    Revoke an API key (owner only)
 * @access  Private (Owner)
 */
router.put('/:id/revoke', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const result = await apiKeyService.revokeKey(req.params.id);
    
    res.json({
      success: true,
      message: 'API key revoked successfully',
      result
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to revoke API key'
    });
  }
});

/**
 * @route   PUT /api-keys/:id/regenerate
 * @desc    Regenerate an API key (owner only)
 * @access  Private (Owner)
 */
router.put('/:id/regenerate', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const result = await apiKeyService.regenerateKey(req.params.id);
    
    res.json({
      success: true,
      message: 'API key regenerated successfully',
      result
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to regenerate API key'
    });
  }
});

/**
 * @route   GET /api-keys/stats/overview
 * @desc    Get API key usage statistics overview (owner only)
 * @access  Private (Owner)
 */
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const stats = await apiKeyService.getUsageStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get API key stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch API key statistics'
    });
  }
});

/**
 * @route   GET /api-keys/stats/usage
 * @desc    Get detailed API usage statistics (owner only)
 * @access  Private (Owner)
 */
router.get('/stats/usage', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { apiKeyId, from, to, limit = 10 } = req.query;
    
    const [usageStats, topEndpoints, recentLogs] = await Promise.all([
      ApiKeyLog.getUsageStats(apiKeyId, from, to),
      ApiKeyLog.getTopEndpoints(apiKeyId, parseInt(limit), from, to),
      ApiKeyLog.getRecentLogs(apiKeyId, 20, from, to)
    ]);
    
    res.json({
      success: true,
      stats: {
        overview: usageStats[0] || {
          totalRequests: 0,
          avgResponseTime: 0,
          errorCount: 0,
          successCount: 0,
          successRate: 0
        },
        topEndpoints,
        recentActivity: recentLogs
      }
    });
  } catch (error) {
    console.error('Get API usage stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch usage statistics'
    });
  }
});

/**
 * @route   GET /api-keys/logs
 * @desc    Get API usage logs (owner only)
 * @access  Private (Owner)
 */
router.get('/logs', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { 
      apiKeyId, 
      from, 
      to, 
      limit = 50, 
      page = 1,
      endpoint,
      method,
      statusCode
    } = req.query;
    
    const query = {};
    
    if (apiKeyId) query.apiKeyId = apiKeyId;
    if (endpoint) query.endpoint = new RegExp(endpoint, 'i');
    if (method) query.method = method;
    if (statusCode) query.responseStatus = parseInt(statusCode);
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      ApiKeyLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-requestBody'), // Exclude request body for performance
      ApiKeyLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        apiKeyId: apiKeyId || null,
        from: from || null,
        to: to || null,
        endpoint: endpoint || null,
        method: method || null,
        statusCode: statusCode || null
      }
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch API logs'
    });
  }
});

/**
 * @route   DELETE /api-keys/logs/cleanup
 * @desc    Clean up old API logs (owner only)
 * @access  Private (Owner)
 */
router.delete('/logs/cleanup', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { daysToKeep = 90 } = req.body;
    
    const result = await ApiKeyLog.cleanupOldLogs(parseInt(daysToKeep));
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old log entries`,
      deletedCount: result.deletedCount,
      daysKept: parseInt(daysToKeep)
    });
  } catch (error) {
    console.error('Cleanup API logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cleanup API logs'
    });
  }
});

/**
 * @route   GET /api-keys/scopes
 * @desc    Get available API key scopes
 * @access  Private (Owner)
 */
router.get('/scopes', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const scopes = apiKeyScopeService.getAvailableScopes();
    
    res.json({
      success: true,
      scopes,
      count: scopes.length
    });
  } catch (error) {
    console.error('Get API scopes error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch API scopes'
    });
  }
});

/**
 * @route   PUT /api-keys/:id/scope
 * @desc    Update API key scope
 * @access  Private (Owner)
 */
router.put('/:id/scope', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { id } = req.params;
    const { scope } = req.body;
    
    if (!scope) {
      return res.status(400).json({
        success: false,
        message: 'Scope is required'
      });
    }

    if (!apiKeyScopeService.validateScope(scope)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope: ${scope}`,
        availableScopes: apiKeyScopeService.getAvailableScopes().map(s => s.name)
      });
    }

    const result = await apiKeyService.updateKeyScope(id, scope);
    
    res.json({
      success: true,
      message: 'API key scope updated successfully',
      key: result
    });
  } catch (error) {
    console.error('Update API key scope error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update API key scope'
    });
  }
});

/**
 * @route   PUT /api-keys/:id/ips
 * @desc    Update API key allowed IPs
 * @access  Private (Owner)
 */
router.put('/:id/ips', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { id } = req.params;
    const { allowedIPs } = req.body;
    
    if (!Array.isArray(allowedIPs)) {
      return res.status(400).json({
        success: false,
        message: 'allowedIPs must be an array'
      });
    }

    const result = await apiKeyService.updateKeyIPs(id, allowedIPs);
    
    res.json({
      success: true,
      message: 'API key IPs updated successfully',
      key: result
    });
  } catch (error) {
    console.error('Update API key IPs error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update API key IPs'
    });
  }
});

/**
 * @route   GET /api-keys/:id/rate-limit
 * @desc    Get API key rate limit information
 * @access  Private (Owner)
 */
router.get('/:id/rate-limit', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { id } = req.params;
    const key = await apiKeyService.getKeyById(id);
    
    const rateLimitInfo = rateLimitService.getRateLimitInfo(id, key.scope);
    const bucketStatus = rateLimitService.getBucketStatus(id, key.scope);
    
    res.json({
      success: true,
      key: {
        id: key.id,
        name: key.name,
        scope: key.scope
      },
      rateLimit: rateLimitInfo,
      bucketStatus
    });
  } catch (error) {
    console.error('Get API key rate limit error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get API key rate limit'
    });
  }
});

/**
 * @route   POST /api-keys/:id/reset-rate-limit
 * @desc    Reset API key rate limit bucket
 * @access  Private (Owner)
 */
router.post('/:id/reset-rate-limit', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { id } = req.params;
    const key = await apiKeyService.getKeyById(id);
    
    rateLimitService.resetBucket(id, key.scope);
    
    res.json({
      success: true,
      message: 'Rate limit bucket reset successfully',
      key: {
        id: key.id,
        name: key.name,
        scope: key.scope
      }
    });
  } catch (error) {
    console.error('Reset API key rate limit error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset API key rate limit'
    });
  }
});

/**
 * @route   GET /api-keys/stats/rate-limits
 * @desc    Get rate limit statistics for all API keys
 * @access  Private (Owner)
 */
router.get('/stats/rate-limits', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const keys = await apiKeyService.listKeys();
    const buckets = rateLimitService.getAllBuckets();
    
    const stats = keys.map(key => {
      const bucket = buckets.find(b => b.key.startsWith(key.id));
      const rateLimitInfo = rateLimitService.getRateLimitInfo(key.id, key.scope);
      
      return {
        keyId: key.id,
        keyName: key.name,
        scope: key.scope,
        rateLimit: rateLimitInfo,
        bucketStatus: bucket || null
      };
    });
    
    res.json({
      success: true,
      stats,
      count: stats.length
    });
  } catch (error) {
    console.error('Get rate limit stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rate limit statistics'
    });
  }
});

module.exports = router;
