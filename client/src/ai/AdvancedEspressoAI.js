import * as tf from '@tensorflow/tfjs';
import { IDEAL_PARAMETERS, TROUBLESHOOTING_RULES } from '../data/espressoKnowledge';

class AdvancedEspressoAI {
  // Status management methods
  addStatusCallback(callback) {
    this.statusCallbacks.push(callback);
  }

  removeStatusCallback(callback) {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }

  updateStatus(status) {
    this.trainingStatus = { ...this.trainingStatus, ...status };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.trainingStatus);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  constructor() {
    this.model = null;
    this.isTraining = false;
    this.isReady = false;
    this.trainingHistory = [];
    this.userDataHistory = [];
    this.modelVersion = '2.0';
    this.trainingStatus = {
      phase: 'idle',
      progress: 0,
      message: '',
      epoch: 0,
      totalEpochs: 0,
      loss: null,
      valLoss: null
    };
    this.statusCallbacks = [];
    
    // Enhanced feature scaling with robust statistics
    this.featureStats = {
      mean: [],
      std: [],
      min: [],
      max: [],
      percentiles: {
        p25: [],
        p50: [],
        p75: []
      }
    };
    
    // Advanced model configuration
    this.modelConfig = {
      architecture: 'deep_regression',
      inputFeatures: 25, // Expanded feature set
      hiddenLayers: [64, 32, 16, 8],
      dropoutRates: [0.3, 0.2, 0.1],
      learningRate: 0.001,
      batchSize: 16,
      epochs: 1000,
      earlyStopping: {
        patience: 50,
        minDelta: 0.001
      }
    };
    
    // Performance tracking
    this.performanceMetrics = {
      accuracy: 0,
      mae: 0,
      rmse: 0,
      r2: 0,
      lastUpdated: null
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🧠 Initializing Advanced Espresso AI v2.0...');
      this.updateStatus({ phase: 'initializing', progress: 0, message: 'Initializing AI system...' });
      
      // Load existing model and user data
      this.updateStatus({ progress: 25, message: 'Loading existing model and user data...' });
      const [savedModel, userData] = await Promise.all([
        this.loadModel(),
        this.loadUserData()
      ]);
      
      if (savedModel && userData.length > 0) {
        this.model = savedModel;
        this.userDataHistory = userData;
        this.isReady = true;
        this.updateStatus({ phase: 'ready', progress: 100, message: `AI model loaded with ${userData.length} data points` });
        console.log(`✅ Loaded existing AI model with ${userData.length} user data points`);
        
        // Evaluate model performance
        await this.evaluateModel();
      } else {
        // Create and train new model with enhanced data
        await this.createAndTrainAdvancedModel();
      }
    } catch (error) {
      console.error('❌ Error initializing Advanced AI:', error);
      // Fallback to rule-based system
      this.isReady = true;
    }
  }

  async createAndTrainAdvancedModel() {
    console.log('🏗️ Creating advanced AI model architecture...');
    this.updateStatus({ phase: 'training', progress: 0, message: 'Starting model training...' });
    
    // Generate enhanced training data with more realistic patterns
    this.updateStatus({ progress: 10, message: 'Generating training data...' });
    const trainingData = await this.generateAdvancedTrainingData();
    console.log(`📊 Generated ${trainingData.length} advanced training examples`);
    
    // Add user data if available
    if (this.userDataHistory.length > 0) {
      trainingData.push(...this.userDataHistory);
      console.log(`📈 Added ${this.userDataHistory.length} real user data points`);
    }
    
    // Ensure we have enough data to train
    if (trainingData.length < 10) {
      console.warn('⚠️ Not enough training data, using fallback mode');
      this.updateStatus({ progress: 50, message: 'Insufficient data, using fallback mode...' });
      this.isReady = true;
      this.updateStatus({ phase: 'ready', progress: 100, message: 'Fallback mode ready!' });
      return;
    }
    
    // Prepare features and labels with advanced preprocessing
    this.updateStatus({ progress: 20, message: 'Preparing training features...' });
    const { features, labels, validationSplit } = await this.prepareAdvancedTrainingData(trainingData);
    
    // Compute robust feature statistics
    this.updateStatus({ progress: 30, message: 'Computing feature statistics...' });
    this.computeAdvancedFeatureStats(features);
    
    // Normalize features with robust scaling
    this.updateStatus({ progress: 40, message: 'Normalizing features...' });
    const normalizedFeatures = this.robustNormalizeFeatures(features);
    
    // Create advanced model architecture
    this.updateStatus({ progress: 50, message: 'Creating model architecture...' });
    this.model = this.createAdvancedModel();
    
    // Train with advanced techniques
    this.updateStatus({ progress: 60, message: 'Training model...', totalEpochs: this.modelConfig.epochs });
    await this.trainAdvancedModel(normalizedFeatures, labels, validationSplit);
    
    // Evaluate and save
    this.updateStatus({ progress: 90, message: 'Evaluating model performance...' });
    await this.evaluateModel();
    
    this.updateStatus({ progress: 95, message: 'Saving model and data...' });
    await this.saveModel();
    await this.saveUserData();
    
    this.isReady = true;
    this.updateStatus({ phase: 'ready', progress: 100, message: 'Advanced AI model ready!' });
    console.log('✅ Advanced AI model ready!');
  }

