const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to register them
require('./models/bean.model');
require('./models/coffeeLog.model');
require('./models/user.model');
require('./models/aiModel.model');

const AIModel = mongoose.model('AIModel');

async function activateModel() {
  try {
    // Use the same connection method as server.js
    const uri = process.env.ATLAS_URI;
    console.log('ATLAS_URI:', uri ? 'Found (length: ' + uri.length + ')' : 'NOT FOUND');
    
    if (!uri) {
      console.error('❌ ATLAS_URI environment variable not found');
      process.exit(1);
    }
    
    await mongoose.connect(uri);
    console.log('📊 Connected to database');
    
    // Find the latest trained model
    const latestModel = await AIModel.findOne({ status: 'trained' })
      .sort({ createdAt: -1 });
    
    if (!latestModel) {
      console.log('❌ No trained model found');
      process.exit(1);
    }
    
    console.log(`📊 Found trained model: ${latestModel.modelName} (${latestModel._id})`);
    console.log(`📊 Current status: ${latestModel.status}`);
    console.log(`📊 Is active: ${latestModel.isActive}`);
    
    // Deactivate all other models first
    await AIModel.updateMany(
      { _id: { $ne: latestModel._id }, isActive: true },
      { isActive: false, status: 'archived' }
    );
    console.log('🔄 Deactivated all other models');
    
    // Activate the latest model
    await AIModel.findByIdAndUpdate(latestModel._id, {
      status: 'published',
      isActive: true,
      isPublished: true,
      'publishingInfo.publishedAt': new Date(),
      'publishingInfo.deploymentNotes': 'Activated after retraining with 53 coffee logs'
    });
    
    console.log('✅ Model activated successfully!');
    
    // Verify the activation
    const activatedModel = await AIModel.findById(latestModel._id);
    console.log(`📊 New status: ${activatedModel.status}`);
    console.log(`📊 Is active: ${activatedModel.isActive}`);
    console.log(`📊 Is published: ${activatedModel.isPublished}`);
    
    // Show all models and their status
    const allModels = await AIModel.find({}).sort({ createdAt: -1 });
    console.log('\n📊 All Models Status:');
    allModels.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.modelName}`);
      console.log(`     Status: ${model.status}`);
      console.log(`     Active: ${model.isActive}`);
      console.log(`     Published: ${model.isPublished}`);
      console.log(`     Accuracy: ${model.performanceMetrics?.accuracy || 'N/A'}%`);
      console.log('');
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error activating model:', error);
    process.exit(1);
  }
}

activateModel();
