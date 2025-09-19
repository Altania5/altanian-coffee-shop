const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to register them
require('./models/bean.model');
require('./models/coffeeLog.model');
require('./models/user.model');

const CoffeeLog = mongoose.model('CoffeeLog');

async function analyzeLogs() {
  try {
    // Use the same connection method as server.js
    const uri = process.env.ATLAS_URI;
    console.log('ATLAS_URI:', uri ? 'Found (length: ' + uri.length + ')' : 'NOT FOUND');
    
    if (!uri) {
      console.error('❌ ATLAS_URI environment variable not found');
      console.log('Please set ATLAS_URI in your environment or .env file');
      process.exit(1);
    }
    
    await mongoose.connect(uri);
    
    console.log('📊 Analyzing coffee logs for retraining...');
    
    const logs = await CoffeeLog.find({}).populate('bean', 'roastLevel processMethod roastDate');
    console.log(`Total logs: ${logs.length}`);
    
    const validLogs = logs.filter(log => {
      const hasBasicData = log.inWeight && log.outWeight && log.extractionTime;
      const hasQuality = log.shotQuality && log.shotQuality >= 1 && log.shotQuality <= 10;
      return hasBasicData && hasQuality;
    });
    
    console.log(`Valid logs: ${validLogs.length}`);
    
    if (validLogs.length > 0) {
      const qualityCounts = {};
      validLogs.forEach(log => {
        const quality = log.shotQuality;
        qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
      });
      
      console.log('\n📊 Quality Score Distribution:');
      for (let i = 1; i <= 10; i++) {
        const count = qualityCounts[i] || 0;
        const percentage = ((count / validLogs.length) * 100).toFixed(1);
        console.log(`  ${i}/10: ${count} logs (${percentage}%)`);
      }
      
      // Analyze good vs bad logs
      const goodLogs = validLogs.filter(log => log.shotQuality >= 7);
      const badLogs = validLogs.filter(log => log.shotQuality <= 4);
      const mediocreLogs = validLogs.filter(log => log.shotQuality >= 5 && log.shotQuality <= 6);
      
      console.log(`\n🎯 Quality Categories:`);
      console.log(`  Good (7-10): ${goodLogs.length} logs (${((goodLogs.length/validLogs.length)*100).toFixed(1)}%)`);
      console.log(`  Mediocre (5-6): ${mediocreLogs.length} logs (${((mediocreLogs.length/validLogs.length)*100).toFixed(1)}%)`);
      console.log(`  Bad (1-4): ${badLogs.length} logs (${((badLogs.length/validLogs.length)*100).toFixed(1)}%)`);
      
      // Analyze patterns in good vs bad logs
      if (goodLogs.length > 0) {
        const goodExtractionTimes = goodLogs.map(log => log.extractionTime);
        const goodRatios = goodLogs.map(log => log.outWeight / log.inWeight);
        const goodAvgExtraction = goodExtractionTimes.reduce((sum, t) => sum + t, 0) / goodExtractionTimes.length;
        const goodAvgRatio = goodRatios.reduce((sum, r) => sum + r, 0) / goodRatios.length;
        
        console.log(`\n✅ Good Logs Patterns:`);
        console.log(`  Avg Extraction Time: ${goodAvgExtraction.toFixed(1)}s`);
        console.log(`  Avg Ratio: ${goodAvgRatio.toFixed(2)}:1`);
        
        // Analyze techniques used in good logs
        const goodWDT = goodLogs.filter(log => log.usedWDT).length;
        const goodPreInfusion = goodLogs.filter(log => log.usedPreInfusion).length;
        const goodPuckScreen = goodLogs.filter(log => log.usedPuckScreen).length;
        
        console.log(`  WDT Usage: ${goodWDT}/${goodLogs.length} (${((goodWDT/goodLogs.length)*100).toFixed(1)}%)`);
        console.log(`  Pre-infusion Usage: ${goodPreInfusion}/${goodLogs.length} (${((goodPreInfusion/goodLogs.length)*100).toFixed(1)}%)`);
        console.log(`  Puck Screen Usage: ${goodPuckScreen}/${goodLogs.length} (${((goodPuckScreen/goodLogs.length)*100).toFixed(1)}%)`);
      }
      
      if (badLogs.length > 0) {
        const badExtractionTimes = badLogs.map(log => log.extractionTime);
        const badRatios = badLogs.map(log => log.outWeight / log.inWeight);
        const badAvgExtraction = badExtractionTimes.reduce((sum, t) => sum + t, 0) / badExtractionTimes.length;
        const badAvgRatio = badRatios.reduce((sum, r) => sum + r, 0) / badRatios.length;
        
        console.log(`\n❌ Bad Logs Patterns:`);
        console.log(`  Avg Extraction Time: ${badAvgExtraction.toFixed(1)}s`);
        console.log(`  Avg Ratio: ${badAvgRatio.toFixed(2)}:1`);
        
        // Analyze techniques used in bad logs
        const badWDT = badLogs.filter(log => log.usedWDT).length;
        const badPreInfusion = badLogs.filter(log => log.usedPreInfusion).length;
        const badPuckScreen = badLogs.filter(log => log.usedPuckScreen).length;
        
        console.log(`  WDT Usage: ${badWDT}/${badLogs.length} (${((badWDT/badLogs.length)*100).toFixed(1)}%)`);
        console.log(`  Pre-infusion Usage: ${badPreInfusion}/${badLogs.length} (${((badPreInfusion/badLogs.length)*100).toFixed(1)}%)`);
        console.log(`  Puck Screen Usage: ${badPuckScreen}/${badLogs.length} (${((badPuckScreen/badLogs.length)*100).toFixed(1)}%)`);
      }
      
      // Check if we have enough data for retraining
      if (validLogs.length >= 20) {
        console.log(`\n🚀 READY FOR RETRAINING!`);
        console.log(`  - ${validLogs.length} valid logs available`);
        console.log(`  - Good quality differentiation (${goodLogs.length} good, ${badLogs.length} bad)`);
        console.log(`  - Sufficient data for pattern recognition`);
      } else {
        console.log(`\n⚠️ Need more data for retraining`);
        console.log(`  - Currently have ${validLogs.length} valid logs`);
        console.log(`  - Recommend at least 20 logs for effective training`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeLogs();
