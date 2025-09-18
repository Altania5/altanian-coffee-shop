const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ownerAuth = require('../middleware/ownerAuth');
const aiModelService = require('../services/aiModelService');
const centralizedAIService = require('../services/centralizedAIService');
const jupyterIntegrationService = require('../services/jupyterIntegrationService');
const AIModel = require('../models/aiModel.model');

// Get all AI models (admin only)
router.get('/', ownerAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const models = await AIModel.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('trainingSession.trainedBy', 'firstName lastName username')
      .populate('publishingInfo.publishedBy', 'firstName lastName username');

    const total = await AIModel.countDocuments(query);

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching AI models'
    });
  }
});

// Get model statistics (admin only)
router.get('/statistics', ownerAuth, async (req, res) => {
  try {
    const [modelStats, trainingDataSummary] = await Promise.all([
      aiModelService.getModelStatistics(),
      aiModelService.getTrainingDataSummary()
    ]);

    res.json({
      success: true,
      data: {
        modelStats,
        trainingDataSummary
      }
    });
  } catch (error) {
    console.error('Error fetching model statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching model statistics'
    });
  }
});

// Get active model (public)
router.get('/active', async (req, res) => {
  try {
    const model = await aiModelService.getActiveModel();
    
    res.json({
      success: true,
      data: {
        id: model._id,
        version: model.version,
        modelType: model.modelType,
        performanceMetrics: model.performanceMetrics,
        architecture: model.architecture,
        featureEngineering: model.featureEngineering,
        publishedAt: model.publishingInfo.publishedAt,
        isActive: model.isActive
      }
    });
  } catch (error) {
    console.error('Error fetching active model:', error);
    res.status(404).json({
      success: false,
      message: 'No active model found'
    });
  }
});

// Get model history (admin only)
router.get('/history', ownerAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = await AIModel.getModelHistory(parseInt(limit));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching model history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching model history'
    });
  }
});

// Start Jupyter notebook training (admin only)
router.post('/train-jupyter', ownerAuth, async (req, res) => {
  try {
    const { 
      epochs = 100,
      batchSize = 32,
      learningRate = 0.001,
      validationSplit = 0.2,
      earlyStopping = true,
      patience = 10
    } = req.body;

    // Check if already training
    const existingTraining = await AIModel.findOne({ status: 'training' });
    if (existingTraining) {
      return res.status(409).json({
        success: false,
        message: 'A model is already training. Please wait for it to complete.'
      });
    }

    // Check Jupyter environment
    const envCheck = await jupyterIntegrationService.checkEnvironment();
    if (!envCheck.available) {
      return res.status(400).json({
        success: false,
        message: `Jupyter environment not available: ${envCheck.error}`
      });
    }

    const trainingConfig = {
      epochs,
      batchSize,
      learningRate,
      validationSplit,
      earlyStopping,
      patience
    };

    const model = await aiModelService.createTrainingSession(trainingConfig, req.user.id);
    
    // Start Jupyter training in background
    jupyterIntegrationService.executeNotebookTraining(model._id, trainingConfig)
      .then(async (results) => {
        console.log('✅ Jupyter training completed successfully');
      })
      .catch(async (error) => {
        console.error('❌ Jupyter training failed:', error);
        const failedModel = await AIModel.findById(model._id);
        if (failedModel) {
          failedModel.status = 'failed';
          await failedModel.save();
        }
      });

    res.json({
      success: true,
      message: 'Jupyter training session started',
      data: {
        modelId: model._id,
        status: 'training',
        config: trainingConfig,
        method: 'jupyter'
      }
    });
  } catch (error) {
    console.error('Error starting Jupyter training:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting Jupyter training session'
    });
  }
});

// Start new training session (admin only)
router.post('/train', ownerAuth, async (req, res) => {
  try {
    const { 
      epochs = 100,
      batchSize = 32,
      learningRate = 0.001,
      validationSplit = 0.2,
      earlyStopping = true,
      patience = 10
    } = req.body;

    // Check if already training
    const existingTraining = await AIModel.findOne({ status: 'training' });
    if (existingTraining) {
      return res.status(409).json({
        success: false,
        message: 'A model is already training. Please wait for it to complete.'
      });
    }

    const trainingConfig = {
      epochs,
      batchSize,
      learningRate,
      validationSplit,
      earlyStopping,
      patience
    };

    const model = await aiModelService.createTrainingSession(trainingConfig, req.user.id);
    
    // Set current model ID for progress tracking
    centralizedAIService.currentModelId = model._id;
    
    // Start training in background
    centralizedAIService.trainWithAllLogs(trainingConfig)
      .then(async (results) => {
        await aiModelService.completeTraining(model._id, {
          performanceMetrics: centralizedAIService.performanceMetrics,
          trainingData: {
            totalLogs: centralizedAIService.coffeeLogCount,
            validLogs: centralizedAIService.coffeeLogCount,
            trainingSamples: Math.floor(centralizedAIService.coffeeLogCount * (1 - validationSplit)),
            validationSamples: Math.floor(centralizedAIService.coffeeLogCount * validationSplit)
          },
          architecture: {
            inputFeatures: 25,
            hiddenLayers: [64, 32, 16],
            outputFeatures: 1,
            activationFunction: 'relu',
            optimizer: 'adam',
            lossFunction: 'mse'
          },
          featureEngineering: {
            features: [
              'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
              'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
              'roastLevel_encoded', 'processMethod_encoded', 'ratio', 'flowRate',
              'daysPastRoast', 'sweetness', 'acidity', 'bitterness', 'body',
              'humidity', 'pressure', 'distributionTechnique_encoded',
              'preInfusionPressure', 'extractionYield', 'timeOfDay'
            ],
            preprocessingSteps: ['normalization', 'encoding', 'feature_scaling']
          }
        });
      })
      .catch(async (error) => {
        console.error('Training failed:', error);
        const failedModel = await AIModel.findById(model._id);
        if (failedModel) {
          failedModel.status = 'failed';
          await failedModel.save();
        }
      });

    res.json({
      success: true,
      message: 'Training session started',
      data: {
        modelId: model._id,
        status: 'training',
        config: trainingConfig
      }
    });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting training session'
    });
  }
});

