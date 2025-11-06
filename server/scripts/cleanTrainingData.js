/**
 * Training Data Cleaning Pipeline
 * =================================
 *
 * Cleans coffee log data for ML training by:
 * 1. Filtering out incomplete logs
 * 2. Removing outliers
 * 3. Validating categorical values
 * 4. Calculating derived features
 * 5. Exporting cleaned dataset
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const CoffeeLog = require('../models/coffeeLog.model');

class TrainingDataCleaner {
  constructor() {
    this.stats = {
      total: 0,
      valid: 0,
      filtered: 0,
      reasons: {}
    };
  }

  /**
   * Main cleaning pipeline
   */
  async clean() {
    console.log('🧹 Starting Training Data Cleaning Pipeline...\n');

    try {
      // 1. Connect to database
      await this.connectDatabase();

      // 2. Fetch all coffee logs
      const logs = await this.fetchLogs();
      this.stats.total = logs.length;
      console.log(`📊 Fetched ${logs.length} total coffee logs\n`);

      // 3. Clean and validate
      const cleanedLogs = this.cleanLogs(logs);
      this.stats.valid = cleanedLogs.length;
      this.stats.filtered = this.stats.total - this.stats.valid;

      // 4. Add derived features
      const enrichedLogs = this.addDerivedFeatures(cleanedLogs);

      // 5. Export data
      await this.exportData(enrichedLogs);

      // 6. Print statistics
      this.printStatistics();

      process.exit(0);
    } catch (error) {
      console.error('❌ Cleaning pipeline failed:', error);
      process.exit(1);
    }
  }

  /**
   * Connect to MongoDB
   */
  async connectDatabase() {
    const uri = process.env.ATLAS_URI || 'mongodb://localhost:27017/altaniancoffee';

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');
  }

  /**
   * Fetch all coffee logs
   */
  async fetchLogs() {
    return await CoffeeLog.find({})
      .populate('bean', 'name roaster origin')
      .populate('user', 'username')
      .lean();
  }

  /**
   * Clean and validate logs
   */
  cleanLogs(logs) {
    const cleaned = [];

    for (const log of logs) {
      const issues = this.validateLog(log);

      if (issues.length === 0) {
        cleaned.push(log);
      } else {
        // Track filtering reasons
        issues.forEach(reason => {
          this.stats.reasons[reason] = (this.stats.reasons[reason] || 0) + 1;
        });
      }
    }

    return cleaned;
  }

  /**
   * Validate individual log
   * Returns array of issues (empty if valid)
   */
  validateLog(log) {
    const issues = [];

    // 1. Required fields
    if (!log.shotQuality || log.shotQuality < 1 || log.shotQuality > 10) {
      issues.push('missing_or_invalid_shotQuality');
    }
    if (!log.inWeight || log.inWeight < 10 || log.inWeight > 30) {
      issues.push('missing_or_invalid_inWeight');
    }
    if (!log.outWeight || log.outWeight < 15 || log.outWeight > 80) {
      issues.push('missing_or_invalid_outWeight');
    }
    if (!log.extractionTime || log.extractionTime < 10 || log.extractionTime > 60) {
      issues.push('missing_or_invalid_extractionTime');
    }

    // 2. Optional but important fields
    if (!log.grindSize || log.grindSize < 1 || log.grindSize > 50) {
      issues.push('missing_or_invalid_grindSize');
    }
    if (!log.temperature || log.temperature < 85 || log.temperature > 96) {
      issues.push('missing_or_invalid_temperature');
    }

    // 3. Categorical validation
    const validRoastLevels = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'];
    if (log.roastLevel && !validRoastLevels.includes(log.roastLevel)) {
      issues.push('invalid_roastLevel');
    }

    const validProcessMethods = ['washed', 'natural', 'honey', 'semi-washed', 'other'];
    if (log.processMethod && !validProcessMethods.includes(log.processMethod)) {
      issues.push('invalid_processMethod');
    }

    const validMachines = ['Meraki', 'Breville', 'La Marzocco', 'Rancilio', 'Gaggia', 'Other'];
    if (log.machine && !validMachines.includes(log.machine)) {
      issues.push('invalid_machine');
    }

    // 4. Physical impossibilities
    const ratio = log.outWeight / log.inWeight;
    if (ratio < 0.5 || ratio > 4) {
      issues.push('impossible_ratio');
    }

    const flowRate = log.outWeight / log.extractionTime;
    if (flowRate < 0.3 || flowRate > 3) {
      issues.push('impossible_flowRate');
    }

    // 5. Taste profile validation
    if (log.tasteProfile) {
      const { sweetness, acidity, bitterness, body } = log.tasteProfile;
      if (
        (sweetness && (sweetness < 1 || sweetness > 5)) ||
        (acidity && (acidity < 1 || acidity > 5)) ||
        (bitterness && (bitterness < 1 || bitterness > 5)) ||
        (body && (body < 1 || body > 5))
      ) {
        issues.push('invalid_tasteProfile');
      }
    }

    return issues;
  }

  /**
   * Add derived features for ML
   */
  addDerivedFeatures(logs) {
    console.log('🔧 Adding derived features...');

    return logs.map(log => {
      // Basic calculated features
      const ratio = log.outWeight / log.inWeight;
      const flowRate = log.outWeight / log.extractionTime;
      const extractionYield = (log.outWeight * 0.12) / log.inWeight * 100;

      // Interaction features
      const pressureTime = log.pressure * log.extractionTime;
      const tempRatio = log.temperature * ratio;
      const grindDose = log.grindSize * log.inWeight;
      const flowPressure = flowRate * log.pressure;

      // Shot type classification
      let shotType;
      if (ratio < 1.5) shotType = 'ristretto';
      else if (ratio < 2.5) shotType = 'normale';
      else shotType = 'lungo';

      // Bean freshness category
      let freshnessCategory;
      const days = log.daysPastRoast || 14;
      if (days <= 7) freshnessCategory = 'very_fresh';
      else if (days <= 14) freshnessCategory = 'fresh';
      else if (days <= 21) freshnessCategory = 'aging';
      else freshnessCategory = 'stale';

      // Temperature zone
      let tempZone;
      if (log.temperature < 88) tempZone = 'too_cold';
      else if (log.temperature < 92) tempZone = 'low';
      else if (log.temperature <= 94) tempZone = 'ideal';
      else tempZone = 'high';

      // Extraction intensity
      const extractionIntensity = (log.extractionTime * log.temperature) / ratio;

      // Pressure efficiency
      const pressureEfficiency = log.outWeight / (log.pressure * log.extractionTime);

      return {
        ...log,
        // Calculated features
        ratio,
        flowRate,
        extractionYield,
        // Interaction features
        pressureTime,
        tempRatio,
        grindDose,
        flowPressure,
        // Classifications
        shotType,
        freshnessCategory,
        tempZone,
        // Advanced metrics
        extractionIntensity,
        pressureEfficiency
      };
    });
  }

  /**
   * Export cleaned data
   */
  async exportData(logs) {
    console.log('\n💾 Exporting cleaned data...');

    const outputDir = path.join(__dirname, '../../');

    // Export as JSON
    const jsonPath = path.join(outputDir, 'training_data_cleaned.json');
    await fs.writeFile(jsonPath, JSON.stringify(logs, null, 2));
    console.log(`✅ Exported JSON: ${jsonPath}`);

    // Export as CSV for compatibility
    const csvPath = path.join(outputDir, 'training_data_cleaned.csv');
    const csv = this.convertToCSV(logs);
    await fs.writeFile(csvPath, csv);
    console.log(`✅ Exported CSV: ${csvPath}`);

    // Export summary statistics
    const summaryPath = path.join(outputDir, 'training_data_summary.json');
    const summary = this.generateSummary(logs);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Exported Summary: ${summaryPath}`);
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';

    // Get all unique keys
    const allKeys = new Set();
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        if (typeof log[key] !== 'object' || log[key] === null) {
          allKeys.add(key);
        } else if (key === 'tasteProfile') {
          allKeys.add('tasteProfile_sweetness');
          allKeys.add('tasteProfile_acidity');
          allKeys.add('tasteProfile_bitterness');
          allKeys.add('tasteProfile_body');
        }
      });
    });

    const keys = Array.from(allKeys).filter(k => k !== '_id' && k !== '__v');

    // Header row
    const header = keys.join(',');

    // Data rows
    const rows = logs.map(log => {
      return keys.map(key => {
        if (key.startsWith('tasteProfile_')) {
          const tasteKey = key.replace('tasteProfile_', '');
          return log.tasteProfile?.[tasteKey] || '';
        }

        const value = log[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Generate summary statistics
   */
  generateSummary(logs) {
    return {
      totalLogs: logs.length,
      dateRange: {
        earliest: logs[0]?.createdAt,
        latest: logs[logs.length - 1]?.createdAt
      },
      parameters: {
        shotQuality: this.getStats(logs, 'shotQuality'),
        inWeight: this.getStats(logs, 'inWeight'),
        outWeight: this.getStats(logs, 'outWeight'),
        extractionTime: this.getStats(logs, 'extractionTime'),
        temperature: this.getStats(logs, 'temperature'),
        grindSize: this.getStats(logs, 'grindSize'),
        ratio: this.getStats(logs, 'ratio'),
        flowRate: this.getStats(logs, 'flowRate')
      },
      distributions: {
        machines: this.getDistribution(logs, 'machine'),
        roastLevels: this.getDistribution(logs, 'roastLevel'),
        processMethods: this.getDistribution(logs, 'processMethod'),
        shotTypes: this.getDistribution(logs, 'shotType')
      },
      techniques: {
        usedWDT: logs.filter(l => l.usedWDT).length,
        usedPuckScreen: logs.filter(l => l.usedPuckScreen).length,
        usedPreInfusion: logs.filter(l => l.usedPreInfusion).length
      }
    };
  }

  /**
   * Get statistics for numeric field
   */
  getStats(logs, field) {
    const values = logs.map(l => l[field]).filter(v => v != null);
    if (values.length === 0) return null;

    values.sort((a, b) => a - b);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: values[Math.floor(values.length / 2)],
      count: values.length
    };
  }

  /**
   * Get distribution for categorical field
   */
  getDistribution(logs, field) {
    const counts = {};
    logs.forEach(log => {
      const value = log[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    return counts;
  }

  /**
   * Print cleaning statistics
   */
  printStatistics() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANING STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total logs processed: ${this.stats.total}`);
    console.log(`Valid logs: ${this.stats.valid} (${(this.stats.valid/this.stats.total*100).toFixed(1)}%)`);
    console.log(`Filtered out: ${this.stats.filtered} (${(this.stats.filtered/this.stats.total*100).toFixed(1)}%)`);

    if (Object.keys(this.stats.reasons).length > 0) {
      console.log('\nFiltering Reasons:');
      Object.entries(this.stats.reasons)
        .sort(([,a], [,b]) => b - a)
        .forEach(([reason, count]) => {
          console.log(`  - ${reason}: ${count}`);
        });
    }

    console.log('='.repeat(60));
    console.log('✅ Data cleaning complete!\n');
  }
}

// Execute cleaning pipeline
if (require.main === module) {
  const cleaner = new TrainingDataCleaner();
  cleaner.clean();
}

module.exports = TrainingDataCleaner;
