const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import all models to register them
require('./models/bean.model');
require('./models/coffeeLog.model');
require('./models/user.model');

const CoffeeLog = mongoose.model('CoffeeLog');

// ========================================
// DATA CLEANING PIPELINE
// ========================================

class DataCleaner {
  constructor() {
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: [],
      issues: {
        missingRequired: [],
        invalidValues: [],
        outliers: [],
        missingOptional: [],
        dataQuality: []
      }
    };

    this.cleanedLogs = [];
  }

  // Validate required fields
  validateRequired(log) {
    const required = {
      shotQuality: log.shotQuality,
      inWeight: log.inWeight,
      outWeight: log.outWeight,
      extractionTime: log.extractionTime,
      grindSize: log.grindSize,
      machine: log.machine,
      roastLevel: log.roastLevel,
      processMethod: log.processMethod
    };

    const missing = [];
    for (const [field, value] of Object.entries(required)) {
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    }

    return missing;
  }

  // Validate value ranges
  validateRanges(log) {
    const issues = [];

    // Shot quality: 1-10
    if (log.shotQuality < 1 || log.shotQuality > 10) {
      issues.push(`shotQuality out of range: ${log.shotQuality}`);
    }

    // Grind size: 1-50 (typical range)
    if (log.grindSize < 1 || log.grindSize > 50) {
      issues.push(`grindSize out of range: ${log.grindSize}`);
    }

    // Extraction time: 10-60 seconds (extreme range)
    if (log.extractionTime < 10 || log.extractionTime > 60) {
      issues.push(`extractionTime out of range: ${log.extractionTime}s`);
    }

    // Temperature: 85-96°C
    if (log.temperature && (log.temperature < 85 || log.temperature > 96)) {
      issues.push(`temperature out of range: ${log.temperature}°C`);
    }

    // Dose: 10-30g (extreme range)
    if (log.inWeight < 10 || log.inWeight > 30) {
      issues.push(`inWeight out of range: ${log.inWeight}g`);
    }

    // Yield: 15-80g
    if (log.outWeight < 15 || log.outWeight > 80) {
      issues.push(`outWeight out of range: ${log.outWeight}g`);
    }

    // Ratio: 1:0.5 to 1:4 (ristretto to lungo)
    const ratio = log.outWeight / log.inWeight;
    if (ratio < 0.5 || ratio > 4) {
      issues.push(`ratio out of range: 1:${ratio.toFixed(2)}`);
    }

    // Pressure: 6-15 bars
    if (log.pressure && (log.pressure < 6 || log.pressure > 15)) {
      issues.push(`pressure out of range: ${log.pressure} bars`);
    }

    return issues;
  }

  // Detect outliers using statistical methods
  detectOutliers(log, allLogs) {
    const outliers = [];

    // Only check if we have enough data for statistics
    if (allLogs.length < 10) return outliers;

    const checkField = (field, value) => {
      const values = allLogs.map(l => l[field]).filter(v => v != null);
      if (values.length < 5) return false;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Flag if more than 3 standard deviations away
      if (Math.abs(value - mean) > 3 * stdDev) {
        outliers.push(`${field}: ${value} (mean: ${mean.toFixed(2)}, stdDev: ${stdDev.toFixed(2)})`);
        return true;
      }
      return false;
    };

    if (log.extractionTime) checkField('extractionTime', log.extractionTime);
    if (log.temperature) checkField('temperature', log.temperature);
    if (log.grindSize) checkField('grindSize', log.grindSize);

    return outliers;
  }

  // Check data quality indicators
  assessQuality(log) {
    const issues = [];

    // Check if taste profile is just defaults
    if (log.tasteProfile) {
      const { sweetness, acidity, bitterness, body } = log.tasteProfile;
      if (sweetness === 3 && acidity === 3 && bitterness === 3 && body === 3) {
        issues.push('taste profile appears to be default values');
      }

      // Check if taste profile is all same value (lazy rating)
      if (sweetness === acidity && acidity === bitterness && bitterness === body) {
        issues.push('taste profile all same value - may indicate low engagement');
      }
    }

    // Check if shot quality is a round number (5, 7, 8)
    if (log.shotQuality && log.shotQuality % 1 === 0 && [5, 7, 8].includes(log.shotQuality)) {
      // This is actually common and not necessarily an issue, just noting it
    }

    // Check for missing important optional fields
    const importantOptional = [];
    if (!log.temperature) importantOptional.push('temperature');
    if (!log.daysPastRoast && log.daysPastRoast !== 0) importantOptional.push('daysPastRoast');
    if (!log.pressure) importantOptional.push('pressure');

    if (importantOptional.length > 0) {
      issues.push(`missing important optional fields: ${importantOptional.join(', ')}`);
    }

    return issues;
  }

  // Main cleaning function
  async clean() {
    console.log('🧹 Starting data cleaning pipeline...\n');

    // Load all logs
    const logs = await CoffeeLog.find({})
      .populate('bean', 'name origin roastLevel processMethod roastDate')
      .populate('user', 'username email')
      .lean();

    this.stats.total = logs.length;
    console.log(`📊 Total logs in database: ${logs.length}`);

    if (logs.length === 0) {
      console.log('❌ No logs found in database!');
      return;
    }

    // Process each log
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const logId = log._id.toString();
      let isValid = true;
      const logIssues = [];

      // 1. Check required fields
      const missingFields = this.validateRequired(log);
      if (missingFields.length > 0) {
        isValid = false;
        this.stats.issues.missingRequired.push({
          id: logId,
          fields: missingFields
        });
        logIssues.push(`Missing required: ${missingFields.join(', ')}`);
      }

      // 2. Validate value ranges
      const rangeIssues = this.validateRanges(log);
      if (rangeIssues.length > 0) {
        isValid = false;
        this.stats.issues.invalidValues.push({
          id: logId,
          issues: rangeIssues
        });
        logIssues.push(`Invalid values: ${rangeIssues.join(', ')}`);
      }

      // 3. Detect statistical outliers (warning, not disqualifying)
      const outliers = this.detectOutliers(log, logs);
      if (outliers.length > 0) {
        this.stats.issues.outliers.push({
          id: logId,
          outliers: outliers
        });
        logIssues.push(`Outliers detected: ${outliers.join(', ')}`);
      }

      // 4. Assess data quality
      const qualityIssues = this.assessQuality(log);
      if (qualityIssues.length > 0) {
        this.stats.issues.dataQuality.push({
          id: logId,
          issues: qualityIssues
        });
        logIssues.push(`Quality concerns: ${qualityIssues.join(', ')}`);
      }

      // Add to appropriate list
      if (isValid) {
        this.stats.valid++;

        // Prepare log for export (flatten and clean up)
        const cleanLog = {
          // IDs
          logId: logId,
          userId: log.user?._id?.toString(),
          beanId: log.bean?._id?.toString(),

          // Core parameters
          machine: log.machine,
          grindSize: log.grindSize,
          extractionTime: log.extractionTime,
          temperature: log.temperature || 93, // default to 93 if missing
          inWeight: log.inWeight,
          outWeight: log.outWeight,
          pressure: log.pressure || 9, // default to 9 bars

          // Bean characteristics
          roastLevel: log.roastLevel,
          processMethod: log.processMethod,
          daysPastRoast: log.daysPastRoast ?? 14, // default to 14 days if missing
          beanUsageCount: log.beanUsageCount || 1,
          beanName: log.bean?.name || 'Unknown',
          beanOrigin: log.bean?.origin || 'Unknown',

          // Technique parameters
          usedPuckScreen: log.usedPuckScreen || false,
          usedWDT: log.usedWDT || false,
          distributionTechnique: log.distributionTechnique || 'none',
          usedPreInfusion: log.usedPreInfusion || false,
          preInfusionTime: log.preInfusionTime || 0,
          preInfusionPressure: log.preInfusionPressure || 0,

          // Calculated values
          ratio: log.ratio || (log.outWeight / log.inWeight),
          extractionYield: log.extractionYield || 0,
          flowRate: log.flowRate || (log.outWeight / log.extractionTime),

          // Target outputs
          shotQuality: log.shotQuality,
          sweetness: log.tasteProfile?.sweetness || 3,
          acidity: log.tasteProfile?.acidity || 3,
          bitterness: log.tasteProfile?.bitterness || 3,
          body: log.tasteProfile?.body || 3,
          tasteMetExpectations: log.tasteMetExpectations,
          targetProfile: log.targetProfile || 'balanced',

          // Environmental
          humidity: log.humidity,

          // Metadata
          createdAt: log.createdAt,
          notes: log.notes,

          // Data quality flags
          hasOutliers: outliers.length > 0,
          qualityWarnings: qualityIssues.length > 0
        };

        this.cleanedLogs.push(cleanLog);
      } else {
        this.stats.invalid++;
      }

      // Log issues for this entry
      if (logIssues.length > 0) {
        this.stats.warnings.push({
          logId: logId,
          date: log.createdAt,
          shotQuality: log.shotQuality,
          issues: logIssues
        });
      }
    }

    console.log(`\n✅ Valid logs: ${this.stats.valid}`);
    console.log(`❌ Invalid logs: ${this.stats.invalid}`);
    console.log(`⚠️  Logs with warnings: ${this.stats.warnings.length}`);
  }

  // Generate detailed report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('DATA CLEANING REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total logs: ${this.stats.total}`);
    console.log(`  Valid logs: ${this.stats.valid} (${((this.stats.valid/this.stats.total)*100).toFixed(1)}%)`);
    console.log(`  Invalid logs: ${this.stats.invalid} (${((this.stats.invalid/this.stats.total)*100).toFixed(1)}%)`);

    if (this.stats.issues.missingRequired.length > 0) {
      console.log(`\n❌ MISSING REQUIRED FIELDS (${this.stats.issues.missingRequired.length} logs):`);
      this.stats.issues.missingRequired.slice(0, 5).forEach(issue => {
        console.log(`  - Log ${issue.id}: ${issue.fields.join(', ')}`);
      });
      if (this.stats.issues.missingRequired.length > 5) {
        console.log(`  ... and ${this.stats.issues.missingRequired.length - 5} more`);
      }
    }

    if (this.stats.issues.invalidValues.length > 0) {
      console.log(`\n❌ INVALID VALUES (${this.stats.issues.invalidValues.length} logs):`);
      this.stats.issues.invalidValues.slice(0, 5).forEach(issue => {
        console.log(`  - Log ${issue.id}: ${issue.issues.join(', ')}`);
      });
      if (this.stats.issues.invalidValues.length > 5) {
        console.log(`  ... and ${this.stats.issues.invalidValues.length - 5} more`);
      }
    }

    if (this.stats.issues.outliers.length > 0) {
      console.log(`\n⚠️  STATISTICAL OUTLIERS (${this.stats.issues.outliers.length} logs):`);
      console.log(`  (These may be valid but unusual shots)`);
      this.stats.issues.outliers.slice(0, 3).forEach(issue => {
        console.log(`  - Log ${issue.id}: ${issue.outliers.join(', ')}`);
      });
      if (this.stats.issues.outliers.length > 3) {
        console.log(`  ... and ${this.stats.issues.outliers.length - 3} more`);
      }
    }

    if (this.stats.issues.dataQuality.length > 0) {
      console.log(`\n⚠️  DATA QUALITY CONCERNS (${this.stats.issues.dataQuality.length} logs):`);
      this.stats.issues.dataQuality.slice(0, 5).forEach(issue => {
        console.log(`  - Log ${issue.id}: ${issue.issues.join(', ')}`);
      });
      if (this.stats.issues.dataQuality.length > 5) {
        console.log(`  ... and ${this.stats.issues.dataQuality.length - 5} more`);
      }
    }

    // Data distribution analysis
    if (this.cleanedLogs.length > 0) {
      console.log(`\n📈 DATA DISTRIBUTION:`);

      // Quality distribution
      const qualityCounts = {};
      this.cleanedLogs.forEach(log => {
        const q = Math.round(log.shotQuality);
        qualityCounts[q] = (qualityCounts[q] || 0) + 1;
      });

      console.log(`\n  Shot Quality Distribution:`);
      for (let i = 1; i <= 10; i++) {
        const count = qualityCounts[i] || 0;
        const percentage = ((count / this.cleanedLogs.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(count / this.cleanedLogs.length * 20));
        console.log(`    ${i}/10: ${bar} ${count} (${percentage}%)`);
      }

      // Machine distribution
      const machineCounts = {};
      this.cleanedLogs.forEach(log => {
        machineCounts[log.machine] = (machineCounts[log.machine] || 0) + 1;
      });

      console.log(`\n  Machine Distribution:`);
      Object.entries(machineCounts).sort((a, b) => b[1] - a[1]).forEach(([machine, count]) => {
        const percentage = ((count / this.cleanedLogs.length) * 100).toFixed(1);
        console.log(`    ${machine}: ${count} (${percentage}%)`);
      });

      // Roast level distribution
      const roastCounts = {};
      this.cleanedLogs.forEach(log => {
        roastCounts[log.roastLevel] = (roastCounts[log.roastLevel] || 0) + 1;
      });

      console.log(`\n  Roast Level Distribution:`);
      Object.entries(roastCounts).sort((a, b) => b[1] - a[1]).forEach(([roast, count]) => {
        const percentage = ((count / this.cleanedLogs.length) * 100).toFixed(1);
        console.log(`    ${roast}: ${count} (${percentage}%)`);
      });

      // Calculate key statistics
      const avgQuality = this.cleanedLogs.reduce((sum, log) => sum + log.shotQuality, 0) / this.cleanedLogs.length;
      const avgExtraction = this.cleanedLogs.reduce((sum, log) => sum + log.extractionTime, 0) / this.cleanedLogs.length;
      const avgRatio = this.cleanedLogs.reduce((sum, log) => sum + log.ratio, 0) / this.cleanedLogs.length;
      const avgTemp = this.cleanedLogs.reduce((sum, log) => sum + log.temperature, 0) / this.cleanedLogs.length;

      console.log(`\n  Key Statistics:`);
      console.log(`    Average Quality: ${avgQuality.toFixed(2)}/10`);
      console.log(`    Average Extraction Time: ${avgExtraction.toFixed(1)}s`);
      console.log(`    Average Ratio: 1:${avgRatio.toFixed(2)}`);
      console.log(`    Average Temperature: ${avgTemp.toFixed(1)}°C`);
    }

    // Readiness assessment
    console.log(`\n🚀 ML READINESS ASSESSMENT:`);
    if (this.stats.valid >= 50) {
      console.log(`  ✅ READY FOR XGBOOST TRAINING`);
      console.log(`     - ${this.stats.valid} clean logs available`);
      console.log(`     - Sufficient for gradient boosting models`);
      console.log(`     - Can use 5-fold cross-validation`);
    } else if (this.stats.valid >= 30) {
      console.log(`  ⚠️  MARGINAL - Can train but limited`);
      console.log(`     - ${this.stats.valid} clean logs available`);
      console.log(`     - Consider simpler models or collect more data`);
      console.log(`     - Use 3-fold cross-validation`);
    } else {
      console.log(`  ❌ NOT READY - Need more data`);
      console.log(`     - Only ${this.stats.valid} clean logs`);
      console.log(`     - Recommend at least 50 logs for XGBoost`);
      console.log(`     - Current model will have high uncertainty`);
    }
  }

  // Export cleaned data
  async export() {
    const outputDir = path.join(__dirname);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Export cleaned training data
    const trainingDataPath = path.join(outputDir, 'training_data_cleaned.json');
    fs.writeFileSync(trainingDataPath, JSON.stringify(this.cleanedLogs, null, 2));
    console.log(`\n💾 Cleaned training data exported to: ${trainingDataPath}`);
    console.log(`   ${this.cleanedLogs.length} logs ready for ML training`);

    // Export full report
    const reportPath = path.join(outputDir, `data_cleaning_report_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
    console.log(`\n📋 Full report exported to: ${reportPath}`);

    // Export CSV for easy viewing
    if (this.cleanedLogs.length > 0) {
      const csvPath = path.join(outputDir, 'training_data_cleaned.csv');
      const csvHeaders = Object.keys(this.cleanedLogs[0]).join(',');
      const csvRows = this.cleanedLogs.map(log =>
        Object.values(log).map(val => {
          // Escape values with commas
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        }).join(',')
      );
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      fs.writeFileSync(csvPath, csvContent);
      console.log(`\n📊 CSV exported to: ${csvPath}`);
    }
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  try {
    // Connect to MongoDB
    const uri = process.env.ATLAS_URI;
    if (!uri) {
      console.error('❌ ATLAS_URI environment variable not found');
      console.log('Please set ATLAS_URI in your environment or .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Run cleaning pipeline
    const cleaner = new DataCleaner();
    await cleaner.clean();
    cleaner.generateReport();
    await cleaner.export();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Data cleaning pipeline complete!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
