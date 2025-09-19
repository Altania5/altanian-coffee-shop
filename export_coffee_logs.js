const mongoose = require('mongoose');
require('dotenv').config();

// Coffee Log Schema (matching your existing model)
const coffeeLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  beanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bean', required: true },
  beanName: { type: String, required: true },
  roastLevel: { type: String, required: true },
  origin: { type: String, required: true },
  grindSize: { type: Number, required: true },
  dose: { type: Number, required: true },
  yield: { type: Number, required: true },
  extractionTime: { type: Number, required: true },
  temperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  notes: { type: String },
  rating: { type: Number, min: 1, max: 10 },
  shotQuality: { type: String, enum: ['excellent', 'good', 'average', 'poor'], default: 'average' },
  tasteNotes: { type: String },
  aroma: { type: String },
  body: { type: String },
  acidity: { type: String },
  sweetness: { type: String },
  bitterness: { type: String },
  aftertaste: { type: String },
  crema: { type: String },
  color: { type: String },
  texture: { type: String },
  balance: { type: String },
  complexity: { type: String },
  finish: { type: String },
  overallExperience: { type: String },
  brewingMethod: { type: String, default: 'espresso' },
  machineType: { type: String },
  waterQuality: { type: String },
  preInfusion: { type: Boolean, default: false },
  preInfusionTime: { type: Number },
  tampingPressure: { type: Number },
  distributionMethod: { type: String },
  puckScreen: { type: Boolean, default: false },
  portafilterType: { type: String },
  basketSize: { type: Number },
  basketType: { type: String },
  groupheadTemperature: { type: Number },
  ambientTemperature: { type: Number },
  humidity: { type: Number },
  altitude: { type: Number },
  roastDate: { type: Date },
  brewDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CoffeeLog = mongoose.model('CoffeeLog', coffeeLogSchema);

// Function to convert shot quality string to numeric score
function qualityToScore(quality) {
  const qualityMap = {
    'excellent': 9,
    'good': 7,
    'average': 5,
    'poor': 3
  };
  return qualityMap[quality] || 5;
}

// Function to normalize roast level
function normalizeRoastLevel(roastLevel) {
  const roastMap = {
    'light': 'light',
    'medium-light': 'light',
    'medium': 'medium',
    'medium-dark': 'dark',
    'dark': 'dark',
    'very dark': 'dark'
  };
  return roastMap[roastLevel?.toLowerCase()] || 'medium';
}