// Check Jupyter environment (admin only)
router.get('/jupyter-status', ownerAuth, async (req, res) => {
  try {
    const envCheck = await jupyterIntegrationService.checkEnvironment();
    const trainingStatus = jupyterIntegrationService.getTrainingStatus();
    
    res.json({
      success: true,
      data: {
        environment: envCheck,
        training: trainingStatus
      }
    });
  } catch (error) {
    console.error('Error checking Jupyter status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Jupyter status'
    });
  }
});

// Get training status (admin only)
router.get('/training-status', ownerAuth, async (req, res) => {
  try {
    const trainingModel = await AIModel.findOne({ status: 'training' })
      .populate('trainingSession.trainedBy', 'firstName lastName username');

    if (!trainingModel) {
      return res.json({
        success: true,
        data: {
          isTraining: false,
          message: 'No training in progress'
        }
      });
    }

    const centralizedStatus = await centralizedAIService.getModelInfo();

    res.json({
      success: true,
      data: {
        isTraining: true,
        modelId: trainingModel._id,
        progress: centralizedStatus.trainingProgress || 0,
        currentEpoch: trainingModel.trainingHistory.length,
        totalEpochs: trainingModel.trainingConfig.epochs,
        currentLoss: trainingModel.trainingHistory.length > 0 ? 
          trainingModel.trainingHistory[trainingModel.trainingHistory.length - 1].loss : null,
        currentValLoss: trainingModel.trainingHistory.length > 0 ? 
          trainingModel.trainingHistory[trainingModel.trainingHistory.length - 1].valLoss : null,
        startedAt: trainingModel.trainingSession.startedAt,
        trainedBy: trainingModel.trainingSession.trainedBy,
        config: trainingModel.trainingConfig
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

// Publish a model (admin only)
router.post('/:modelId/publish', ownerAuth, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { notes } = req.body;

    const model = await aiModelService.publishModel(modelId, req.user.id, notes);

    res.json({
      success: true,
      message: 'Model published successfully',
      data: {
        modelId: model._id,
        version: model.version,
        publishedAt: model.publishingInfo.publishedAt
      }
    });
  } catch (error) {
    console.error('Error publishing model:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error publishing model'
    });
  }
});

// Rollback to previous model (admin only)
router.post('/:modelId/rollback', ownerAuth, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { rollbackToModelId } = req.body;

    if (!rollbackToModelId) {
      return res.status(400).json({
        success: false,
        message: 'rollbackToModelId is required'
      });
    }

    const model = await aiModelService.rollbackModel(modelId, rollbackToModelId, req.user.id);

    res.json({
      success: true,
      message: 'Model rollback completed',
      data: {
        modelId: model._id,
        version: model.version,
        publishedAt: model.publishingInfo.publishedAt
      }
    });
  } catch (error) {
    console.error('Error rolling back model:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error rolling back model'
    });
  }
});

// Archive a model (admin only)
router.post('/:modelId/archive', ownerAuth, async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = await AIModel.findById(modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    await model.archive();

    res.json({
      success: true,
      message: 'Model archived successfully'
    });
  } catch (error) {
    console.error('Error archiving model:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving model'
    });
  }
});

// Delete a model (admin only)
router.delete('/:modelId', ownerAuth, async (req, res) => {
  try {
    const { modelId } = req.params;
    
    await aiModelService.deleteModel(modelId);

    res.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting model'
    });
  }
});

// Get specific model details (admin only)
router.get('/:modelId', ownerAuth, async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = await AIModel.findById(modelId)
      .populate('trainingSession.trainedBy', 'firstName lastName username')
      .populate('publishingInfo.publishedBy', 'firstName lastName username');

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching model'
    });
  }
});

module.exports = router;
