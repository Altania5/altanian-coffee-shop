const mongoose = require('mongoose');
require('dotenv').config();
require('./models/aiModel.model');

const AIModel = mongoose.model('AIModel');

async function restartAIService() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Find the latest model (should be the one we just trained)
    const latestModel = await AIModel.findOne({ status: 'training' }).sort({ createdAt: -1 });
    
    if (!latestModel) {
      console.log('❌ No trained model found');
      return;
    }

    console.log(`📊 Found trained model: ${latestModel.modelName}`);
    console.log(`📊 Current status: ${latestModel.status}`);

    // Deactivate all other models
    await AIModel.updateMany(
      { _id: { $ne: latestModel._id } },
      { $set: { isActive: false, isPublished: false, status: 'archived' } }
    );
    console.log('🔄 Deactivated all other models');

    // Activate the latest model
    latestModel.status = 'published';
    latestModel.isActive = true;
    latestModel.isPublished = true;
    latestModel.publishingInfo = {
      publishedAt: new Date(),
      deploymentNotes: 'Activated after model file replacement'
    };
    await latestModel.save();

    console.log('✅ Model activated successfully!');
    console.log(`📊 New status: ${latestModel.status}`);
    console.log(`📊 Is active: ${latestModel.isActive}`);
    console.log(`📊 Is published: ${latestModel.isPublished}`);

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

    console.log('\n🚀 Your new model is now active!');
    console.log('💡 The AI Coach will now use your Colab-trained model for predictions.');

  } catch (error) {
    console.error('❌ Error restarting AI service:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

restartAIService();