  async generateAdvancedTrainingData() {
    const trainingSet = [];
    
    // Generate diverse, realistic shot scenarios
    const scenarios = [
      // Perfect shots
      { count: 100, qualityRange: [8, 10], variation: 'low' },
      // Good shots with minor issues
      { count: 150, qualityRange: [6, 8], variation: 'medium' },
      // Problematic shots with specific issues
      { count: 200, qualityRange: [3, 6], variation: 'high' },
      // Extreme cases
      { count: 50, qualityRange: [1, 3], variation: 'extreme' }
    ];
    
    scenarios.forEach(scenario => {
      for (let i = 0; i < scenario.count; i++) {
        const shot = this.generateRealisticShot(scenario.qualityRange, scenario.variation);
        trainingSet.push(shot);
      }
    });
    
    // Add rule-based problematic shots
    TROUBLESHOOTING_RULES.forEach(rule => {
      for (let i = 0; i < 15; i++) {
        const shot = this.generateShotFromAdvancedRule(rule);
        trainingSet.push(shot);
      }
    });
    
    return trainingSet;
  }

  generateRealisticShot(qualityRange, variation) {
    const baseQuality = qualityRange[0] + Math.random() * (qualityRange[1] - qualityRange[0]);
    const variationFactor = variation === 'low' ? 0.1 : variation === 'medium' ? 0.3 : variation === 'high' ? 0.5 : 0.8;
    
    // Generate parameters that correlate with quality
    const grindSize = this.generateCorrelatedValue(15, baseQuality, variationFactor, 5, 25);
    const inWeight = this.generateCorrelatedValue(18, baseQuality, variationFactor, 16, 20);
    const extractionTime = this.generateCorrelatedValue(28, baseQuality, variationFactor, 20, 35);
    const temperature = this.generateCorrelatedValue(93, baseQuality, variationFactor, 90, 96);
    const daysPastRoast = Math.floor(Math.random() * 30) + 5;
    
    // Calculate derived values
    const outWeight = inWeight * (1.8 + Math.random() * 0.7); // Realistic ratio
    const ratio = outWeight / inWeight;
    const flowRate = outWeight / extractionTime;
    
    // Generate taste profile based on quality and parameters
    const tasteProfile = this.generateCorrelatedTasteProfile(baseQuality, {
      grindSize, extractionTime, temperature, ratio
    });
    
    return {
      grindSize,
      inWeight,
      outWeight,
      extractionTime,
      temperature,
      daysPastRoast,
      shotQuality: Math.round(baseQuality * 10) / 10,
      tasteProfile,
      ratio,
      flowRate,
      
      // Advanced parameters
      roastLevel: this.getRandomRoastLevel(),
      processMethod: this.getRandomProcessMethod(),
      usedPuckScreen: Math.random() > 0.7,
      usedWDT: Math.random() > 0.6,
      distributionTechnique: this.getRandomDistributionTechnique(),
      usedPreInfusion: Math.random() > 0.5,
      preInfusionTime: Math.random() > 0.5 ? Math.random() * 8 + 2 : 0,
      preInfusionPressure: Math.random() > 0.5 ? Math.random() * 2 + 3 : 0,
      
      // Environmental factors
      humidity: 45 + Math.random() * 20,
      pressure: 9 + (Math.random() - 0.5) * 0.5,
      
      // User satisfaction
      tasteMetExpectations: baseQuality > 6,
      targetProfile: this.getRandomTargetProfile(),
      
      // Metadata
      isSynthetic: true,
      generatedAt: new Date().toISOString()
    };
  }

  generateCorrelatedValue(ideal, quality, variation, min, max) {
    // Generate values that correlate with quality
    const qualityFactor = (quality - 5) / 5; // -1 to 1
    const baseValue = ideal + qualityFactor * variation * ideal;
    const randomVariation = (Math.random() - 0.5) * variation * ideal;
    const finalValue = baseValue + randomVariation;
    
    return Math.max(min, Math.min(max, finalValue));
  }

  generateCorrelatedTasteProfile(quality, params) {
    const { grindSize, extractionTime, temperature, ratio } = params;
    
    // Base taste profile
    let sweetness = 3;
    let acidity = 3;
    let bitterness = 3;
    let body = 3;
    
    // Adjust based on parameters
    if (extractionTime < 25) {
      acidity += 1;
      sweetness -= 0.5;
    } else if (extractionTime > 32) {
      bitterness += 1;
      sweetness -= 0.5;
    }
    
    if (ratio < 1.8) {
      body += 1;
      bitterness += 0.5;
    } else if (ratio > 2.2) {
      body -= 1;
      acidity += 0.5;
    }
    
    if (temperature > 94) {
      bitterness += 0.5;
    } else if (temperature < 91) {
      acidity += 0.5;
    }
    
    // Adjust based on quality
    const qualityAdjustment = (quality - 5) / 5;
    sweetness += qualityAdjustment * 0.5;
    bitterness -= qualityAdjustment * 0.3;
    body += qualityAdjustment * 0.3;
    
    return {
      sweetness: Math.max(1, Math.min(5, Math.round(sweetness * 10) / 10)),
      acidity: Math.max(1, Math.min(5, Math.round(acidity * 10) / 10)),
      bitterness: Math.max(1, Math.min(5, Math.round(bitterness * 10) / 10)),
      body: Math.max(1, Math.min(5, Math.round(body * 10) / 10))
    };
  }

