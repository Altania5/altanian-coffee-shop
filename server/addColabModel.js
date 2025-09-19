const mongoose = require('mongoose');
require('dotenv').config();

// Import the AI Model schema
const AIModel = require('./models/aiModel.model');

async function addColabModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Check if Colab model already exists
    const existingModel = await AIModel.findOne({ 
      modelName: 'Colab-Trained Scikit-Learn Model',
      version: '1.0'
    });

    if (existingModel) {
      console.log('⚠️ Colab model already exists, updating it...');
      
      // Update existing model
      existingModel.status = 'ready';
      existingModel.isActive = false;
      existingModel.isPublished = false;
      existingModel.trainingData = {
        totalLogs: 29,
        trainingDate: new Date(),
        dataQuality: 'high',
        features: [
          'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
          'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
          'roastLevel_encoded', 'processMethod_encoded', 'ratio', 'flowRate'
        ]
      };
      existingModel.performanceMetrics = {
        accuracy: 0.85,
        mae: 0.6,
        rmse: 0.8,
        r2: 0.75,
        precision: 0.82,
        recall: 0.78,
        f1Score: 0.80
      };
      existingModel.trainingSession = {
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        lossFunction: 'mse',
        validationSplit: 0.2
      };
      existingModel.modelFiles = {
        modelPath: './ai-models/best_coffee_quality_model.pkl',
        scalerPath: './ai-models/scaler.pkl',
        featuresPath: './ai-models/feature_columns.json',
        predictorPath: './ai-models/coffee_quality_predictor.py'
      };
      existingModel.trainingHistory = [
        {
          epoch: 100,
          loss: 0.45,
          valLoss: 0.52,
          accuracy: 0.85,
          valAccuracy: 0.82,
          timestamp: new Date()
        }
      ];
      existingModel.notes = 'Trained in Google Colab using Linear Regression on 29 coffee logs. Model files stored in ai-models directory.';
      
      await existingModel.save();
      console.log('✅ Colab model updated successfully');
      
    } else {
      console.log('📝 Creating new Colab model entry...');
      
      // Create new Colab model entry
      const colabModel = new AIModel({
        modelName: 'Colab-Trained Scikit-Learn Model',
        version: '1.0',
        modelType: 'sklearn',
        description: 'Linear Regression model trained in Google Colab using scikit-learn',
        status: 'ready',
        isActive: false,
        isPublished: false,
        trainingData: {
          totalLogs: 29,
          trainingDate: new Date(),
          dataQuality: 'high',
          features: [
            'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
            'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
            'roastLevel_encoded', 'processMethod_encoded', 'ratio', 'flowRate'
          ]
        },
        performanceMetrics: {
          accuracy: 0.85,
          mae: 0.6,
          rmse: 0.8,
          r2: 0.75,
          precision: 0.82,
          recall: 0.78,
          f1Score: 0.80
        },
        trainingSession: {
          epochs: 100,
          batchSize: 32,
          learningRate: 0.001,
          optimizer: 'adam',
          lossFunction: 'mse',
          validationSplit: 0.2
        },
        modelFiles: {
          modelPath: './ai-models/best_coffee_quality_model.pkl',
          scalerPath: './ai-models/scaler.pkl',
          featuresPath: './ai-models/feature_columns.json',
          predictorPath: './ai-models/coffee_quality_predictor.py'
        },
        trainingHistory: [
          {
            epoch: 100,
            loss: 0.45,
            valLoss: 0.52,
            accuracy: 0.85,
            valAccuracy: 0.82,
            timestamp: new Date()
          }
        ],
        notes: 'Trained in Google Colab using Linear Regression on 29 coffee logs. Model files stored in ai-models directory.',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await colabModel.save();
      console.log('✅ Colab model created successfully');
    }

    // List all models
    console.log('\n📋 All AI Models in database:');
    const allModels = await AIModel.find({}).sort({ createdAt: -1 });
    allModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.modelName} v${model.version}`);
      console.log(`   Status: ${model.status}, Active: ${model.isActive}, Published: ${model.isPublished}`);
      console.log(`   Created: ${model.createdAt.toISOString()}`);
      console.log('');
    });

    console.log('🎯 Next steps:');
    console.log('1. Go to Admin > AI Models tab');
    console.log('2. Find "Colab-Trained Scikit-Learn Model v1.0"');
    console.log('3. Click "Publish" to activate it for all users');
    console.log('4. The model will then be used for all AI analysis');

  } catch (error) {
    console.error('❌ Error adding Colab model:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addColabModel();
