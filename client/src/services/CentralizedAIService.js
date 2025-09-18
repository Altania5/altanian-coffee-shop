import api from '../utils/api';

class CentralizedAIService {
  constructor() {
    this.isReady = false;
    this.modelInfo = null;
    this.lastAnalysis = null;
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Centralized AI Service...');
      const response = await api.get('/ai/status');
      
      if (response.data.success) {
        this.modelInfo = response.data.data;
        this.isReady = true;
        console.log('✅ Centralized AI Service ready:', this.modelInfo);
      } else {
        console.warn('⚠️ Centralized AI Service not ready:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error initializing Centralized AI Service:', error);
      this.isReady = false;
    }
  }

  async analyzeShot(shotData) {
    if (!this.isReady) {
      console.warn('⚠️ Centralized AI Service not ready, using fallback');
      return this.fallbackAnalysis(shotData);
    }

    try {
      console.log('🔍 Analyzing shot with centralized AI...');
      const response = await api.post('/ai/analyze', shotData);
      
      if (response.data.success) {
        this.lastAnalysis = response.data.data;
        console.log('✅ Shot analysis complete:', this.lastAnalysis);
        return this.lastAnalysis;
      } else {
        console.error('❌ Analysis failed:', response.data.message);
        return this.fallbackAnalysis(shotData);
      }
    } catch (error) {
      console.error('❌ Error analyzing shot:', error);
      return this.fallbackAnalysis(shotData);
    }
  }

  fallbackAnalysis(shotData) {
    console.log('📝 Using fallback analysis');
    
    const ratio = shotData.outWeight / shotData.inWeight;
    const flowRate = shotData.outWeight / shotData.extractionTime;
    
    let predictedQuality = 5;
    const recommendations = [];
    
    // Simple rule-based analysis
    if (shotData.extractionTime >= 25 && shotData.extractionTime <= 35) {
      predictedQuality += 1;
    }
    if (ratio >= 1.8 && ratio <= 2.2) {
      predictedQuality += 1;
    }
    if (shotData.extractionTime < 22) {
      recommendations.push({
        type: 'grind',
        action: `Grind finer - extraction too fast (${shotData.extractionTime}s)`,
        priority: 'high',
        expectedImprovement: '+2-3 quality points',
        confidence: 0.8
      });
    } else if (shotData.extractionTime > 35) {
      recommendations.push({
        type: 'grind',
        action: `Grind coarser - extraction too slow (${shotData.extractionTime}s)`,
        priority: 'high',
        expectedImprovement: '+1-2 quality points',
        confidence: 0.8
      });
    }
    
    if (ratio < 1.8) {
      recommendations.push({
        type: 'ratio',
        action: `Increase output weight or decrease dose - current ratio ${ratio.toFixed(2)}:1 is too concentrated`,
        priority: 'medium',
        expectedImprovement: '+1-2 quality points',
        confidence: 0.8
      });
    } else if (ratio > 2.5) {
      recommendations.push({
        type: 'ratio',
        action: `Decrease output weight or increase dose - current ratio ${ratio.toFixed(2)}:1 may be too weak`,
        priority: 'medium',
        expectedImprovement: '+1 quality point',
        confidence: 0.8
      });
    }
    
    return {
      predictedQuality: Math.min(predictedQuality, 10),
      currentQuality: shotData.shotQuality || 5,
      recommendations,
      confidence: 0.5,
      timestamp: new Date().toISOString(),
      modelVersion: 'fallback',
      isCentralized: true,
      isFallback: true
    };
  }

  async getModelStatus() {
    try {
      const response = await api.get('/ai/status');
      if (response.data.success) {
        this.modelInfo = response.data.data;
        return this.modelInfo;
      }
    } catch (error) {
      console.error('Error getting model status:', error);
    }
    return null;
  }

  async trainModel() {
    try {
      console.log('🚀 Starting centralized model training...');
      const response = await api.post('/ai/train');
      
      if (response.data.success) {
        console.log('✅ Model training started');
        return { success: true, message: response.data.message };
      } else {
        console.error('❌ Training failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('❌ Error starting training:', error);
      return { success: false, message: 'Error starting training' };
    }
  }

  async retrainModel() {
    try {
      console.log('🔄 Starting centralized model retraining...');
      const response = await api.post('/ai/retrain');
      
      if (response.data.success) {
        console.log('✅ Model retraining started');
        return { success: true, message: response.data.message };
      } else {
        console.error('❌ Retraining failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('❌ Error starting retraining:', error);
      
      // Handle 409 Conflict (already training)
      if (error.response && error.response.status === 409) {
        return { 
          success: false, 
          message: 'AI model is already training. Please wait for current training to complete.',
          isAlreadyTraining: true
        };
      }
      
      return { success: false, message: 'Error starting retraining' };
    }
  }

  async getTrainingStatus() {
    try {
      const response = await api.get('/ai/training-status');
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Error getting training status:', error);
    }
    return null;
  }

  getLastAnalysis() {
    return this.lastAnalysis;
  }

  getModelInfo() {
    return {
      isReady: this.isReady,
      hasModel: this.modelInfo?.hasModel || false,
      modelVersion: this.modelInfo?.modelVersion || 'unknown',
      performanceMetrics: this.modelInfo?.performanceMetrics || {},
      lastTrainingDate: this.modelInfo?.lastTrainingDate,
      isCentralized: true,
      isUsingFallback: !this.isReady || !this.modelInfo?.hasModel
    };
  }
}

// Create singleton instance
const centralizedAIService = new CentralizedAIService();

// Export both the class and singleton instance
export { CentralizedAIService };
export default centralizedAIService;

// Convenience function for getting the service
export const getCentralizedAIService = () => centralizedAIService;