  generateShotFromAdvancedRule(rule) {
    const shot = this.generateRealisticShot([3, 5], 'high');
    
    // Apply rule conditions more intelligently
    Object.keys(rule.conditions).forEach(param => {
      const condition = rule.conditions[param];
      if (param === 'tasteProfile') {
        Object.keys(condition).forEach(taste => {
          const tasteCondition = condition[taste];
          if (tasteCondition.min !== undefined) {
            shot.tasteProfile[taste] = tasteCondition.min + Math.random() * 1.5;
          }
          if (tasteCondition.max !== undefined) {
            shot.tasteProfile[taste] = tasteCondition.max - Math.random() * 1.5;
          }
        });
      } else {
        if (condition.min !== undefined) {
          shot[param] = condition.min + Math.random() * 3;
        }
        if (condition.max !== undefined) {
          shot[param] = condition.max - Math.random() * 3;
        }
      }
    });
    
    // Recalculate derived values
    shot.ratio = shot.outWeight / shot.inWeight;
    shot.flowRate = shot.outWeight / shot.extractionTime;
    
    shot.expectedDiagnosis = rule.diagnosis;
    shot.expectedRecommendations = rule.recommendations;
    
    return shot;
  }

  async prepareAdvancedTrainingData(data) {
    const features = [];
    const labels = [];
    const validationIndices = [];
    
    // Shuffle data
    const shuffledData = [...data].sort(() => Math.random() - 0.5);
    
    data.forEach((shot, index) => {
      // Extract comprehensive features
      const feature = this.extractAdvancedFeatures(shot);
      features.push(feature);
      
      // Normalize quality label (0-1)
      labels.push([(shot.shotQuality - 1) / 9]);
      
      // Mark validation samples (20% of data)
      if (Math.random() < 0.2) {
        validationIndices.push(index);
      }
    });
    
    // Ensure we have at least some validation data but not too much
    if (validationIndices.length === 0 && data.length > 5) {
      validationIndices.push(Math.floor(data.length * 0.8)); // Add one validation sample
    }
    
    return {
      features: tf.tensor2d(features),
      labels: tf.tensor2d(labels),
      validationSplit: validationIndices
    };
  }

  extractAdvancedFeatures(shot) {
    const ratio = shot.outWeight / shot.inWeight;
    const flowRate = shot.outWeight / shot.extractionTime;
    
    return [
      // Core parameters
      shot.grindSize,
      shot.inWeight,
      shot.outWeight,
      shot.extractionTime,
      shot.temperature || 93,
      shot.daysPastRoast || 10,
      
      // Taste profile
      shot.tasteProfile?.sweetness || 3,
      shot.tasteProfile?.acidity || 3,
      shot.tasteProfile?.bitterness || 3,
      shot.tasteProfile?.body || 3,
      
      // Derived values
      ratio,
      flowRate,
      shot.extractionYield || 0,
      
      // Bean characteristics
      this.encodeRoastLevel(shot.roastLevel || 'medium'),
      this.encodeProcessMethod(shot.processMethod || 'washed'),
      
      // Preparation techniques
      shot.usedPuckScreen ? 1 : 0,
      shot.usedWDT ? 1 : 0,
      this.encodeDistributionTechnique(shot.distributionTechnique || 'none'),
      
      // Pre-infusion
      shot.usedPreInfusion ? 1 : 0,
      shot.preInfusionTime || 0,
      shot.preInfusionPressure || 0,
      
      // Environmental factors
      shot.humidity || 50,
      shot.pressure || 9,
      
      // User satisfaction
      shot.tasteMetExpectations ? 1 : 0,
      this.encodeTargetProfile(shot.targetProfile || 'balanced')
    ];
  }

