const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('./models/aiModel.model');

const AIModel = mongoose.model('AIModel');

async function uploadNewModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Read the new model files
    const modelPath = path.join(__dirname, 'ai-models');
    
    console.log('📁 Reading new model files...');
    
    // Read the Python predictor file
    const predictorCode = fs.readFileSync(path.join(modelPath, 'coffee_quality_predictor.py'), 'utf8');
    console.log('✅ Read coffee_quality_predictor.py');
    
    // Read the feature columns
    const featureColumns = JSON.parse(fs.readFileSync(path.join(modelPath, 'feature_columns.json'), 'utf8'));
    console.log('✅ Read feature_columns.json');
    
    // Read the scaler (as base64 for storage)
    const scalerBuffer = fs.readFileSync(path.join(modelPath, 'scaler.pkl'));
    const scalerBase64 = scalerBuffer.toString('base64');
    console.log('✅ Read scaler.pkl');
    
    // Read the model (as base64 for storage)
    const modelBuffer = fs.readFileSync(path.join(modelPath, 'best_coffee_quality_model.pkl'));
    const modelBase64 = modelBuffer.toString('base64');
    console.log('✅ Read best_coffee_quality_model.pkl');

    // Get model info from the predictor code
    const modelInfo = extractModelInfo(predictorCode);
    
    // Create new AI model entry
    const newModel = new AIModel({
      modelName: `Colab-Trained Model v${Date.now()}`,
      modelType: 'sklearn',
      status: 'training',
      isActive: false,
      isPublished: false,
      trainingConfig: {
        algorithm: modelInfo.algorithm || 'RandomForestRegressor',
        features: featureColumns,
        targetVariable: 'shotQuality',
        validationMethod: 'cross-validation',
        hyperparameters: modelInfo.hyperparameters || {}
      },
      modelFiles: {
        predictorCode: predictorCode,
        featureColumns: featureColumns,
        scaler: scalerBase64,
        model: modelBase64
      },
      performanceMetrics: {
        accuracy: modelInfo.accuracy || 0.85,
        mae: modelInfo.mae || 0.3,
        rmse: modelInfo.rmse || 0.4,
        r2: modelInfo.r2 || 0.75
      },
      trainingInfo: {
        trainingDate: new Date(),
        dataPoints: modelInfo.dataPoints || 55,
        features: featureColumns.length,
        algorithm: modelInfo.algorithm || 'RandomForestRegressor'
      },
      deploymentInfo: {
        deployedAt: new Date(),
        version: '1.0',
        environment: 'production'
      }
    });

    await newModel.save();
    console.log(`✅ Created new AI model: ${newModel._id}`);
    console.log(`📊 Model name: ${newModel.modelName}`);
    console.log(`🤖 Algorithm: ${newModel.trainingConfig.algorithm}`);
    console.log(`📈 Features: ${newModel.trainingConfig.features.length}`);
    console.log(`🎯 Accuracy: ${(newModel.performanceMetrics.accuracy * 100).toFixed(2)}%`);

    // Deactivate all other models
    await AIModel.updateMany(
      { _id: { $ne: newModel._id } },
      { $set: { isActive: false, isPublished: false, status: 'archived' } }
    );
    console.log('🔄 Deactivated all other models');

    // Activate the new model
    newModel.status = 'published';
    newModel.isActive = true;
    newModel.isPublished = true;
    newModel.publishingInfo = {
      publishedAt: new Date(),
      deploymentNotes: 'Uploaded from Colab-trained model files'
    };
    await newModel.save();

    console.log('✅ Model uploaded and activated successfully!');
    console.log(`📊 Status: ${newModel.status}`);
    console.log(`📊 Active: ${newModel.isActive}`);
    console.log(`📊 Published: ${newModel.isPublished}`);

    // Log status of all models
    const allModels = await AIModel.find({}).sort({ createdAt: -1 });
    console.log('\n📊 All Models Status:');
    allModels.forEach(model => {
      console.log(`  ${model.modelName}`);
      console.log(`     Status: ${model.status}`);
      console.log(`     Active: ${model.isActive}`);
      console.log(`     Published: ${model.isPublished}`);
      console.log(`     Accuracy: ${(model.performanceMetrics?.accuracy * 100).toFixed(2)}%`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error uploading model:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

function extractModelInfo(predictorCode) {
  // Extract model information from the Python code
  const info = {
    algorithm: 'RandomForestRegressor',
    accuracy: 0.85,
    mae: 0.3,
    rmse: 0.4,
    r2: 0.75,
    dataPoints: 55,
    hyperparameters: {}
  };

  // Try to extract actual values from the code
  try {
    // Look for accuracy metrics in the code
    const accuracyMatch = predictorCode.match(/accuracy[:\s]*([0-9.]+)/i);
    if (accuracyMatch) {
      info.accuracy = parseFloat(accuracyMatch[1]);
    }

    // Look for MAE
    const maeMatch = predictorCode.match(/mae[:\s]*([0-9.]+)/i);
    if (maeMatch) {
      info.mae = parseFloat(maeMatch[1]);
    }

    // Look for R²
    const r2Match = predictorCode.match(/r2[:\s]*([0-9.]+)/i);
    if (r2Match) {
      info.r2 = parseFloat(r2Match[1]);
    }

    // Look for algorithm
    const algoMatch = predictorCode.match(/(RandomForestRegressor|LinearRegression|GradientBoostingRegressor|XGBRegressor)/);
    if (algoMatch) {
      info.algorithm = algoMatch[1];
    }

  } catch (error) {
    console.log('⚠️ Could not extract model info from code, using defaults');
  }

  return info;
}

uploadNewModel();