// Function to normalize process method
function normalizeProcessMethod(origin) {
  // Map common origins to process methods
  const processMap = {
    'ethiopia': 'natural',
    'colombia': 'washed',
    'brazil': 'natural',
    'guatemala': 'washed',
    'kenya': 'washed',
    'costa rica': 'washed',
    'peru': 'washed',
    'mexico': 'washed',
    'honduras': 'washed',
    'nicaragua': 'washed',
    'panama': 'washed',
    'jamaica': 'washed',
    'dominican republic': 'washed',
    'haiti': 'washed',
    'venezuela': 'washed',
    'ecuador': 'washed',
    'bolivia': 'washed',
    'paraguay': 'washed',
    'uruguay': 'washed',
    'argentina': 'washed',
    'chile': 'washed',
    'indonesia': 'natural',
    'vietnam': 'natural',
    'thailand': 'natural',
    'philippines': 'natural',
    'malaysia': 'natural',
    'singapore': 'natural',
    'taiwan': 'natural',
    'china': 'natural',
    'japan': 'natural',
    'south korea': 'natural',
    'india': 'natural',
    'sri lanka': 'natural',
    'bangladesh': 'natural',
    'pakistan': 'natural',
    'afghanistan': 'natural',
    'iran': 'natural',
    'iraq': 'natural',
    'syria': 'natural',
    'lebanon': 'natural',
    'jordan': 'natural',
    'israel': 'natural',
    'palestine': 'natural',
    'saudi arabia': 'natural',
    'yemen': 'natural',
    'oman': 'natural',
    'uae': 'natural',
    'qatar': 'natural',
    'bahrain': 'natural',
    'kuwait': 'natural',
    'iraq': 'natural',
    'iran': 'natural',
    'afghanistan': 'natural',
    'pakistan': 'natural',
    'india': 'natural',
    'bangladesh': 'natural',
    'sri lanka': 'natural',
    'maldives': 'natural',
    'myanmar': 'natural',
    'thailand': 'natural',
    'laos': 'natural',
    'cambodia': 'natural',
    'vietnam': 'natural',
    'malaysia': 'natural',
    'singapore': 'natural',
    'brunei': 'natural',
    'indonesia': 'natural',
    'philippines': 'natural',
    'taiwan': 'natural',
    'china': 'natural',
    'mongolia': 'natural',
    'north korea': 'natural',
    'south korea': 'natural',
    'japan': 'natural',
    'russia': 'natural',
    'kazakhstan': 'natural',
    'uzbekistan': 'natural',
    'turkmenistan': 'natural',
    'tajikistan': 'natural',
    'kyrgyzstan': 'natural',
    'afghanistan': 'natural',
    'pakistan': 'natural',
    'india': 'natural',
    'bangladesh': 'natural',
    'sri lanka': 'natural',
    'maldives': 'natural',
    'myanmar': 'natural',
    'thailand': 'natural',
    'laos': 'natural',
    'cambodia': 'natural',
    'vietnam': 'natural',
    'malaysia': 'natural',
    'singapore': 'natural',
    'brunei': 'natural',
    'indonesia': 'natural',
    'philippines': 'natural',
    'taiwan': 'natural',
    'china': 'natural',
    'mongolia': 'natural',
    'north korea': 'natural',
    'south korea': 'natural',
    'japan': 'natural',
    'russia': 'natural',
    'kazakhstan': 'natural',
    'uzbekistan': 'natural',
    'turkmenistan': 'natural',
    'tajikistan': 'natural',
    'kyrgyzstan': 'natural'
  };
  
  // Simple mapping based on common patterns
  if (!origin) return 'washed';
  
  const originLower = origin.toLowerCase();
  
  // Natural process origins (typically African, some Central/South American)
  if (originLower.includes('ethiopia') || originLower.includes('brazil') || 
      originLower.includes('indonesia') || originLower.includes('vietnam') ||
      originLower.includes('thailand') || originLower.includes('philippines') ||
      originLower.includes('malaysia') || originLower.includes('singapore') ||
      originLower.includes('taiwan') || originLower.includes('china') ||
      originLower.includes('japan') || originLower.includes('south korea') ||
      originLower.includes('india') || originLower.includes('sri lanka') ||
      originLower.includes('bangladesh') || originLower.includes('pakistan') ||
      originLower.includes('afghanistan') || originLower.includes('iran') ||
      originLower.includes('iraq') || originLower.includes('syria') ||
      originLower.includes('lebanon') || originLower.includes('jordan') ||
      originLower.includes('israel') || originLower.includes('palestine') ||
      originLower.includes('saudi arabia') || originLower.includes('yemen') ||
      originLower.includes('oman') || originLower.includes('uae') ||
      originLower.includes('qatar') || originLower.includes('bahrain') ||
      originLower.includes('kuwait') || originLower.includes('afghanistan') ||
      originLower.includes('pakistan') || originLower.includes('india') ||
      originLower.includes('bangladesh') || originLower.includes('sri lanka') ||
      originLower.includes('maldives') || originLower.includes('myanmar') ||
      originLower.includes('thailand') || originLower.includes('laos') ||
      originLower.includes('cambodia') || originLower.includes('vietnam') ||
      originLower.includes('malaysia') || originLower.includes('singapore') ||
      originLower.includes('brunei') || originLower.includes('indonesia') ||
      originLower.includes('philippines') || originLower.includes('taiwan') ||
      originLower.includes('china') || originLower.includes('mongolia') ||
      originLower.includes('north korea') || originLower.includes('south korea') ||
      originLower.includes('japan') || originLower.includes('russia') ||
      originLower.includes('kazakhstan') || originLower.includes('uzbekistan') ||
      originLower.includes('turkmenistan') || originLower.includes('tajikistan') ||
      originLower.includes('kyrgyzstan')) {
    return 'natural';
  }
  
  // Washed process origins (typically Central/South American, some African)
  if (originLower.includes('colombia') || originLower.includes('guatemala') ||
      originLower.includes('kenya') || originLower.includes('costa rica') ||
      originLower.includes('peru') || originLower.includes('mexico') ||
      originLower.includes('honduras') || originLower.includes('nicaragua') ||
      originLower.includes('panama') || originLower.includes('jamaica') ||
      originLower.includes('dominican republic') || originLower.includes('haiti') ||
      originLower.includes('venezuela') || originLower.includes('ecuador') ||
      originLower.includes('bolivia') || originLower.includes('paraguay') ||
      originLower.includes('uruguay') || originLower.includes('argentina') ||
      originLower.includes('chile')) {
    return 'washed';
  }
  
  // Default to washed for unknown origins
  return 'washed';
}

