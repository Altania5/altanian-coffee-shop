/**
 * AI Routes - Refactored for Python ML Service
 * ==============================================
 *
 * Routes for espresso quality prediction and AI analysis.
 * Now uses the Python ML Service (Flask API) via mlServiceClient.
 */

const express = require('express');
const router = express.Router();
const mlServiceClient = require('../services/mlServiceClient');
const auth = require('../middleware/auth');
const ownerAuth = require('../middleware/ownerAuth');
const CoffeeLog = require('../models/coffeeLog.model');

// ============================================
// GET /api/ai/status
// ============================================
// Get AI service status and model information
router.get('/status', auth, async (req, res) => {
  try {
    // Get ML service health
    const health = await mlServiceClient.checkHealth();

    // Get model info
    let modelInfo = null;
    try {
      modelInfo = await mlServiceClient.getModelInfo();
    } catch (error) {
      console.warn('Could not get model info:', error.message);
    }

    // Get coffee log statistics
    const totalLogs = await CoffeeLog.countDocuments();
    const validLogs = await CoffeeLog.countDocuments({
      shotQuality: { $exists: true, $ne: null },
      inWeight: { $exists: true, $ne: null },
      outWeight: { $exists: true, $ne: null },
      extractionTime: { $exists: true, $ne: null }
    });

    // Get sample logs
    const sampleLogs = await CoffeeLog.find({})
      .limit(3)
      .select('shotQuality inWeight outWeight extractionTime grindSize temperature')
      .lean();

    res.json({
      success: true,
      data: {
        mlService: {
          status: health.status,
          isHealthy: health.model_loaded,
          models: health.models || [],
          numFeatures: health.num_features || 0
        },
        modelInfo: modelInfo || {},
        dataStats: {
          totalLogs,
          validLogs,
          readyForTraining: validLogs >= 30
        },
        sampleLogs: sampleLogs.map(log => ({
          id: log._id,
          shotQuality: log.shotQuality,
          inWeight: log.inWeight,
          outWeight: log.outWeight,
          extractionTime: log.extractionTime
        }))
      }
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting AI status',
      error: error.message
    });
  }
});

// ============================================
// POST /api/ai/analyze
// ============================================
// Analyze a coffee shot and get predictions
router.post('/analyze', auth, async (req, res) => {
  try {
    const shotData = req.body;
    console.log('🔍 Received shot data for analysis');

    // Validate required fields
    if (!shotData.inWeight || !shotData.outWeight || !shotData.extractionTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required shot data (inWeight, outWeight, extractionTime)'
      });
    }

    // Prepare parameters for ML service
    const parameters = {
      grindSize: shotData.grindSize || 12,
      extractionTime: shotData.extractionTime,
      temperature: shotData.temperature || 93,
      inWeight: shotData.inWeight,
      outWeight: shotData.outWeight,
      pressure: shotData.pressure || 9,
      roastLevel: shotData.roastLevel || 'medium',
      processMethod: shotData.processMethod || 'washed',
      daysPastRoast: shotData.daysPastRoast || 14,
      usedWDT: shotData.usedWDT || false,
      usedPuckScreen: shotData.usedPuckScreen || false,
      usedPreInfusion: shotData.usedPreInfusion || false,
      preInfusionTime: shotData.preInfusionTime || 0,
      preInfusionPressure: shotData.preInfusionPressure || 0,
      machine: shotData.machine || 'Meraki',
      beanUsageCount: shotData.beanUsageCount || 1,
      humidity: shotData.humidity || 50
    };

    console.log('🧠 Requesting prediction from ML service...');

    // Get predictions from ML service
    const result = await mlServiceClient.predict(parameters);

    console.log('✅ Prediction received:', result.predictions);

    // Format response for frontend
    const analysis = {
      success: true,
      predictedQuality: result.predictions.shotQuality,
      currentQuality: shotData.shotQuality || result.predictions.shotQuality,
      confidence: result.confidence.overall,
      predictions: result.predictions,
      tasteProfile: {
        sweetness: result.predictions.sweetness,
        acidity: result.predictions.acidity,
        bitterness: result.predictions.bitterness,
        body: result.predictions.body
      },
      recommendations: generateRecommendations(parameters, result.predictions),
      topFeatures: result.top_features || {},
      modelVersion: '2.0-xgboost',
      source: result.metadata?.source || 'ml-service',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error analyzing shot:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing shot',
      error: error.message
    });
  }
});

// ============================================
// POST /api/ai/explain
// ============================================
// Get SHAP explanation for a prediction
router.post('/explain', auth, async (req, res) => {
  try {
    const { parameters, target } = req.body;

    if (!parameters) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters'
      });
    }

    console.log('📊 Requesting SHAP explanation...');

    const explanation = await mlServiceClient.explain(parameters, target || 'shotQuality');

    res.json({
      success: true,
      explanation
    });

  } catch (error) {
    console.error('Error getting explanation:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting explanation',
      error: error.message
    });
  }
});

// ============================================
// GET /api/ai/feature-importance/:target
// ============================================
// Get feature importance rankings
router.get('/feature-importance/:target?', auth, async (req, res) => {
  try {
    const target = req.params.target || 'shotQuality';
    const topN = parseInt(req.query.top_n) || 15;

    console.log(`📈 Getting feature importance for ${target}`);

    const importance = await mlServiceClient.getFeatureImportance(target, topN);

    res.json({
      success: true,
      data: importance
    });

  } catch (error) {
    console.error('Error getting feature importance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting feature importance',
      error: error.message
    });
  }
});