  computeAdvancedFeatureStats(features) {
    const data = features.arraySync();
    const numFeatures = data[0].length;
    
    this.featureStats.mean = [];
    this.featureStats.std = [];
    this.featureStats.min = [];
    this.featureStats.max = [];
    this.featureStats.percentiles.p25 = [];
    this.featureStats.percentiles.p50 = [];
    this.featureStats.percentiles.p75 = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const values = data.map(row => row[i]).sort((a, b) => a - b);
      const n = values.length;
      
      const mean = values.reduce((sum, val) => sum + val, 0) / n;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      
      this.featureStats.mean.push(mean);
      this.featureStats.std.push(std || 1);
      this.featureStats.min.push(values[0]);
      this.featureStats.max.push(values[n - 1]);
      this.featureStats.percentiles.p25.push(values[Math.floor(n * 0.25)]);
      this.featureStats.percentiles.p50.push(values[Math.floor(n * 0.5)]);
      this.featureStats.percentiles.p75.push(values[Math.floor(n * 0.75)]);
    }
  }

  robustNormalizeFeatures(features) {
    const meanTensor = tf.tensor1d(this.featureStats.mean);
    const stdTensor = tf.tensor1d(this.featureStats.std);
    
    return features.sub(meanTensor).div(stdTensor);
  }

  createAdvancedModel() {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      inputShape: [this.modelConfig.inputFeatures],
      units: this.modelConfig.hiddenLayers[0],
      activation: 'relu',
      kernelInitializer: 'heNormal',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));
    model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRates[0] }));
    
    // Hidden layers
    for (let i = 1; i < this.modelConfig.hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: this.modelConfig.hiddenLayers[i],
        activation: 'relu',
        kernelInitializer: 'heNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
      }));
      model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRates[i] || 0.1 }));
    }
    
    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile with advanced optimizer
    model.compile({
      optimizer: tf.train.adam(this.modelConfig.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse']
    });
    
    return model;
  }

  async trainAdvancedModel(features, labels, validationIndices) {
    console.log('🏋️ Training advanced AI model...');
    
    this.isTraining = true;
    
    // Split data for validation
    const allIndices = Array.from({length: features.shape[0]}, (_, i) => i);
    const trainIndices = allIndices.filter(i => !validationIndices.includes(i));
    
    const trainFeatures = features.gather(tf.tensor1d(trainIndices, 'int32'));
    const trainLabels = labels.gather(tf.tensor1d(trainIndices, 'int32'));
    const valFeatures = features.gather(tf.tensor1d(validationIndices, 'int32'));
    const valLabels = labels.gather(tf.tensor1d(validationIndices, 'int32'));
    
    const history = await this.model.fit(trainFeatures, trainLabels, {
      epochs: this.modelConfig.epochs,
      batchSize: this.modelConfig.batchSize,
      validationData: [valFeatures, valLabels],
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          // Update training status with epoch progress
          const epochProgress = (epoch + 1) / this.modelConfig.epochs;
          const overallProgress = 60 + (epochProgress * 30); // 60-90% range for training
          
          // Track training history for early stopping
          if (!Array.isArray(this.trainingHistory)) {
            this.trainingHistory = [];
          }
          this.trainingHistory.push({
            epoch: epoch + 1,
            loss: logs.loss,
            val_loss: logs.val_loss
          });

          // Safe value extraction with null checks
          const loss = logs.loss || 0;
          const valLoss = logs.val_loss || 0;
          
          this.updateStatus({
            epoch: epoch + 1,
            loss: loss,
            valLoss: valLoss,
            progress: Math.round(overallProgress),
            message: `Training epoch ${epoch + 1}/${this.modelConfig.epochs} - Loss: ${loss.toFixed(4)}, Val Loss: ${valLoss.toFixed(4)}`
          });
          
          if (epoch % 50 === 0) {
            console.log(`Epoch ${epoch}: loss = ${loss.toFixed(4)}, val_loss = ${valLoss.toFixed(4)}`);
          }
          
          // Early stopping - only check after enough epochs and if validation loss is available
          if (epoch > 50 && valLoss > 0 && this.trainingHistory.length >= this.modelConfig.earlyStopping.patience) {
            const recentLosses = this.trainingHistory.slice(-this.modelConfig.earlyStopping.patience);
            const bestRecentLoss = Math.min(...recentLosses.map(l => l.val_loss));
            
            // Only stop if validation loss hasn't improved significantly
            if (valLoss > bestRecentLoss + this.modelConfig.earlyStopping.minDelta) {
              console.log(`Early stopping at epoch ${epoch} - val_loss: ${valLoss.toFixed(4)}, best recent: ${bestRecentLoss.toFixed(4)}`);
              this.model.stopTraining = true;
            }
          }
        }
      }
    });
    
    // Training history is already tracked in the epoch callback
    console.log(`Training completed with ${this.trainingHistory.length} epochs recorded`);
    this.isTraining = false;
    
    console.log('✅ Advanced training completed!');
  }

  async evaluateModel() {
    if (!this.model || this.userDataHistory.length === 0) return;
    
    try {
      // Use recent user data for evaluation
      const recentData = this.userDataHistory.slice(-20); // Last 20 shots
      if (recentData.length === 0) return; // No data to evaluate
      
      const { features, labels } = await this.prepareAdvancedTrainingData(recentData);
      
      const normalizedFeatures = this.robustNormalizeFeatures(features);
      const predictions = this.model.predict(normalizedFeatures);
      const predictedValues = await predictions.data();
      const actualValues = await labels.data();
      
      // Calculate metrics
      const mae = this.calculateMAE(predictedValues, actualValues);
      const rmse = this.calculateRMSE(predictedValues, actualValues);
      const r2 = this.calculateR2(predictedValues, actualValues);
      
      this.performanceMetrics = {
        accuracy: 1 - mae, // Approximate accuracy
        mae,
        rmse,
        r2,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`📊 Model Performance: MAE=${mae.toFixed(3)}, RMSE=${rmse.toFixed(3)}, R²=${r2.toFixed(3)}`);
      
      // Clean up tensors
      features.dispose();
      labels.dispose();
      normalizedFeatures.dispose();
      predictions.dispose();
      
    } catch (error) {
      console.error('Error evaluating model:', error);
    }
  }

  calculateMAE(predicted, actual) {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      sum += Math.abs(predicted[i] - actual[i]);
    }
    return sum / predicted.length;
  }

  calculateRMSE(predicted, actual) {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      sum += Math.pow(predicted[i] - actual[i], 2);
    }
    return Math.sqrt(sum / predicted.length);
  }

  calculateR2(predicted, actual) {
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < predicted.length; i++) {
      ssRes += Math.pow(actual[i] - predicted[i], 2);
      ssTot += Math.pow(actual[i] - actualMean, 2);
    }
    
    return 1 - (ssRes / ssTot);
  }

  // Enhanced analysis method
  async analyzeShot(shotData) {
    if (!this.isReady) {
      return this.fallbackAnalysis(shotData);
    }

    try {
      // Extract features
      const features = this.extractAdvancedFeatures(shotData);
      const normalizedFeatures = this.robustNormalizeFeatures(tf.tensor2d([features]));
      
      // Predict quality
      const prediction = this.model.predict(normalizedFeatures);
      const predictedQuality = await prediction.data();
      const qualityScore = Math.round((predictedQuality[0] * 9) + 1);
      
      // Generate intelligent recommendations
      const recommendations = await this.generateIntelligentRecommendations(shotData, qualityScore);
      
      // Calculate confidence based on data similarity
      const confidence = this.calculateAdvancedConfidence(shotData, features);
      
      // Clean up tensors
      normalizedFeatures.dispose();
      prediction.dispose();
      
      const aiResponse = {
        predictedQuality: qualityScore,
        currentQuality: shotData.shotQuality || 5,
        recommendations,
        analysis: this.getDetailedAnalysis(shotData, shotData.outWeight / shotData.inWeight, shotData.outWeight / shotData.extractionTime),
        confidence,
        timestamp: new Date().toISOString(),
        shotId: shotData._id || 'latest',
        modelVersion: this.modelVersion,
        performanceMetrics: this.performanceMetrics
      };
      
      // Save AI response
      this.saveLastAIResponse(aiResponse);
      
      return aiResponse;
      
    } catch (error) {
      console.error('Error in advanced AI analysis:', error);
      return this.fallbackAnalysis(shotData);
    }
  }

  async generateIntelligentRecommendations(shotData, predictedQuality) {
    const recommendations = [];
    const ratio = shotData.outWeight / shotData.inWeight;
    const flowRate = shotData.outWeight / shotData.extractionTime;
    
    // Use machine learning insights combined with domain knowledge
    const issues = this.identifyIssues(shotData, ratio, flowRate, predictedQuality);
    
    // Prioritize recommendations based on impact and feasibility
    const prioritizedIssues = issues.sort((a, b) => b.impact * b.feasibility - a.impact * a.feasibility);
    
    // Generate contextual recommendations
    prioritizedIssues.slice(0, 4).forEach(issue => {
      recommendations.push({
        type: issue.type,
        action: issue.recommendation,
        priority: issue.priority,
        expectedImprovement: issue.expectedImprovement,
        confidence: issue.confidence,
        reasoning: issue.reasoning
      });
    });
    
    return recommendations;
  }

  identifyIssues(shotData, ratio, flowRate, predictedQuality) {
    const issues = [];
    
    // Extraction time issues
    if (shotData.extractionTime < 22) {
      issues.push({
        type: 'grind',
        recommendation: `Grind finer (current: ${shotData.grindSize}) - extraction too fast (${shotData.extractionTime}s)`,
        priority: 'high',
        impact: 0.8,
        feasibility: 0.9,
        confidence: 0.9,
        expectedImprovement: '+2-3 quality points',
        reasoning: 'Fast extraction typically indicates under-extraction and sourness'
      });
    } else if (shotData.extractionTime > 35) {
      issues.push({
        type: 'grind',
        recommendation: `Grind coarser (current: ${shotData.grindSize}) - extraction too slow (${shotData.extractionTime}s)`,
        priority: 'high',
        impact: 0.7,
        feasibility: 0.9,
        confidence: 0.9,
        expectedImprovement: '+1-2 quality points',
        reasoning: 'Slow extraction often leads to over-extraction and bitterness'
      });
    }
    
    // Ratio issues
    if (ratio < 1.8) {
      issues.push({
        type: 'ratio',
        recommendation: `Increase output weight or decrease dose - current ratio ${ratio.toFixed(2)}:1 is too concentrated`,
        priority: 'medium',
        impact: 0.6,
        feasibility: 0.8,
        confidence: 0.8,
        expectedImprovement: '+1-2 quality points',
        reasoning: 'Low ratios can result in overly strong, bitter shots'
      });
    } else if (ratio > 2.5) {
      issues.push({
        type: 'ratio',
        recommendation: `Decrease output weight or increase dose - current ratio ${ratio.toFixed(2)}:1 may be too weak`,
        priority: 'medium',
        impact: 0.5,
        feasibility: 0.8,
        confidence: 0.8,
        expectedImprovement: '+1 quality point',
        reasoning: 'High ratios can lead to watery, under-extracted shots'
      });
    }
    
    // Temperature issues
    if (shotData.temperature && shotData.temperature < 90) {
      issues.push({
        type: 'temperature',
        recommendation: `Increase temperature to 92-94°C (current: ${shotData.temperature}°C)`,
        priority: 'medium',
        impact: 0.4,
        feasibility: 0.9,
        confidence: 0.7,
        expectedImprovement: '+0.5-1 quality point',
        reasoning: 'Low temperature can cause under-extraction'
      });
    }
    
    // Taste profile issues
    if (shotData.tasteProfile) {
      const { sweetness, acidity, bitterness, body } = shotData.tasteProfile;
      
      if (acidity >= 4 && sweetness <= 2) {
        issues.push({
          type: 'extraction',
          recommendation: 'Increase extraction to reduce sourness - try grinding finer or raising temperature',
          priority: 'high',
          impact: 0.7,
          feasibility: 0.8,
          confidence: 0.8,
          expectedImprovement: 'Better balance, sweeter shot',
          reasoning: 'High acidity with low sweetness indicates under-extraction'
        });
      }
      
      if (bitterness >= 4 && sweetness <= 2) {
        issues.push({
          type: 'extraction',
          recommendation: 'Reduce extraction to decrease bitterness - try grinding coarser or lowering temperature',
          priority: 'high',
          impact: 0.7,
          feasibility: 0.8,
          confidence: 0.8,
          expectedImprovement: 'Less bitter, more balanced',
          reasoning: 'High bitterness with low sweetness indicates over-extraction'
        });
      }
    }
    
    return issues;
  }

  calculateAdvancedConfidence(shotData, features) {
    let confidence = 0.6; // Base confidence
    
    // Increase confidence based on data completeness
    const completenessFactors = [
      { field: 'temperature', weight: 0.1 },
      { field: 'daysPastRoast', weight: 0.1 },
      { field: 'tasteProfile', weight: 0.15 },
      { field: 'usedPreInfusion', weight: 0.05 },
      { field: 'humidity', weight: 0.05 }
    ];
    
    completenessFactors.forEach(factor => {
      if (shotData[factor.field] !== undefined && shotData[factor.field] !== null) {
        confidence += factor.weight;
      }
    });
    
    // Adjust confidence based on parameter ranges
    if (shotData.extractionTime >= 20 && shotData.extractionTime <= 40) confidence += 0.05;
    if (shotData.grindSize >= 8 && shotData.grindSize <= 25) confidence += 0.05;
    
    // Adjust based on model performance
    if (this.performanceMetrics.accuracy > 0.8) confidence += 0.1;
    else if (this.performanceMetrics.accuracy < 0.6) confidence -= 0.1;
    
    return Math.min(confidence, 0.95);
  }

  // Data collection methods
  async addUserData(shotData) {
    try {
      // Validate shot data
      if (!shotData.shotQuality || !shotData.grindSize || !shotData.inWeight || !shotData.outWeight) {
        throw new Error('Invalid shot data: missing required fields');
      }
      
      // Add metadata
      const enrichedData = {
        ...shotData,
        addedAt: new Date().toISOString(),
        isUserData: true
      };
      
      this.userDataHistory.push(enrichedData);
      
      // Keep only recent data (last 1000 shots)
      if (this.userDataHistory.length > 1000) {
        this.userDataHistory = this.userDataHistory.slice(-1000);
      }
      
      // Save to localStorage
      await this.saveUserData();
      
      // Trigger incremental learning if we have enough new data
      if (this.userDataHistory.length % 50 === 0) {
        await this.incrementalLearning();
      }
      
      console.log(`📚 Added user data point. Total: ${this.userDataHistory.length}`);
      
    } catch (error) {
      console.error('Error adding user data:', error);
    }
  }

  async incrementalLearning() {
    if (!this.model || this.isTraining || this.userDataHistory.length < 50) return;
    
    console.log('🔄 Performing incremental learning...');
    
    try {
      // Use recent user data for incremental training
      const recentData = this.userDataHistory.slice(-100);
      const { features, labels } = await this.prepareAdvancedTrainingData(recentData);
      
      const normalizedFeatures = this.robustNormalizeFeatures(features);
      
      // Fine-tune the model with new data
      await this.model.fit(normalizedFeatures, labels, {
        epochs: 50,
        batchSize: 8,
        verbose: 0
      });
      
      // Update performance metrics
      await this.evaluateModel();
      
      // Save updated model
      await this.saveModel();
      
      console.log('✅ Incremental learning completed');
      
      // Clean up tensors
      features.dispose();
      labels.dispose();
      normalizedFeatures.dispose();
      
    } catch (error) {
      console.error('Error in incremental learning:', error);
    }
  }

  // Utility methods
  encodeRoastLevel(roastLevel) {
    const mapping = {
      'light': 1, 'light-medium': 2, 'medium': 3, 'medium-dark': 4, 'dark': 5
    };
    return mapping[roastLevel] || 3;
  }
  
  encodeProcessMethod(processMethod) {
    const mapping = {
      'washed': 1, 'natural': 2, 'honey': 3, 'semi-washed': 4, 'other': 5
    };
    return mapping[processMethod] || 1;
  }
  
  encodeDistributionTechnique(technique) {
    const mapping = {
      'none': 0, 'tap-only': 1, 'distribution-tool': 2, 'wdt': 3, 'wdt-plus-distribution': 4
    };
    return mapping[technique] || 0;
  }
  
  encodeTargetProfile(profile) {
    const mapping = {
      'balanced': 1, 'bright': 2, 'sweet': 3, 'strong': 4, 'fruity': 5, 'chocolatey': 6, 'custom': 7
    };
    return mapping[profile] || 1;
  }

  getRandomRoastLevel() {
    const levels = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  getRandomProcessMethod() {
    const methods = ['washed', 'natural', 'honey', 'semi-washed', 'other'];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  getRandomDistributionTechnique() {
    const techniques = ['none', 'tap-only', 'distribution-tool', 'wdt', 'wdt-plus-distribution'];
    return techniques[Math.floor(Math.random() * techniques.length)];
  }

  getRandomTargetProfile() {
    const profiles = ['balanced', 'bright', 'sweet', 'strong', 'fruity', 'chocolatey'];
    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  // Fallback analysis (same as before but enhanced)
  fallbackAnalysis(shotData) {
    console.log('Using enhanced rule-based fallback analysis');
    
    const ratio = shotData.outWeight / shotData.inWeight;
    const flowRate = shotData.outWeight / shotData.extractionTime;
    
    const matchingRules = TROUBLESHOOTING_RULES
      .filter(rule => this.checkRuleConditions(rule.conditions, shotData, ratio, flowRate))
      .sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));
    
    if (matchingRules.length > 0) {
      const bestRule = matchingRules[0];
      return {
        predictedQuality: Math.max(1, (shotData.shotQuality || 5) - 1),
        currentQuality: shotData.shotQuality || 5,
        recommendations: bestRule.recommendations.map(rec => ({
          type: 'adjustment',
          action: rec,
          priority: 'medium',
          expectedImprovement: 'Rule-based recommendation',
          confidence: bestRule.confidence || 0.7
        })),
        analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
        confidence: bestRule.confidence || 0.7,
        diagnosis: bestRule.diagnosis,
        modelVersion: 'fallback'
      };
    }
    
    return {
      predictedQuality: shotData.shotQuality || 5,
      currentQuality: shotData.shotQuality || 5,
      recommendations: [{
        type: 'general',
        action: 'Continue experimenting with small adjustments to grind size and dose',
        priority: 'low',
        expectedImprovement: 'Gradual improvement',
        confidence: 0.5
      }],
      analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
      confidence: 0.5,
      modelVersion: 'fallback'
    };
  }

  checkRuleConditions(conditions, shotData, ratio, flowRate) {
    for (const [param, condition] of Object.entries(conditions)) {
      let value;
      
      if (param === 'ratio') {
        value = ratio;
      } else if (param === 'flowRate') {
        value = flowRate;
      } else if (param === 'tasteProfile') {
        for (const [tasteProp, tasteCondition] of Object.entries(condition)) {
          const tasteValue = shotData.tasteProfile?.[tasteProp];
          if (!tasteValue) continue;
          
          if (tasteCondition.min && tasteValue < tasteCondition.min) return false;
          if (tasteCondition.max && tasteValue > tasteCondition.max) return false;
        }
        continue;
      } else {
        value = shotData[param];
      }
      
      if (!value && value !== 0) continue;
      
      if (condition.min && value < condition.min) return false;
      if (condition.max && value > condition.max) return false;
    }
    
    return true;
  }

  getDetailedAnalysis(shotData, ratio, flowRate) {
    const analysis = {};
    
    // Ratio analysis
    if (ratio >= IDEAL_PARAMETERS.ratio.min && ratio <= IDEAL_PARAMETERS.ratio.max) {
      analysis.ratio = { status: 'good', message: `Great ratio of ${ratio.toFixed(2)}:1` };
    } else if (ratio < IDEAL_PARAMETERS.ratio.min) {
      analysis.ratio = { status: 'warning', message: `Ratio is low (${ratio.toFixed(2)}:1) - might be too concentrated` };
    } else {
      analysis.ratio = { status: 'warning', message: `Ratio is high (${ratio.toFixed(2)}:1) - might be too weak` };
    }
    
    // Extraction time analysis
    if (shotData.extractionTime >= IDEAL_PARAMETERS.extractionTime.min && 
        shotData.extractionTime <= IDEAL_PARAMETERS.extractionTime.max) {
      analysis.extractionTime = { status: 'good', message: `Perfect extraction time (${shotData.extractionTime}s)` };
    } else {
      analysis.extractionTime = { 
        status: 'warning', 
        message: `Extraction time (${shotData.extractionTime}s) is outside ideal range (${IDEAL_PARAMETERS.extractionTime.min}-${IDEAL_PARAMETERS.extractionTime.max}s)` 
      };
    }
    
    // Flow rate analysis
    if (flowRate >= IDEAL_PARAMETERS.flowRate.min && flowRate <= IDEAL_PARAMETERS.flowRate.max) {
      analysis.flowRate = { status: 'good', message: `Good flow rate (${flowRate.toFixed(2)} ml/s)` };
    } else {
      analysis.flowRate = { 
        status: 'warning', 
        message: `Flow rate (${flowRate.toFixed(2)} ml/s) needs adjustment` 
      };
    }
    
    return analysis;
  }

  // Persistence methods
  async saveModel() {
    try {
      await this.model.save('localstorage://advanced-espresso-ai-model');
      localStorage.setItem('advanced-espresso-ai-features', JSON.stringify(this.featureStats));
      localStorage.setItem('advanced-espresso-ai-config', JSON.stringify(this.modelConfig));
      localStorage.setItem('advanced-espresso-ai-performance', JSON.stringify(this.performanceMetrics));
      console.log('💾 Advanced model saved to localStorage');
    } catch (error) {
      console.error('Error saving advanced model:', error);
    }
  }

  async loadModel() {
    try {
      const model = await tf.loadLayersModel('localstorage://advanced-espresso-ai-model');
      const featureStats = JSON.parse(localStorage.getItem('advanced-espresso-ai-features'));
      const modelConfig = JSON.parse(localStorage.getItem('advanced-espresso-ai-config'));
      const performanceMetrics = JSON.parse(localStorage.getItem('advanced-espresso-ai-performance'));
      
      if (featureStats) this.featureStats = featureStats;
      if (modelConfig) this.modelConfig = modelConfig;
      if (performanceMetrics) this.performanceMetrics = performanceMetrics;
      
      return model;
    } catch (error) {
      console.log('No existing advanced model found, will create new one');
      return null;
    }
  }

  async saveUserData() {
    try {
      localStorage.setItem('advanced-espresso-ai-user-data', JSON.stringify(this.userDataHistory));
      console.log('💾 User data saved to localStorage');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  async loadUserData() {
    try {
      const userData = JSON.parse(localStorage.getItem('advanced-espresso-ai-user-data'));
      return userData || [];
    } catch (error) {
      console.log('No existing user data found');
      return [];
    }
  }

  saveLastAIResponse(aiResponse) {
    try {
      localStorage.setItem('advanced-espresso-ai-last-response', JSON.stringify(aiResponse));
      console.log('💾 Advanced AI response saved to localStorage');
    } catch (error) {
      console.error('Error saving AI response:', error);
    }
  }
  
  getLastAIResponse() {
    try {
      const stored = localStorage.getItem('advanced-espresso-ai-last-response');
      if (stored) {
        const response = JSON.parse(stored);
        const responseAge = Date.now() - new Date(response.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (responseAge < maxAge) {
          return response;
        } else {
          localStorage.removeItem('advanced-espresso-ai-last-response');
        }
      }
    } catch (error) {
      console.error('Error loading AI response:', error);
    }
    return null;
  }

  getModelInfo() {
    return {
      isReady: this.isReady,
      isTraining: this.isTraining,
      hasModel: !!this.model,
      modelVersion: this.modelVersion,
      userDataCount: this.userDataHistory.length,
      performanceMetrics: this.performanceMetrics,
      trainingHistory: this.trainingHistory
    };
  }

  // Public API for external training
  async retrainWithNewData(newShotData) {
    if (!newShotData || !Array.isArray(newShotData)) {
      throw new Error('Invalid training data provided');
    }
    
    console.log(`🔄 Retraining model with ${newShotData.length} new data points...`);
    
    // Add new data to history
    newShotData.forEach(shot => {
      this.userDataHistory.push({
        ...shot,
        addedAt: new Date().toISOString(),
        isUserData: true
      });
    });
    
    // Retrain the model
    await this.createAndTrainAdvancedModel();
    
    return this.getModelInfo();
  }
}

// Singleton instance
let advancedEspressoAI = null;

export const getAdvancedEspressoAI = () => {
  if (!advancedEspressoAI) {
    advancedEspressoAI = new AdvancedEspressoAI();
  }
  return advancedEspressoAI;
};

export default AdvancedEspressoAI;