async function exportCoffeeLogs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📊 Fetching all coffee logs...');
    const coffeeLogs = await CoffeeLog.find({})
      .populate('userId', 'username email')
      .populate('beanId', 'name roastLevel origin')
      .lean(); // Use lean() for better performance

    console.log(`📈 Found ${coffeeLogs.length} coffee logs`);

    // Convert to training-friendly format matching Jupyter notebook structure
    const trainingData = coffeeLogs.map(log => {
      // Calculate derived features (matching notebook structure)
      const inWeight = log.dose || 18; // dose = input weight
      const outWeight = log.yield || 36; // yield = output weight
      const ratio = outWeight / inWeight;
      const flowRate = outWeight / (log.extractionTime || 30);
      
      return {
        // Core features (exactly matching notebook)
        grindSize: log.grindSize || 15,
        extractionTime: log.extractionTime || 30,
        temperature: log.temperature || 93,
        inWeight: inWeight,
        outWeight: outWeight,
        usedPuckScreen: log.puckScreen ? 1 : 0,
        usedWDT: log.distributionMethod === 'WDT' ? 1 : 0,
        usedPreInfusion: log.preInfusion ? 1 : 0,
        preInfusionTime: log.preInfusionTime || 0,
        roastLevel: normalizeRoastLevel(log.roastLevel),
        processMethod: normalizeProcessMethod(log.origin),
        
        // Derived features (calculated)
        ratio: ratio,
        flowRate: flowRate,
        
        // Target variable (numeric score)
        shotQuality: qualityToScore(log.shotQuality),
        
        // Additional features for enhanced training
        pressure: log.pressure || 9,
        rating: log.rating || 5,
        ambientTemperature: log.ambientTemperature || 20,
        humidity: log.humidity || 50,
        
        // Metadata
        userId: log.userId?._id || log.userId,
        beanId: log.beanId?._id || log.beanId,
        beanName: log.beanName || 'Unknown',
        origin: log.origin || 'Unknown',
        brewDate: log.brewDate || log.createdAt,
        createdAt: log.createdAt,
        
        // Additional data for analysis
        notes: log.notes || '',
        tasteNotes: log.tasteNotes || '',
        aroma: log.aroma || '',
        body: log.body || '',
        acidity: log.acidity || '',
        sweetness: log.sweetness || '',
        bitterness: log.bitterness || '',
        aftertaste: log.aftertaste || '',
        crema: log.crema || '',
        color: log.color || '',
        texture: log.texture || '',
        balance: log.balance || '',
        complexity: log.complexity || '',
        finish: log.finish || '',
        overallExperience: log.overallExperience || ''
      };
    });

    // Create CSV format for easy import into Colab (matching notebook structure)
    const csvHeaders = [
      // Core features (exactly matching notebook)
      'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
      'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
      'roastLevel', 'processMethod', 'ratio', 'flowRate', 'shotQuality',
      
      // Additional features
      'pressure', 'rating', 'ambientTemperature', 'humidity',
      
      // Metadata
      'userId', 'beanId', 'beanName', 'origin', 'brewDate', 'createdAt',
      
      // Additional data for analysis
      'notes', 'tasteNotes', 'aroma', 'body', 'acidity', 'sweetness', 'bitterness',
      'aftertaste', 'crema', 'color', 'texture', 'balance', 'complexity', 'finish',
      'overallExperience'
    ];

    // Generate CSV content
    let csvContent = csvHeaders.join(',') + '\n';
    
    trainingData.forEach(log => {
      const row = csvHeaders.map(header => {
        let value = log[header];
        if (value === null || value === undefined) {
          value = '';
        }
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(',') + '\n';
    });

    // Write to files
    const fs = require('fs');
    const path = require('path');

    // Write JSON file
    fs.writeFileSync('coffee_logs_training_data.json', JSON.stringify(trainingData, null, 2));
    console.log('📄 Exported coffee_logs_training_data.json');

    // Write CSV file
    fs.writeFileSync('coffee_logs_training_data.csv', csvContent);
    console.log('📄 Exported coffee_logs_training_data.csv');

    // Write summary statistics
    const stats = {
      totalLogs: trainingData.length,
      qualityDistribution: {},
      roastLevelDistribution: {},
      originDistribution: {},
      averageRating: 0,
      dateRange: {
        earliest: null,
        latest: null
      }
    };

    // Calculate statistics
    trainingData.forEach(log => {
      // Quality distribution
      stats.qualityDistribution[log.shotQuality] = (stats.qualityDistribution[log.shotQuality] || 0) + 1;
      
      // Roast level distribution
      stats.roastLevelDistribution[log.roastLevel] = (stats.roastLevelDistribution[log.roastLevel] || 0) + 1;
      
      // Origin distribution
      stats.originDistribution[log.origin] = (stats.originDistribution[log.origin] || 0) + 1;
      
      // Rating
      stats.averageRating += log.rating;
      
      // Date range
      const brewDate = new Date(log.brewDate);
      if (!stats.dateRange.earliest || brewDate < new Date(stats.dateRange.earliest)) {
        stats.dateRange.earliest = log.brewDate;
      }
      if (!stats.dateRange.latest || brewDate > new Date(stats.dateRange.latest)) {
        stats.dateRange.latest = log.brewDate;
      }
    });

    stats.averageRating = (stats.averageRating / trainingData.length).toFixed(2);

    fs.writeFileSync('coffee_logs_summary.json', JSON.stringify(stats, null, 2));
    console.log('📊 Exported coffee_logs_summary.json');

    // Print summary to console
    console.log('\n📈 EXPORT SUMMARY:');
    console.log(`Total coffee logs: ${stats.totalLogs}`);
    console.log(`Average rating: ${stats.averageRating}`);
    console.log(`Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
    console.log('\nQuality distribution:');
    Object.entries(stats.qualityDistribution).forEach(([quality, count]) => {
      console.log(`  ${quality}: ${count} (${((count/stats.totalLogs)*100).toFixed(1)}%)`);
    });
    console.log('\nRoast level distribution:');
    Object.entries(stats.roastLevelDistribution).forEach(([roast, count]) => {
      console.log(`  ${roast}: ${count} (${((count/stats.totalLogs)*100).toFixed(1)}%)`);
    });

    console.log('\n✅ Export completed successfully!');
    console.log('📁 Files created:');
    console.log('  - coffee_logs_training_data.json (full data)');
    console.log('  - coffee_logs_training_data.csv (CSV format)');
    console.log('  - coffee_logs_summary.json (statistics)');
    console.log('\n🚀 You can now upload these files to Google Colab for training!');
    
    // Generate Python code for Colab
    const pythonCode = `
# Google Colab Code - Load Your Coffee Logs Data
# Copy and paste this code into a new cell in your Colab notebook

import pandas as pd
import numpy as np
from google.colab import files

# Upload the CSV file
print("📁 Please upload the 'coffee_logs_training_data.csv' file")
uploaded = files.upload()

# Load the data
df = pd.read_csv('coffee_logs_training_data.csv')
print(f"📊 Loaded {len(df)} coffee logs")
print(f"📈 Dataset shape: {df.shape}")
print(f"📋 Columns: {list(df.columns)}")

# Display basic info
print("\\n📊 Dataset Info:")
print(df.info())

# Display first few rows
print("\\n📋 First 5 rows:")
print(df.head())

# Display quality distribution
print("\\n📈 Shot Quality Distribution:")
print(df['shotQuality'].value_counts().sort_index())

# Display roast level distribution
print("\\n☕ Roast Level Distribution:")
print(df['roastLevel'].value_counts())

# Display process method distribution
print("\\n🌱 Process Method Distribution:")
print(df['processMethod'].value_counts())

# Check for missing values
print("\\n❓ Missing Values:")
print(df.isnull().sum())

# Basic statistics
print("\\n📊 Basic Statistics:")
print(df.describe())

# Ready for training!
print("\\n🚀 Data is ready for training! You can now use this DataFrame in your notebook.")
print("\\n💡 Next steps:")
print("1. Use the 'prepare_features()' function from your notebook")
print("2. Split the data into training and testing sets")
print("3. Train your models!")
`;

    fs.writeFileSync('colab_import_code.py', pythonCode);
    console.log('🐍 Exported colab_import_code.py (Python code for Colab)');

  } catch (error) {
    console.error('❌ Error exporting coffee logs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the export
exportCoffeeLogs();
