const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aiModelSchema = new Schema({
  // Model Identification
  modelName: { 
    type: String, 
    required: true, 
    default: 'Espresso Quality Predictor' 
  },
  version: { 
    type: String, 
    required: true,
    default: '1.0.0'
  },
  modelType: {
    type: String,
    enum: ['tensorflow', 'sklearn', 'custom'],
    default: 'tensorflow'
  },
  
  // Model Status
  status: {
    type: String,
    enum: ['training', 'ready', 'published', 'archived', 'failed'],
    default: 'training'
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  
  // Training Configuration
  trainingConfig: {
    epochs: { type: Number, default: 100 },
    batchSize: { type: Number, default: 32 },
    learningRate: { type: Number, default: 0.001 },
    validationSplit: { type: Number, default: 0.2 },
    earlyStopping: { type: Boolean, default: true },
    patience: { type: Number, default: 10 }
  },
  
  // Training Data
  trainingData: {
    totalLogs: { type: Number, default: 0 },
    validLogs: { type: Number, default: 0 },
    trainingSamples: { type: Number, default: 0 },
    validationSamples: { type: Number, default: 0 },
    dataRange: {
      startDate: Date,
      endDate: Date
    }
  },
  
  // Performance Metrics
  performanceMetrics: {
    accuracy: { type: Number, default: 0 },
    mae: { type: Number, default: 0 },
    rmse: { type: Number, default: 0 },
    r2: { type: Number, default: 0 },
    validationAccuracy: { type: Number, default: 0 },
    validationLoss: { type: Number, default: 0 },
    trainingLoss: { type: Number, default: 0 }
  },
  
  // Training History
  trainingHistory: [{
    epoch: { type: Number },
    loss: { type: Number },
    valLoss: { type: Number },
    accuracy: { type: Number },
    valAccuracy: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Model Files
  modelFiles: {
    modelPath: { type: String }, // Path to the trained model file
    scalerPath: { type: String }, // Path to the feature scaler
    featureColumnsPath: { type: String }, // Path to feature columns JSON
    metadataPath: { type: String }, // Path to model metadata
    size: { type: Number }, // Model file size in bytes
    checksum: { type: String } // File integrity check
  },
  
  // Training Session Info
  trainingSession: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number }, // Duration in milliseconds
    trainedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    trainingMethod: {
      type: String,
      enum: ['jupyter', 'api', 'manual'],
      default: 'api'
    }
  },
  
  // Publishing Info
  publishingInfo: {
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deploymentNotes: { type: String },
    rollbackFrom: { type: Schema.Types.ObjectId, ref: 'AIModel' }
  },
  
  // Model Architecture
  architecture: {
    inputFeatures: { type: Number, default: 25 },
    hiddenLayers: [{ type: Number }],
    outputFeatures: { type: Number, default: 1 },
    activationFunction: { type: String, default: 'relu' },
    optimizer: { type: String, default: 'adam' },
    lossFunction: { type: String, default: 'mse' }
  },
  
  // Feature Engineering
  featureEngineering: {
    features: [{ type: String }],
    scalers: { type: Schema.Types.Mixed },
    encoders: { type: Schema.Types.Mixed },
    preprocessingSteps: [{ type: String }]
  },
  
  // Usage Statistics
  usageStats: {
    totalPredictions: { type: Number, default: 0 },
    successfulPredictions: { type: Number, default: 0 },
    failedPredictions: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    lastUsed: { type: Date }
  },
  
  // Metadata
  description: { type: String },
  tags: [{ type: String }],
  notes: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient querying
aiModelSchema.index({ status: 1, isActive: 1 });
aiModelSchema.index({ version: 1 });
aiModelSchema.index({ createdAt: -1 });
aiModelSchema.index({ 'trainingSession.trainedBy': 1 });

// Pre-save middleware
aiModelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-generate version if not provided
  if (!this.version) {
    const timestamp = Date.now();
    this.version = `1.0.${timestamp}`;
  }
  
  // Calculate training duration
  if (this.trainingSession.startedAt && this.trainingSession.completedAt) {
    this.trainingSession.duration = 
      this.trainingSession.completedAt.getTime() - this.trainingSession.startedAt.getTime();
  }
  
  next();
});

// Instance methods
aiModelSchema.methods.publish = function(publishedBy, notes) {
  this.status = 'published';
  this.isPublished = true;
  this.isActive = true;
  this.publishingInfo = {
    publishedAt: new Date(),
    publishedBy,
    deploymentNotes: notes
  };
  return this.save();
};

aiModelSchema.methods.archive = function() {
  this.status = 'archived';
  this.isActive = false;
  this.isPublished = false;
  return this.save();
};

aiModelSchema.methods.rollback = function(rollbackFromModelId) {
  this.status = 'archived';
  this.isActive = false;
  this.publishingInfo.rollbackFrom = rollbackFromModelId;
  return this.save();
};

// Static methods
aiModelSchema.statics.getActiveModel = function() {
  return this.findOne({ status: 'published', isActive: true })
    .sort({ 'publishingInfo.publishedAt': -1 });
};

aiModelSchema.statics.getLatestModel = function() {
  return this.findOne({ status: 'published' })
    .sort({ 'publishingInfo.publishedAt': -1 });
};

aiModelSchema.statics.getModelHistory = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'publishingInfo.publishedAt': -1 })
    .limit(limit)
    .populate('trainingSession.trainedBy', 'firstName lastName username')
    .populate('publishingInfo.publishedBy', 'firstName lastName username');
};

const AIModel = mongoose.model('AIModel', aiModelSchema);

module.exports = AIModel;
