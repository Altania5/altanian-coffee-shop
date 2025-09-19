const mongoose = require('mongoose');
require('dotenv').config();
require('./models/aiModel.model');

const AIModel = mongoose.model('AIModel');

async function checkModels() {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Connected to MongoDB');
    
    const models = await AIModel.find({}).sort({ createdAt: -1 });
    console.log(`Found ${models.length} models:`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.modelName}`);
      console.log(`   Status: ${model.status}`);
      console.log(`   Active: ${model.isActive}`);
      console.log(`   Published: ${model.isPublished}`);
      console.log(`   Type: ${model.modelType}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkModels();
