const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Webhook = require('../models/webhook.model');
const webhookService = require('../services/webhookService');

/**
 * @route   GET /webhooks
 * @desc    Get all webhooks
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

    const webhooks = await Webhook.find({ createdBy: req.user.id })
      .select('-secret') // Don't expose secret
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      webhooks,
      count: webhooks.length
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhooks'
    });
  }
});

/**
 * @route   POST /webhooks
 * @desc    Create a new webhook
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

    const { name, url, events, headers, retryConfig } = req.body;
    
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, URL, and events are required'
      });
    }

    // Validate events
    const validEvents = [
      'order.created', 'order.updated', 'order.completed', 'order.cancelled',
      'product.updated', 'inventory.low_stock', 'user.registered',
      'payment.completed', 'payment.failed'
    ];
    
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid events: ${invalidEvents.join(', ')}`,
        validEvents
      });
    }

    // Create webhook
    const webhook = new Webhook({
      name,
      url,
      events,
      headers: headers || {},
      retryConfig: retryConfig || {},
      createdBy: req.user.id
    });

    // Generate secret
    webhook.generateSecret();
    
    await webhook.save();
    
    res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        secret: webhook.secret, // Only returned on creation
        createdAt: webhook.createdAt
      }
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create webhook'
    });
  }
});

/**
 * @route   GET /webhooks/:id
 * @desc    Get specific webhook
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

    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    }).select('-secret');
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    res.json({
      success: true,
      webhook
    });
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook'
    });
  }
});

/**
 * @route   PUT /webhooks/:id
 * @desc    Update webhook
 * @access  Private (Owner)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { name, url, events, headers, retryConfig, isActive } = req.body;
    
    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Update fields
    if (name) webhook.name = name;
    if (url) webhook.url = url;
    if (events) {
      // Validate events
      const validEvents = [
        'order.created', 'order.updated', 'order.completed', 'order.cancelled',
        'product.updated', 'inventory.low_stock', 'user.registered',
        'payment.completed', 'payment.failed'
      ];
      
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid events: ${invalidEvents.join(', ')}`,
          validEvents
        });
      }
      webhook.events = events;
    }
    if (headers) webhook.headers = headers;
    if (retryConfig) webhook.retryConfig = retryConfig;
    if (typeof isActive === 'boolean') webhook.isActive = isActive;
    
    await webhook.save();
    
    res.json({
      success: true,
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        updatedAt: webhook.updatedAt
      }
    });
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update webhook'
    });
  }
});

/**
 * @route   DELETE /webhooks/:id
 * @desc    Delete webhook
 * @access  Private (Owner)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const webhook = await Webhook.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
      webhook: {
        id: webhook._id,
        name: webhook.name
      }
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete webhook'
    });
  }
});

/**
 * @route   POST /webhooks/:id/test
 * @desc    Test webhook delivery
 * @access  Private (Owner)
 */
router.post('/:id/test', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { testData } = req.body;
    
    const result = await webhookService.testWebhook(req.params.id, testData);
    
    res.json({
      success: true,
      message: 'Webhook test completed',
      result
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to test webhook'
    });
  }
});

/**
 * @route   GET /webhooks/:id/logs
 * @desc    Get webhook delivery logs
 * @access  Private (Owner)
 */
router.get('/:id/logs', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const { limit = 50 } = req.query;
    
    const logs = await webhookService.getDeliveryLogs(req.params.id, parseInt(limit));
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook logs'
    });
  }
});

/**
 * @route   GET /webhooks/stats/overview
 * @desc    Get webhook statistics
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

    const stats = await webhookService.getStatistics();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get webhook stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook statistics'
    });
  }
});

/**
 * @route   POST /webhooks/:id/regenerate-secret
 * @desc    Regenerate webhook secret
 * @access  Private (Owner)
 */
router.post('/:id/regenerate-secret', auth, async (req, res) => {
  try {
    // Check owner access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - owner required'
      });
    }

    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    const newSecret = webhook.generateSecret();
    await webhook.save();
    
    res.json({
      success: true,
      message: 'Webhook secret regenerated successfully',
      secret: newSecret
    });
  } catch (error) {
    console.error('Regenerate webhook secret error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to regenerate webhook secret'
    });
  }
});

module.exports = router;