// ============================================
// POST /api/ai/retrain
// ============================================
// Trigger model retraining (owner only)
router.post('/retrain', auth, ownerAuth, async (req, res) => {
  try {
    console.log('🔄 Starting model retraining...');

    // Get training data path from request or use default
    const dataPath = req.body.dataPath || '/training_data/training_data_cleaned.json';

    // Trigger retraining
    const result = await mlServiceClient.train(dataPath);

    console.log('✅ Retraining complete:', result.metrics);

    res.json({
      success: true,
      message: 'Model retraining completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error retraining model:', error);
    res.status(500).json({
      success: false,
      message: 'Error retraining model',
      error: error.message
    });
  }
});

// ============================================
// POST /api/ai/log-with-prediction
// ============================================
// Log a shot and get prediction + comparison
router.post('/log-with-prediction', auth, async (req, res) => {
  try {
    const { parameters, actualResults } = req.body;

    if (!parameters || !actualResults) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters or actualResults'
      });
    }

    console.log('💾 Logging shot with prediction...');

    // 1. Get AI prediction
    const prediction = await mlServiceClient.predict(parameters);

    // 2. Save log to database
    const log = new CoffeeLog({
      user: req.user.id,
      bean: parameters.bean || parameters.beanId,
      machine: parameters.machine || 'Meraki',
      grindSize: parameters.grindSize,
      extractionTime: parameters.extractionTime,
      temperature: parameters.temperature,
      inWeight: parameters.inWeight,
      outWeight: parameters.outWeight,
      pressure: parameters.pressure,
      roastLevel: parameters.roastLevel,
      processMethod: parameters.processMethod,
      daysPastRoast: parameters.daysPastRoast,
      usedWDT: parameters.usedWDT,
      usedPuckScreen: parameters.usedPuckScreen,
      usedPreInfusion: parameters.usedPreInfusion,
      preInfusionTime: parameters.preInfusionTime,
      preInfusionPressure: parameters.preInfusionPressure,
      shotQuality: actualResults.shotQuality,
      tasteProfile: actualResults.tasteProfile,
      tasteMetExpectations: actualResults.tasteMetExpectations || true,
      aiRecommendationFollowed: {
        followed: parameters.followedRecommendation || false
      }
    });

    await log.save();

    // 3. Compare prediction vs actual
    const comparison = {
      predicted: prediction.predictions,
      actual: {
        shotQuality: actualResults.shotQuality,
        sweetness: actualResults.tasteProfile?.sweetness,
        acidity: actualResults.tasteProfile?.acidity,
        bitterness: actualResults.tasteProfile?.bitterness,
        body: actualResults.tasteProfile?.body
      },
      differences: {
        shotQuality: Math.abs(prediction.predictions.shotQuality - actualResults.shotQuality)
      },
      modelAccuracy: calculateAccuracy(prediction.predictions, actualResults)
    };

    res.json({
      success: true,
      logId: log._id,
      prediction: prediction.predictions,
      comparison
    });

  } catch (error) {
    console.error('Error logging with prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging shot',
      error: error.message
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate recommendations based on predictions
 */
function generateRecommendations(parameters, predictions) {
  const recommendations = [];

  // Quality-based recommendations
  if (predictions.shotQuality < 6) {
    recommendations.push({
      priority: 'high',
      type: 'parameter',
      message: 'Quality below target. Consider adjusting grind size or extraction time.',
      expectedImprovement: 1.5
    });
  }

  // Flow rate recommendations
  const flowRate = parameters.outWeight / parameters.extractionTime;
  if (flowRate < 1.0) {
    recommendations.push({
      priority: 'medium',
      type: 'technique',
      message: 'Slow flow detected. Try coarser grind or higher temperature.',
      expectedImprovement: 1.0
    });
  } else if (flowRate > 1.5) {
    recommendations.push({
      priority: 'medium',
      type: 'technique',
      message: 'Fast flow detected. Try finer grind or lower temperature.',
      expectedImprovement: 1.0
    });
  }

  // Technique recommendations
  if (!parameters.usedWDT) {
    recommendations.push({
      priority: 'medium',
      type: 'technique',
      message: 'WDT (Weiss Distribution Technique) could improve consistency.',
      expectedImprovement: 0.8
    });
  }

  // Bean freshness
  if (parameters.daysPastRoast > 21) {
    recommendations.push({
      priority: 'low',
      type: 'ingredient',
      message: 'Beans are getting old. Fresher beans may improve taste.',
      expectedImprovement: 0.5
    });
  }

  return recommendations;
}

/**
 * Calculate model accuracy
 */
function calculateAccuracy(predicted, actual) {
  const targets = ['shotQuality', 'sweetness', 'acidity', 'bitterness', 'body'];
  let totalError = 0;
  let count = 0;

  targets.forEach(target => {
    const predictedVal = predicted[target];
    const actualVal = target === 'shotQuality'
      ? actual[target]
      : actual.tasteProfile?.[target];

    if (predictedVal != null && actualVal != null) {
      totalError += Math.abs(predictedVal - actualVal);
      count++;
    }
  });

  const avgError = count > 0 ? totalError / count : 0;
  const accuracy = Math.max(0, 1 - (avgError / 10));

  return {
    averageError: avgError.toFixed(2),
    accuracy: accuracy.toFixed(2),
    targetsEvaluated: count
  };
}

module.exports = router;
