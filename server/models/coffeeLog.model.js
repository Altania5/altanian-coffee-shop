const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const coffeeLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bean: { type: Schema.Types.ObjectId, ref: 'Bean', required: true },
  machine: {
    type: String,
    enum: ['Meraki', 'Breville', 'La Marzocco', 'Rancilio', 'Gaggia', 'Other'],
    required: true
  },
  
  // Core Extraction Parameters
  grindSize: { type: Number, required: true, min: 1, max: 50 },
  extractionTime: { type: Number, required: true, min: 10, max: 60 }, // in seconds
  temperature: { type: Number, min: 85, max: 96 }, // in Celsius
  inWeight: { type: Number, required: true, min: 10, max: 30 }, // in grams
  outWeight: { type: Number, required: true, min: 15, max: 80 }, // in grams
  
  // NEW: Bean Characteristics (from Bean reference)
  roastLevel: { 
    type: String, 
    enum: ['light', 'light-medium', 'medium', 'medium-dark', 'dark'],
    required: true
  },
  processMethod: {
    type: String,
    enum: ['washed', 'natural', 'honey', 'semi-washed', 'other'],
    required: true
  },
  
  // NEW: Preparation Technique Parameters
  usedPuckScreen: { type: Boolean, default: false },
  usedWDT: { type: Boolean, default: false }, // WDT (Weiss Distribution Technique)
  distributionTechnique: {
    type: String,
    enum: ['none', 'tap-only', 'distribution-tool', 'wdt', 'wdt-plus-distribution'],
    default: 'none'
  },
  
  // NEW: Pre-Infusion Parameters
  usedPreInfusion: { type: Boolean, default: false },
  preInfusionTime: { type: Number, min: 0, max: 15 }, // seconds
  preInfusionPressure: { type: Number, min: 1, max: 5 }, // bars
  
  // AI Training Parameters
  shotQuality: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 10,
    default: 5 
  }, // 1-10 quality rating
  tasteProfile: {
    sweetness: { type: Number, min: 1, max: 5, default: 3 },
    acidity: { type: Number, min: 1, max: 5, default: 3 },
    bitterness: { type: Number, min: 1, max: 5, default: 3 },
    body: { type: Number, min: 1, max: 5, default: 3 } // thickness/mouthfeel
  },
  
  // Bean Age & Usage Tracking
  daysPastRoast: { type: Number, min: 0, max: 60 }, // days since roasted
  beanUsageCount: { type: Number, default: 1 }, // times this bean has been used
  
  // Environmental Factors
  humidity: { type: Number, min: 30, max: 80 }, // percentage
  pressure: { type: Number, default: 9 }, // bars
  
  // Calculated Values (auto-computed)
  ratio: { type: Number }, // out/in weight ratio
  extractionYield: { type: Number }, // percentage
  flowRate: { type: Number }, // ml/second
  
  // User Satisfaction & Goals
  tasteMetExpectations: { type: Boolean, required: true },
  targetProfile: {
    type: String,
    enum: ['balanced', 'bright', 'sweet', 'strong', 'fruity', 'chocolatey', 'custom'],
    default: 'balanced'
  },
  
  // AI Recommendations Applied
  aiRecommendationFollowed: {
    recommendation: { type: String },
    followed: { type: Boolean, default: false },
    improvement: { type: Number, min: -5, max: 5 } // quality change from following rec
  },
  
  notes: { type: String, trim: true, maxlength: 500 }
}, {
  timestamps: true,
});

// Pre-save middleware to calculate derived values
coffeeLogSchema.pre('save', async function(next) {
  // Calculate ratio (brew ratio)
  if (this.inWeight && this.outWeight) {
    this.ratio = parseFloat((this.outWeight / this.inWeight).toFixed(2));
  }
  
  // Calculate extraction yield (approximate)
  if (this.inWeight && this.outWeight) {
    // Simplified extraction yield calculation
    // Real calculation would need TDS measurement
    this.extractionYield = parseFloat(((this.outWeight * 0.12) / this.inWeight * 100).toFixed(2));
  }
  
  // Calculate flow rate (ml/second, assuming 1g = 1ml for espresso)
  if (this.outWeight && this.extractionTime) {
    this.flowRate = parseFloat((this.outWeight / this.extractionTime).toFixed(2));
  }
  
  // Auto-populate bean characteristics and calculate days past roast
  if (this.isNew || this.isModified('bean')) {
    try {
      const bean = await this.model('Bean').findById(this.bean);
      if (bean) {
        // Auto-populate roast level and process method from bean if not already set
        if (!this.roastLevel && bean.roastLevel) {
          this.roastLevel = bean.roastLevel;
        }
        if (!this.processMethod && bean.processMethod) {
          this.processMethod = bean.processMethod;
        }
        
        // Calculate days past roast
        if (bean.roastDate) {
          const diffTime = Date.now() - bean.roastDate.getTime();
          this.daysPastRoast = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    } catch (error) {
      console.error('Error processing bean data:', error);
    }
  }
  
  // Calculate bean usage count
  if (this.isNew && this.bean) {
    try {
      const usageCount = await this.constructor.countDocuments({
        bean: this.bean,
        createdAt: { $lt: new Date() }
      });
      this.beanUsageCount = usageCount + 1;
    } catch (error) {
      console.error('Error calculating bean usage count:', error);
      this.beanUsageCount = 1;
    }
  }
  
  next();
});

const CoffeeLog = mongoose.model('CoffeeLog', coffeeLogSchema);

module.exports = CoffeeLog;
