const express = require('express');
const router = express.Router();
const aiService = require('../services/realMLService');
const centralizedAIService = require('../services/centralizedAIService');
const auth = require('../middleware/auth');
const ownerAuth = require('../middleware/ownerAuth');

// Get AI model status
router.get('/status', auth, async (req, res) => {
  try {
    // Initialize centralized AI service if not ready
    if (!centralizedAIService.isReady) {
      await centralizedAIService.initialize();
    }
    
    const modelInfo = centralizedAIService.getModelInfo();
    const legacyModelInfo = aiService.getModelInfo();
    
    // Add coffee log count for debugging
    const CoffeeLog = require('../models/coffeeLog.model');
    const totalLogs = await CoffeeLog.countDocuments();
    const validLogs = await CoffeeLog.countDocuments({
      shotQuality: { $exists: true, $ne: null },
      inWeight: { $exists: true, $ne: null },
      outWeight: { $exists: true, $ne: null },
      extractionTime: { $exists: true, $ne: null }
    });
    
    // Debug: Get sample logs to see actual data structure
    const sampleLogs = await CoffeeLog.find({}).limit(3).select('shotQuality inWeight outWeight extractionTime');
    
    res.json({
      success: true,
      data: {
        ...modelInfo,
        legacyModel: legacyModelInfo,
        totalLogs,
        validLogs,
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
      message: 'Error getting AI status'
    });
  }
});

// Analyze a coffee shot
router.post('/analyze', auth, async (req, res) => {
  try {
    const shotData = req.body;
    console.log('🔍 Received shot data for analysis:', shotData);
    
    if (!shotData.inWeight || !shotData.outWeight || !shotData.extractionTime) {
      console.error('❌ Missing required shot data:', {
        inWeight: shotData.inWeight,
        outWeight: shotData.outWeight,
        extractionTime: shotData.extractionTime
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required shot data (inWeight, outWeight, extractionTime)'
      });
    }
    
    // Initialize centralized AI service if not ready
    if (!centralizedAIService.isReady) {
      console.log('🔄 Initializing centralized AI service...');
      await centralizedAIService.initialize();
    }
    
    console.log('🧠 Starting shot analysis...');
    const analysis = await centralizedAIService.analyzeShot(shotData);
    console.log('✅ Analysis complete:', analysis);
    
    // Validate analysis data before sending to frontend
    // Extract values from nested analysis object if it exists
    const nestedAnalysis = analysis.analysis || {};
    const predictedQuality = analysis.predictedQuality || nestedAnalysis.qualityScore || nestedAnalysis.predictedQuality;
    const currentQuality = analysis.currentQuality || shotData.shotQuality;
    const confidence = analysis.confidence || nestedAnalysis.confidence;
    const recommendations = analysis.recommendations || nestedAnalysis.recommendations || [];
    const modelVersion = analysis.modelVersion || nestedAnalysis.modelVersion || 'unknown';
    
    const validatedAnalysis = {
      ...analysis, // Include all original properties first
      predictedQuality: predictedQuality && !isNaN(predictedQuality) ? predictedQuality : 5,
      currentQuality: currentQuality && !isNaN(currentQuality) ? currentQuality : 5,
      confidence: confidence && !isNaN(confidence) ? confidence : 0.5,
      recommendations: recommendations,
      timestamp: analysis.timestamp || new Date().toISOString(),
      modelVersion: modelVersion
    };
    
    console.log('🔍 Validation results:');
    console.log('  - Original predictedQuality:', analysis.predictedQuality);
    console.log('  - Nested qualityScore:', nestedAnalysis.qualityScore);
    console.log('  - Final predictedQuality:', validatedAnalysis.predictedQuality);
    console.log('  - Original confidence:', analysis.confidence);
    console.log('  - Nested confidence:', nestedAnalysis.confidence);
    console.log('  - Final confidence:', validatedAnalysis.confidence);
    
    res.json({
      success: true,
      data: validatedAnalysis
    });
    
  } catch (error) {
    console.error('❌ Error analyzing shot:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing shot',
      error: error.message
    });
  }
});

// Train the centralized model (admin only)
router.post('/train', ownerAuth, async (req, res) => {
  try {
    if (aiService.isTraining) {
      return res.status(409).json({
        success: false,
        message: 'AI model is already training'
      });
    }
    
    // Start training in background
    aiService.trainWithAllLogs().catch(error => {
      console.error('Background training error:', error);
    });
    
    res.json({
      success: true,
      message: 'AI model training started'
    });
    
  } catch (error) {
    console.error('Error starting AI training:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting AI training'
    });
  }
});

// Get training status (admin only)
router.get('/training-status', ownerAuth, async (req, res) => {
  try {
    const trainingStatus = aiService.getTrainingStatus();
    
    res.json({
      success: true,
      data: {
        isTraining: trainingStatus.isTraining,
        trainingProgress: trainingStatus.trainingProgress,
        currentEpoch: trainingStatus.currentEpoch,
        totalEpochs: trainingStatus.totalEpochs,
        currentLoss: trainingStatus.currentLoss,
        currentValLoss: trainingStatus.currentValLoss,
        message: trainingStatus.message
      }
    });
    
  } catch (error) {
    console.error('Error getting training status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting training status'
    });
  }
});

// Force retrain with all logs (admin only)
router.post('/retrain', ownerAuth, async (req, res) => {
  try {
    if (aiService.isTraining) {
      return res.status(409).json({
        success: false,
        message: 'AI model is already training'
      });
    }
    
    // Start retraining in background
    console.log('🚀 Starting background training...');
    aiService.trainWithAllLogs().then(() => {
      console.log('✅ Background training completed successfully');
    }).catch(error => {
      console.error('❌ Background retraining error:', error);
      console.error('❌ Error details:', error.message);
    });
    
    res.json({
      success: true,
      message: 'AI model retraining started with all available logs'
    });
    
  } catch (error) {
    console.error('Error starting AI retraining:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting AI retraining'
    });
  }
});

module.exports = router;
