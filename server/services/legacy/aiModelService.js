const AIModel = require('../../models/aiModel.model');
const CoffeeLog = require('../../models/coffeeLog.model');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AIModelService {
  constructor() {
    this.modelsDir = path.join(__dirname, '..', 'models', 'ai');
    this.ensureModelsDirectory();
  }

  async ensureModelsDirectory() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating models directory:', error);
    }
  }

  // Create a new model training session
  async createTrainingSession(config, trainedBy) {
    try {
      console.log('🚀 Creating new AI model training session...');
      
      const model = new AIModel({
        trainingConfig: config,
        trainingSession: {
          startedAt: new Date(),
          trainedBy,
          trainingMethod: 'api'
        },
        status: 'training'
      });

      await model.save();
      console.log(`✅ Training session created: ${model._id}`);
      return model;
    } catch (error) {
      console.error('❌ Error creating training session:', error);
      throw error;
    }
  }

  // Update training progress
  async updateTrainingProgress(modelId, progress) {
    try {
      const model = await AIModel.findById(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      // Update training history
      if (progress.epoch !== undefined) {
        model.trainingHistory.push({
          epoch: progress.epoch,
          loss: progress.loss,
          valLoss: progress.valLoss,
          accuracy: progress.accuracy,
          valAccuracy: progress.valAccuracy
        });
      }

      // Update performance metrics
      if (progress.metrics) {
        model.performanceMetrics = {
          ...model.performanceMetrics,
          ...progress.metrics
        };
      }

      await model.save();
      return model;
    } catch (error) {
      console.error('❌ Error updating training progress:', error);
      throw error;
    }
  }

  // Complete training session
  async completeTraining(modelId, results) {
    try {
      console.log(`✅ Completing training for model: ${modelId}`);
      
      const model = await AIModel.findById(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      // Update model with training results
      model.status = 'ready';
      model.trainingSession.completedAt = new Date();
      model.performanceMetrics = results.performanceMetrics;
      model.trainingData = results.trainingData;
      model.architecture = results.architecture;
      model.featureEngineering = results.featureEngineering;

      // Save model files if provided
      if (results.modelFiles) {
        model.modelFiles = await this.saveModelFiles(modelId, results.modelFiles);
      }

      await model.save();
      console.log(`✅ Training completed for model: ${modelId}`);
      return model;
    } catch (error) {
      console.error('❌ Error completing training:', error);
      throw error;
    }
  }

  // Save model files to disk
  async saveModelFiles(modelId, files) {
    try {
      const modelDir = path.join(this.modelsDir, modelId.toString());
      await fs.mkdir(modelDir, { recursive: true });

      const savedFiles = {};

      for (const [fileType, fileData] of Object.entries(files)) {
        const fileName = `${fileType}.${this.getFileExtension(fileType)}`;
        const filePath = path.join(modelDir, fileName);
        
        // Save file data
        if (fileData instanceof Buffer) {
          await fs.writeFile(filePath, fileData);
        } else {
          await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
        }

        // Calculate file size and checksum
        const stats = await fs.stat(filePath);
        const fileBuffer = await fs.readFile(filePath);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

        savedFiles[`${fileType}Path`] = filePath;
        savedFiles.size = (savedFiles.size || 0) + stats.size;
        savedFiles.checksum = checksum;
      }

      return savedFiles;
    } catch (error) {
      console.error('❌ Error saving model files:', error);
      throw error;
    }
  }

  // Get file extension based on file type
  getFileExtension(fileType) {
    const extensions = {
      model: 'h5',
      scaler: 'pkl',
      features: 'json',
      metadata: 'json'
    };
    return extensions[fileType] || 'json';
  }

  // Publish a model (make it active)
  async publishModel(modelId, publishedBy, notes) {
    try {
      console.log(`📢 Publishing model: ${modelId}`);
      
      const model = await AIModel.findById(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'ready') {
        throw new Error('Model must be ready before publishing');
      }

      // Archive current active model
      await this.archiveActiveModel();

      // Publish new model
      await model.publish(publishedBy, notes);
      
      console.log(`✅ Model published: ${modelId}`);
      return model;
    } catch (error) {
      console.error('❌ Error publishing model:', error);
      throw error;
    }
  }

  // Archive the currently active model
  async archiveActiveModel() {
    try {
      const activeModel = await AIModel.getActiveModel();
      if (activeModel) {
        await activeModel.archive();
        console.log(`📦 Archived active model: ${activeModel._id}`);
      }
    } catch (error) {
      console.error('❌ Error archiving active model:', error);
    }
  }

  // Rollback to a previous model
  async rollbackModel(modelId, rollbackToModelId, publishedBy) {
    try {
      console.log(`🔄 Rolling back to model: ${rollbackToModelId}`);
      
      const currentModel = await AIModel.findById(modelId);
      const rollbackModel = await AIModel.findById(rollbackToModelId);
      
      if (!currentModel || !rollbackModel) {
        throw new Error('One or both models not found');
      }

      // Archive current model
      await currentModel.rollback(rollbackToModelId);

      // Publish rollback model
      await rollbackModel.publish(publishedBy, `Rollback from ${currentModel.version}`);
      
      console.log(`✅ Rollback completed to model: ${rollbackToModelId}`);
      return rollbackModel;
    } catch (error) {
      console.error('❌ Error rolling back model:', error);
      throw error;
    }
  }

  // Get active model for predictions
  async getActiveModel() {
    try {
      const model = await AIModel.getActiveModel();
      if (!model) {
        throw new Error('No active model found');
      }
      return model;
    } catch (error) {
      console.error('❌ Error getting active model:', error);
      throw error;
    }
  }

  // Get model statistics
  async getModelStatistics() {
    try {
      const stats = await AIModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgAccuracy: { $avg: '$performanceMetrics.accuracy' },
            avgMAE: { $avg: '$performanceMetrics.mae' }
          }
        }
      ]);

      const totalModels = await AIModel.countDocuments();
      const activeModel = await AIModel.getActiveModel();
      const latestModel = await AIModel.getLatestModel();

      return {
        totalModels,
        activeModel: activeModel ? {
          id: activeModel._id,
          version: activeModel.version,
          accuracy: activeModel.performanceMetrics.accuracy,
          publishedAt: activeModel.publishingInfo.publishedAt
        } : null,
        latestModel: latestModel ? {
          id: latestModel._id,
          version: latestModel.version,
          status: latestModel.status
        } : null,
        statusBreakdown: stats
      };
    } catch (error) {
      console.error('❌ Error getting model statistics:', error);
      throw error;
    }
  }

  // Get training data summary
  async getTrainingDataSummary() {
    try {
      const totalLogs = await CoffeeLog.countDocuments();
      const validLogs = await CoffeeLog.countDocuments({
        shotQuality: { $gte: 1, $lte: 10 },
        inWeight: { $exists: true, $ne: null },
        outWeight: { $exists: true, $ne: null },
        extractionTime: { $exists: true, $ne: null }
      });

      const qualityDistribution = await CoffeeLog.aggregate([
        {
          $group: {
            _id: '$shotQuality',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const recentLogs = await CoffeeLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('shotQuality inWeight outWeight extractionTime createdAt');

      return {
        totalLogs,
        validLogs,
        invalidLogs: totalLogs - validLogs,
        qualityDistribution,
        recentLogs,
        dataQuality: validLogs > 0 ? (validLogs / totalLogs) : 0
      };
    } catch (error) {
      console.error('❌ Error getting training data summary:', error);
      throw error;
    }
  }

  // Delete a model (admin only)
  async deleteModel(modelId) {
    try {
      const model = await AIModel.findById(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.isActive) {
        throw new Error('Cannot delete active model');
      }

      // Delete model files
      const modelDir = path.join(this.modelsDir, modelId.toString());
      try {
        await fs.rmdir(modelDir, { recursive: true });
      } catch (error) {
        console.warn('Could not delete model directory:', error.message);
      }

      // Delete model record
      await AIModel.findByIdAndDelete(modelId);
      
      console.log(`🗑️ Deleted model: ${modelId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting model:', error);
      throw error;
    }
  }
}

module.exports = new AIModelService();
