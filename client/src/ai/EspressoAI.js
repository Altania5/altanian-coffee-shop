import * as tf from '@tensorflow/tfjs';
import { IDEAL_PARAMETERS, TROUBLESHOOTING_RULES, generateTrainingData } from '../data/espressoKnowledge';

class EspressoAI {
  constructor() {
    this.model = null;
    this.isTraining = false;
    this.isReady = false;
    this.trainingHistory = [];
    
    // Feature scaling parameters (will be computed during training)
    this.featureStats = {
      mean: [],
      std: []
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Espresso AI...');
      
      // Try to load existing model from localStorage
      const savedModel = await this.loadModel();
      if (savedModel) {
        this.model = savedModel;
        this.isReady = true;
        console.log('✅ Loaded existing AI model');
      } else {
        // Create and train new model
        await this.createAndTrainModel();
      }
    } catch (error) {
      console.error('❌ Error initializing AI:', error);
      // Fallback to rule-based system
      this.isReady = true;
    }
  }

  async createAndTrainModel() {
    console.log('🧠 Creating new AI model...');
    
    // Generate training data
    const trainingData = generateTrainingData();
    console.log(`📊 Generated ${trainingData.length} training examples`);
    
    // Prepare features and labels
    const { features, labels } = this.prepareTrainingData(trainingData);
    
    // Normalize features
    this.computeFeatureStats(features);
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Create model architecture
    this.model = this.createModel();
    
    // Train the model
    await this.trainModel(normalizedFeatures, labels);
    
    // Save model
    await this.saveModel();
    
    this.isReady = true;
    console.log('✅ AI model ready!');
  }

  prepareTrainingData(data) {
    const features = [];
    const labels = [];
    
    data.forEach(shot => {
      // Extract features (input variables)
      const feature = [
        shot.grindSize,
        shot.inWeight,
        shot.outWeight,
        shot.extractionTime,
        shot.temperature || 93,
        shot.daysPastRoast || 10,
        shot.tasteProfile.sweetness,
        shot.tasteProfile.acidity,
        shot.tasteProfile.bitterness,
        shot.tasteProfile.body,
        shot.outWeight / shot.inWeight, // ratio
        shot.outWeight / shot.extractionTime // flow rate
      ];
      
      features.push(feature);
      
      // Label: shot quality (0-1 normalized)
      labels.push([(shot.shotQuality - 1) / 9]); // Normalize 1-10 to 0-1
    });
    
    return {
      features: tf.tensor2d(features),
      labels: tf.tensor2d(labels)
    };
  }

  computeFeatureStats(features) {
    const data = features.arraySync();
    const numFeatures = data[0].length;
    
    this.featureStats.mean = [];
    this.featureStats.std = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const values = data.map(row => row[i]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      this.featureStats.mean.push(mean);
      this.featureStats.std.push(std || 1); // Prevent division by zero
    }
  }

  normalizeFeatures(features) {
    const meanTensor = tf.tensor1d(this.featureStats.mean);
    const stdTensor = tf.tensor1d(this.featureStats.std);
    
    return features.sub(meanTensor).div(stdTensor);
  }

  createModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [12], // 12 input features
          units: 32,
          activation: 'relu',
          kernelInitializer: 'varianceScaling'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: 'varianceScaling'
        }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid' // Output between 0-1 for quality prediction
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    });

    return model;
  }

  async trainModel(features, labels) {
    console.log('🏋️ Training AI model...');
    
    this.isTraining = true;
    
    const history = await this.model.fit(features, labels, {
      epochs: 500,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
          }
        }
      }
    });

    this.trainingHistory = history.history;
    this.isTraining = false;
    
    console.log('✅ Training completed!');
  }

  // Main method to get AI recommendations for a coffee shot
  async analyzeShot(shotData) {
    if (!this.isReady) {
      return this.fallbackAnalysis(shotData);
    }

    try {
      // Calculate derived values
      const ratio = shotData.outWeight / shotData.inWeight;
      const flowRate = shotData.outWeight / shotData.extractionTime;
      
      // Prepare features
      const features = [
        shotData.grindSize,
        shotData.inWeight,
        shotData.outWeight,
        shotData.extractionTime,
        shotData.temperature || 93,
        shotData.daysPastRoast || 10,
        shotData.tasteProfile?.sweetness || 3,
        shotData.tasteProfile?.acidity || 3,
        shotData.tasteProfile?.bitterness || 3,
        shotData.tasteProfile?.body || 3,
        ratio,
        flowRate
      ];

      // Normalize features
      const normalizedFeatures = this.normalizeFeatures(tf.tensor2d([features]));
      
      // Predict quality
      const prediction = this.model.predict(normalizedFeatures);
      const predictedQuality = await prediction.data();
      const qualityScore = Math.round((predictedQuality[0] * 9) + 1); // Convert back to 1-10 scale
      
      // Generate recommendations based on current parameters vs ideals
      const recommendations = this.generateAIRecommendations(shotData, ratio, flowRate, qualityScore);
      
      // Clean up tensors
      normalizedFeatures.dispose();
      prediction.dispose();
      
      return {
        predictedQuality: qualityScore,
        currentQuality: shotData.shotQuality || 5,
        recommendations,
        analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
        confidence: this.calculateConfidence(shotData)
      };
      
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.fallbackAnalysis(shotData);
    }
  }

  generateAIRecommendations(shotData, ratio, flowRate, predictedQuality) {
    const recommendations = [];
    const { grindSize, extractionTime, temperature, inWeight, outWeight } = shotData;
    
    // Quality-based recommendations
    if (predictedQuality < 6) {
      // Ratio analysis
      if (ratio < IDEAL_PARAMETERS.ratio.min) {
        recommendations.push({
          type: 'grind',
          action: 'Increase output or decrease input for better balance',
          priority: 'high',
          expectedImprovement: '+1-2 quality points'
        });
      } else if (ratio > IDEAL_PARAMETERS.ratio.max) {
        recommendations.push({
          type: 'ratio',
          action: 'Reduce output or increase input - shot may be too weak',
          priority: 'high',
          expectedImprovement: '+1-2 quality points'
        });
      }
      
      // Extraction time analysis
      if (extractionTime < IDEAL_PARAMETERS.extractionTime.min) {
        recommendations.push({
          type: 'grind',
          action: `Grind finer - extraction time is too fast (${extractionTime}s vs ideal 25-30s)`,
          priority: 'high',
          expectedImprovement: '+2-3 quality points'
        });
      } else if (extractionTime > IDEAL_PARAMETERS.extractionTime.max) {
        recommendations.push({
          type: 'grind',
          action: `Grind coarser - extraction time is too slow (${extractionTime}s vs ideal 25-30s)`,
          priority: 'medium',
          expectedImprovement: '+1-2 quality points'
        });
      }
      
      // Temperature recommendations
      if (temperature < IDEAL_PARAMETERS.temperature.min) {
        recommendations.push({
          type: 'temperature',
          action: `Increase temperature by ${IDEAL_PARAMETERS.temperature.ideal - temperature}°C`,
          priority: 'medium',
          expectedImprovement: '+0.5-1 quality points'
        });
      }
    }
    
    // Advanced recommendations based on taste profile
    if (shotData.tasteProfile) {
      const taste = shotData.tasteProfile;
      
      if (taste.bitterness >= 4 && taste.sweetness <= 2) {
        recommendations.push({
          type: 'extraction',
          action: 'Reduce extraction to decrease bitterness - try grinding coarser or lowering temperature',
          priority: 'high',
          expectedImprovement: 'Better balance'
        });
      }
      
      if (taste.acidity >= 4 && taste.sweetness <= 2) {
        recommendations.push({
          type: 'extraction',
          action: 'Increase extraction to reduce sourness - try grinding finer or raising temperature',
          priority: 'high',
          expectedImprovement: 'Sweeter, more balanced shot'
        });
      }
      
      if (taste.body <= 2) {
        recommendations.push({
          type: 'dose',
          action: 'Increase dose by 0.5-1g for more body and richness',
          priority: 'medium',
          expectedImprovement: 'Fuller mouthfeel'
        });
      }
    }
    
    // Bean age recommendations
    if (shotData.daysPastRoast) {
      if (shotData.daysPastRoast < 5) {
        recommendations.push({
          type: 'timing',
          action: 'Beans are very fresh - let them rest 2-3 more days for better consistency',
          priority: 'low',
          expectedImprovement: 'More stable extractions'
        });
      } else if (shotData.daysPastRoast > 28) {
        recommendations.push({
          type: 'beans',
          action: 'Beans are aging - consider grinding finer or using fresher beans',
          priority: 'medium',
          expectedImprovement: 'Brighter, more vibrant flavors'
        });
      }
    }
    
    return recommendations.slice(0, 3); // Return top 3 recommendations
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

  calculateConfidence(shotData) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence if we have complete data
    if (shotData.temperature) confidence += 0.1;
    if (shotData.daysPastRoast) confidence += 0.1;
    if (shotData.tasteProfile && 
        shotData.tasteProfile.sweetness && 
        shotData.tasteProfile.acidity) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Fallback to rule-based analysis if AI isn't available
  fallbackAnalysis(shotData) {
    console.log('Using rule-based fallback analysis');
    
    const ratio = shotData.outWeight / shotData.inWeight;
    const flowRate = shotData.outWeight / shotData.extractionTime;
    
    // Find matching troubleshooting rules
    const matchingRules = TROUBLESHOOTING_RULES.filter(rule => 
      this.checkRuleConditions(rule.conditions, shotData, ratio, flowRate)
    );
    
    if (matchingRules.length > 0) {
      const bestRule = matchingRules[0]; // Take first matching rule
      return {
        predictedQuality: Math.max(1, (shotData.shotQuality || 5) - 1),
        currentQuality: shotData.shotQuality || 5,
        recommendations: bestRule.recommendations.map(rec => ({
          type: 'adjustment',
          action: rec,
          priority: 'medium',
          expectedImprovement: 'Rule-based recommendation'
        })),
        analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
        confidence: bestRule.confidence || 0.7,
        diagnosis: bestRule.diagnosis
      };
    }
    
    // Generic recommendations if no rules match
    return {
      predictedQuality: shotData.shotQuality || 5,
      currentQuality: shotData.shotQuality || 5,
      recommendations: [{
        type: 'general',
        action: 'Continue experimenting with small adjustments to grind size and dose',
        priority: 'low',
        expectedImprovement: 'Gradual improvement'
      }],
      analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
      confidence: 0.5
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

  async saveModel() {
    try {
      await this.model.save('localstorage://espresso-ai-model');
      localStorage.setItem('espresso-ai-features', JSON.stringify(this.featureStats));
      console.log('💾 Model saved to localStorage');
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }

  async loadModel() {
    try {
      const model = await tf.loadLayersModel('localstorage://espresso-ai-model');
      const featureStats = JSON.parse(localStorage.getItem('espresso-ai-features'));
      
      if (featureStats) {
        this.featureStats = featureStats;
      }
      
      return model;
    } catch (error) {
      console.log('No existing model found, will create new one');
      return null;
    }
  }

  // Method to retrain model with new user data
  async updateModel(newShotData) {
    if (!this.model || this.isTraining) return;
    
    // In a real implementation, you'd collect user shots over time
    // and periodically retrain with this new data
    console.log('📚 Learning from new shot data...');
    // This is a placeholder for incremental learning
  }

  getModelInfo() {
    return {
      isReady: this.isReady,
      isTraining: this.isTraining,
      hasModel: !!this.model,
      trainingHistory: this.trainingHistory
    };
  }
}

// Singleton instance
let espressoAI = null;

export const getEspressoAI = () => {
  if (!espressoAI) {
    espressoAI = new EspressoAI();
  }
  return espressoAI;
};

export default EspressoAI;
