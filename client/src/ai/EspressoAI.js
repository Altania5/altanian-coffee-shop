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
      // Extract features (input variables) - Enhanced with new parameters
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
        shot.outWeight / shot.extractionTime, // flow rate
        
        // NEW: Roast level encoding (1=light, 2=light-medium, 3=medium, 4=medium-dark, 5=dark)
        this.encodeRoastLevel(shot.roastLevel || 'medium'),
        
        // NEW: Process method encoding (1=washed, 2=natural, 3=honey, 4=semi-washed, 5=other)
        this.encodeProcessMethod(shot.processMethod || 'washed'),
        
        // NEW: Preparation technique features
        shot.usedPuckScreen ? 1 : 0,
        shot.usedWDT ? 1 : 0,
        this.encodeDistributionTechnique(shot.distributionTechnique || 'none'),
        
        // NEW: Pre-infusion parameters
        shot.usedPreInfusion ? 1 : 0,
        shot.preInfusionTime || 0,
        shot.preInfusionPressure || 0
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

  // Encoding methods for new parameters
  encodeRoastLevel(roastLevel) {
    const mapping = {
      'light': 1,
      'light-medium': 2,
      'medium': 3,
      'medium-dark': 4,
      'dark': 5
    };
    return mapping[roastLevel] || 3; // default to medium
  }
  
  encodeProcessMethod(processMethod) {
    const mapping = {
      'washed': 1,
      'natural': 2,
      'honey': 3,
      'semi-washed': 4,
      'other': 5
    };
    return mapping[processMethod] || 1; // default to washed
  }
  
  encodeDistributionTechnique(technique) {
    const mapping = {
      'none': 0,
      'tap-only': 1,
      'distribution-tool': 2,
      'wdt': 3,
      'wdt-plus-distribution': 4
    };
    return mapping[technique] || 0; // default to none
  }

  createModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [20], // Updated from 17 to 20 input features (added pre-infusion)
          units: 48, // Increased capacity for more complex patterns
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
      
      // Prepare features - Enhanced with new parameters
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
        flowRate,
        
        // NEW: Enhanced parameters
        this.encodeRoastLevel(shotData.roastLevel || 'medium'),
        this.encodeProcessMethod(shotData.processMethod || 'washed'),
        shotData.usedPuckScreen ? 1 : 0,
        shotData.usedWDT ? 1 : 0,
        this.encodeDistributionTechnique(shotData.distributionTechnique || 'none'),
        
        // NEW: Pre-infusion parameters
        shotData.usedPreInfusion ? 1 : 0,
        shotData.preInfusionTime || 0,
        shotData.preInfusionPressure || 0
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
      
      const aiResponse = {
        predictedQuality: qualityScore,
        currentQuality: shotData.shotQuality || 5,
        recommendations,
        analysis: this.getDetailedAnalysis(shotData, ratio, flowRate),
        confidence: this.calculateConfidence(shotData),
        timestamp: new Date().toISOString(),
        shotId: shotData._id || 'latest'
      };
      
      // Save AI response to localStorage for persistence
      this.saveLastAIResponse(aiResponse);
      
      return aiResponse;
      
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
    
    // NEW: Roast level specific recommendations
    if (shotData.roastLevel) {
      if (shotData.roastLevel === 'light' && extractionTime < 30) {
        recommendations.push({
          type: 'technique',
          action: 'Light roasts need longer extraction - try grinding finer or increasing temperature to 94-96°C',
          priority: 'high',
          expectedImprovement: '+2-3 quality points'
        });
      } else if (shotData.roastLevel === 'dark' && extractionTime > 25) {
        recommendations.push({
          type: 'technique',
          action: 'Dark roasts extract faster - try grinding coarser or lowering temperature to 90-92°C',
          priority: 'medium',
          expectedImprovement: '+1-2 quality points'
        });
      }
    }
    
    // NEW: Process method specific recommendations  
    if (shotData.processMethod === 'natural' && shotData.tasteProfile?.sweetness <= 2) {
      recommendations.push({
        type: 'extraction',
        action: 'Natural process beans are inherently sweet - try longer extraction to bring out sweetness',
        priority: 'medium',
        expectedImprovement: 'Enhanced natural sweetness'
      });
    }
    
    // NEW: Preparation technique recommendations
    if (!shotData.usedWDT && (flowRate < 1.0 || flowRate > 2.5)) {
      recommendations.push({
        type: 'preparation',
        action: 'Try WDT (Weiss Distribution Technique) for more even extraction and better flow consistency',
        priority: 'medium',
        expectedImprovement: 'More even extraction, better flow'
      });
    }
    
    if (!shotData.usedPuckScreen && extractionTime < 20) {
      recommendations.push({
        type: 'equipment',
        action: 'Consider using a puck screen to slow down extraction and improve evenness',
        priority: 'low',
        expectedImprovement: 'More controlled extraction'
      });
    }
    
    // NEW: Pre-infusion specific recommendations
    if (shotData.machine === 'Meraki' && !shotData.usedPreInfusion && predictedQuality < 7) {
      recommendations.push({
        type: 'pre-infusion',
        action: 'Try pre-infusion (3-5s at 3-4 bars) - Meraki excels with pre-infusion for even saturation',
        priority: 'high',
        expectedImprovement: '+1-3 quality points'
      });
    }
    
    if (shotData.usedPreInfusion) {
      if (shotData.preInfusionTime && shotData.preInfusionTime > 8 && extractionTime > 35) {
        recommendations.push({
          type: 'pre-infusion',
          action: 'Pre-infusion time too long - reduce to 3-5s to avoid over-saturation',
          priority: 'medium',
          expectedImprovement: 'Better flow and extraction balance'
        });
      }
      
      if (shotData.preInfusionPressure && shotData.preInfusionPressure > 4.5 && flowRate > 2.0) {
        recommendations.push({
          type: 'pre-infusion',
          action: 'Pre-infusion pressure too high - reduce to 3-4 bars for gentle saturation',
          priority: 'medium',
          expectedImprovement: 'More controlled extraction start'
        });
      }
      
      if (shotData.roastLevel === 'light' && (!shotData.preInfusionTime || shotData.preInfusionTime < 4)) {
        recommendations.push({
          type: 'pre-infusion',
          action: 'Light roasts benefit from longer pre-infusion - try 4-6 seconds for better extraction',
          priority: 'medium',
          expectedImprovement: 'Enhanced sweetness and body'
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
    
    return recommendations.slice(0, 4); // Return top 4 recommendations (increased from 3)
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
    
    // NEW: Pre-infusion analysis
    if (shotData.usedPreInfusion) {
      if (shotData.preInfusionTime && shotData.preInfusionPressure) {
        if (shotData.preInfusionTime >= 3 && shotData.preInfusionTime <= 6 &&
            shotData.preInfusionPressure >= 3 && shotData.preInfusionPressure <= 4) {
          analysis.preInfusion = { 
            status: 'good', 
            message: `Optimal pre-infusion (${shotData.preInfusionTime}s at ${shotData.preInfusionPressure} bars)` 
          };
        } else {
          analysis.preInfusion = { 
            status: 'warning', 
            message: `Pre-infusion parameters may need adjustment (${shotData.preInfusionTime}s at ${shotData.preInfusionPressure} bars)` 
          };
        }
      } else {
        analysis.preInfusion = { 
          status: 'warning', 
          message: 'Pre-infusion enabled but parameters not specified' 
        };
      }
    } else if (shotData.machine === 'Meraki' && shotData.shotQuality && shotData.shotQuality < 7) {
      analysis.preInfusion = { 
        status: 'warning', 
        message: 'Consider using pre-infusion for better extraction consistency' 
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

  // AI Response Persistence Methods
  saveLastAIResponse(aiResponse) {
    try {
      localStorage.setItem('espresso-ai-last-response', JSON.stringify(aiResponse));
      console.log('💾 AI response saved to localStorage');
    } catch (error) {
      console.error('Error saving AI response:', error);
    }
  }
  
  getLastAIResponse() {
    try {
      const stored = localStorage.getItem('espresso-ai-last-response');
      if (stored) {
        const response = JSON.parse(stored);
        // Check if response is less than 24 hours old
        const responseAge = Date.now() - new Date(response.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (responseAge < maxAge) {
          return response;
        } else {
          // Clean up old response
          localStorage.removeItem('espresso-ai-last-response');
        }
      }
    } catch (error) {
      console.error('Error loading AI response:', error);
    }
    return null;
  }
  
  clearLastAIResponse() {
    localStorage.removeItem('espresso-ai-last-response');
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
