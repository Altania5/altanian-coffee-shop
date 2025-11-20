/**
 * Dial-In Optimization Routes
 * ===========================
 *
 * Routes for Bayesian optimization-based espresso parameter tuning.
 * Connects to the AI Optimizer service running on user's PC via Cloudflare Tunnel.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiOptimizerClient = require('../services/aiOptimizerClient');
const CoffeeLog = require('../models/coffeeLog.model');
const Bean = require('../models/bean.model');

// ============================================
// GET /api/dial-in/status
// ============================================
// Get AI optimizer service status
router.get('/status', auth, async (req, res) => {
  try {
    const status = aiOptimizerClient.getStatus();

    // Try to get health info
    let health = null;
    try {
      health = await aiOptimizerClient.checkHealth();
    } catch (error) {
      // Service unavailable
    }

    res.json({
      success: true,
      data: {
        ...status,
        health: health || { status: 'unavailable' }
      }
    });
  } catch (error) {
    console.error('Error getting optimizer status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST /api/dial-in/start
// ============================================
// Start a new dial-in session for a bean
router.post('/start', auth, async (req, res) => {
  try {
    const { beanId, method = 'espresso' } = req.body;
    const userId = req.user.id;

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // Get first recommendation from optimizer
    const result = await aiOptimizerClient.getNextRecommendation({
      beanId,
      userId,
      method
    });

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: 'Optimizer service unavailable',
        fallback: true,
        data: result.data
      });
    }

    // Get current optimization status
    const status = await aiOptimizerClient.getOptimizationStatus({
      beanId,
      userId,
      method
    });

    res.json({
      success: true,
      data: {
        bean: {
          id: bean._id,
          name: bean.name,
          roastLevel: bean.roastLevel,
          processMethod: bean.processMethod
        },
        recommendation: result.data,
        status: status.success ? status.data : null,
        message: 'Dial-in session started. Follow the recommended parameters.'
      }
    });

  } catch (error) {
    console.error('Error starting dial-in session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST /api/dial-in/next
// ============================================
// Get next recommendation (optionally report previous shot)
router.post('/next', auth, async (req, res) => {
  try {
    const {
      beanId,
      method = 'espresso',
      lastShot
    } = req.body;
    const userId = req.user.id;

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // If lastShot data is provided, save it as a coffee log
    let savedLog = null;
    if (lastShot && lastShot.score !== undefined) {
      const logData = {
        user: userId,
        bean: beanId,
        shotQuality: lastShot.score,
        grindSize: lastShot.grind,
        inWeight: lastShot.dose,
        extractionTime: lastShot.time,
        method: method,
        dialInMode: true,
        trialNumber: lastShot.trialNumber || 0,
        notes: lastShot.notes || 'Dial-in optimization trial'
      };

      // Add optional fields if provided
      if (lastShot.outWeight) logData.outWeight = lastShot.outWeight;
      if (lastShot.temperature) logData.temperature = lastShot.temperature;
      if (lastShot.pressure) logData.pressure = lastShot.pressure;
      if (lastShot.sweetness) logData.sweetness = lastShot.sweetness;
      if (lastShot.acidity) logData.acidity = lastShot.acidity;
      if (lastShot.bitterness) logData.bitterness = lastShot.bitterness;
      if (lastShot.body) logData.body = lastShot.body;

      const coffeeLog = new CoffeeLog(logData);
      savedLog = await coffeeLog.save();

      console.log(`[Dial-In] Saved coffee log for trial:`, savedLog._id);
    }

    // Get next recommendation from optimizer
    const result = await aiOptimizerClient.getNextRecommendation({
      beanId,
      userId,
      method,
      lastShot: lastShot ? {
        grind: lastShot.grind,
        dose: lastShot.dose,
        time: lastShot.time,
        score: lastShot.score
      } : null
    });

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: 'Optimizer service unavailable',
        fallback: true,
        data: result.data
      });
    }

    res.json({
      success: true,
      data: {
        recommendation: result.data,
        savedLog: savedLog ? {
          id: savedLog._id,
          shotQuality: savedLog.shotQuality,
          trialNumber: savedLog.trialNumber
        } : null,
        message: 'Next recommendation generated'
      }
    });

  } catch (error) {
    console.error('Error getting next recommendation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST /api/dial-in/report
// ============================================
// Report the result of a specific trial
router.post('/report', auth, async (req, res) => {
  try {
    const {
      beanId,
      method = 'espresso',
      trialNumber,
      tasteScore,
      shotData
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (trialNumber === undefined || tasteScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'trialNumber and tasteScore are required'
      });
    }

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // Save coffee log if shot data provided
    let savedLog = null;
    if (shotData) {
      const logData = {
        user: userId,
        bean: beanId,
        shotQuality: tasteScore,
        grindSize: shotData.grind,
        inWeight: shotData.dose,
        extractionTime: shotData.time,
        method: method,
        dialInMode: true,
        trialNumber: trialNumber,
        notes: shotData.notes || `Dial-in trial #${trialNumber}`
      };

      // Add optional fields
      if (shotData.outWeight) logData.outWeight = shotData.outWeight;
      if (shotData.temperature) logData.temperature = shotData.temperature;
      if (shotData.pressure) logData.pressure = shotData.pressure;

      const coffeeLog = new CoffeeLog(logData);
      savedLog = await coffeeLog.save();
    }

    // Report to optimizer
    const result = await aiOptimizerClient.reportTrialResult({
      beanId,
      userId,
      method,
      trialNumber,
      tasteScore
    });

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: 'Failed to report result to optimizer',
        details: result.error
      });
    }

    res.json({
      success: true,
      data: {
        report: result.data,
        savedLog: savedLog ? {
          id: savedLog._id,
          shotQuality: savedLog.shotQuality,
          trialNumber: savedLog.trialNumber
        } : null
      }
    });

  } catch (error) {
    console.error('Error reporting trial result:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET /api/dial-in/status/:beanId
// ============================================
// Get optimization status for a specific bean
router.get('/status/:beanId', auth, async (req, res) => {
  try {
    const { beanId } = req.params;
    const { method = 'espresso' } = req.query;
    const userId = req.user.id;

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // Get optimization status
    const result = await aiOptimizerClient.getOptimizationStatus({
      beanId,
      userId,
      method
    });

    // Get coffee logs for this bean (dial-in mode only)
    const logs = await CoffeeLog.find({
      user: userId,
      bean: beanId,
      dialInMode: true,
      method: method
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('shotQuality grindSize inWeight extractionTime trialNumber createdAt notes');

    res.json({
      success: true,
      data: {
        bean: {
          id: bean._id,
          name: bean.name,
          roastLevel: bean.roastLevel
        },
        optimization: result.success ? result.data : { status: 'unavailable' },
        recentLogs: logs
      }
    });

  } catch (error) {
    console.error('Error getting optimization status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET /api/dial-in/best/:beanId
// ============================================
// Get best parameters found so far
router.get('/best/:beanId', auth, async (req, res) => {
  try {
    const { beanId } = req.params;
    const { method = 'espresso' } = req.query;
    const userId = req.user.id;

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // Get best parameters from optimizer
    const result = await aiOptimizerClient.getBestParameters({
      beanId,
      userId,
      method
    });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'No optimization data found or service unavailable'
      });
    }

    // Get the best coffee log from database
    const bestLog = await CoffeeLog.findOne({
      user: userId,
      bean: beanId,
      dialInMode: true,
      method: method
    })
      .sort({ shotQuality: -1 })
      .select('shotQuality grindSize inWeight extractionTime temperature pressure notes createdAt');

    res.json({
      success: true,
      data: {
        bean: {
          id: bean._id,
          name: bean.name,
          roastLevel: bean.roastLevel
        },
        bestParameters: result.data,
        bestLog: bestLog
      }
    });

  } catch (error) {
    console.error('Error getting best parameters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET /api/dial-in/history/:beanId
// ============================================
// Get dial-in history for a bean
router.get('/history/:beanId', auth, async (req, res) => {
  try {
    const { beanId } = req.params;
    const { method = 'espresso', limit = 20 } = req.query;
    const userId = req.user.id;

    // Validate bean exists
    const bean = await Bean.findById(beanId);
    if (!bean) {
      return res.status(404).json({
        success: false,
        error: 'Coffee bean not found'
      });
    }

    // Get coffee logs for dial-in sessions
    const logs = await CoffeeLog.find({
      user: userId,
      bean: beanId,
      dialInMode: true,
      method: method
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('shotQuality grindSize inWeight outWeight extractionTime temperature pressure trialNumber notes createdAt sweetness acidity bitterness body');

    // Calculate statistics
    const stats = {
      totalTrials: logs.length,
      averageScore: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.shotQuality || 0), 0) / logs.length : 0,
      bestScore: logs.length > 0 ? Math.max(...logs.map(log => log.shotQuality || 0)) : 0,
      worstScore: logs.length > 0 ? Math.min(...logs.map(log => log.shotQuality || 0)) : 0
    };

    res.json({
      success: true,
      data: {
        bean: {
          id: bean._id,
          name: bean.name,
          roastLevel: bean.roastLevel
        },
        logs: logs,
        stats: stats
      }
    });

  } catch (error) {
    console.error('Error getting dial-in history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
