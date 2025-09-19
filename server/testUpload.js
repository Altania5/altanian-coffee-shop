console.log('🚀 Starting model upload test...');

const mongoose = require('mongoose');
require('dotenv').config();

async function testUpload() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('📁 Checking model files...');
    const fs = require('fs');
    const path = require('path');
    
    const modelPath = path.join(__dirname, 'ai-models');
    console.log('Model path:', modelPath);
    
    // Check if files exist
    const files = ['coffee_quality_predictor.py', 'feature_columns.json', 'scaler.pkl', 'best_coffee_quality_model.pkl'];
    
    for (const file of files) {
      const filePath = path.join(modelPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${file}`);
      } else {
        console.log(`❌ Missing: ${file}`);
      }
    }
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUpload();
