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
      // Using new Python ML service endpoints
      const response = await api.get('/api/ai/status');

      if (response.data.success) {
        this.modelInfo = response.data.data;
        this.isReady = response.data.data.mlService.isHealthy;
        console.log('✅ Centralized AI Service ready (Python ML):', this.modelInfo);
        console.log('   - ML Service Health:', response.data.data.mlService.status);
        console.log('   - Models Loaded:', response.data.data.mlService.models);
        console.log('   - Training Data:', response.data.data.dataStats);
      } else {
        console.warn('⚠️ Centralized AI Service not ready:', response.data.message);
        this.isReady = false;
      }
    } catch (error) {
      console.error('❌ Error initializing Centralized AI Service:', error);
      this.isReady = false;
    }
  }

  async analyzeShot(shotData) {
    console.log('🔍 Frontend CentralizedAIService.analyzeShot called with:', shotData);

    if (!this.isReady) {
      console.warn('⚠️ Centralized AI Service not ready, using fallback');
      return this.fallbackAnalysis(shotData);
    }

    try {
      console.log('🔍 Analyzing shot with Python ML service...');
      // Using new Python ML service endpoint
      const response = await api.post('/api/ai/analyze', shotData);

      console.log('📡 Server response:', response.data);

      if (response.data.success && response.data.analysis) {
        // New response structure from Python ML service
        const analysis = response.data.analysis;

        // Store the analysis
        this.lastAnalysis = analysis;

        console.log('✅ Shot analysis complete from Python ML service:');
        console.log('   - Predicted Quality:', analysis.predictedQuality);
        console.log('   - Current Quality:', analysis.currentQuality);
        console.log('   - Confidence:', analysis.confidence);
        console.log('   - Model Version:', analysis.modelVersion);
        console.log('   - Taste Profile:', analysis.tasteProfile);
        console.log('   - Recommendations:', analysis.recommendations?.length || 0);

        return analysis;
      } else {
        console.error('❌ Analysis failed:', response.data.message);
        console.log('🔄 Falling back to frontend analysis');
        return this.fallbackAnalysis(shotData);
      }
    } catch (error) {
      console.error('❌ Error analyzing shot:', error);
      console.log('🔄 Falling back to frontend analysis due to error');
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
    
    const result = {
      predictedQuality: Math.min(predictedQuality, 10),
      currentQuality: shotData.shotQuality || 5,
      recommendations,
      confidence: 0.5,
      timestamp: new Date().toISOString(),
      modelVersion: 'fallback',
      isCentralized: true,
      isFallback: true
    };
    
    console.log('📝 Frontend fallback analysis result:', result);
    return result;
  }

  async getModelStatus() {
    try {
      // Using new Python ML service endpoint
      const response = await api.get('/api/ai/status');
      if (response.data.success) {
        this.modelInfo = response.data.data;
        this.isReady = response.data.data.mlService.isHealthy;
        return this.modelInfo;
      }
    } catch (error) {
      console.error('Error getting model status:', error);
    }
    return null;
  }

  async trainModel() {
    try {
      console.log('🚀 Starting Python ML model training...');
      // Using new Python ML service endpoint (owner only)
      const response = await api.post('/api/ai/retrain');

      if (response.data.success) {
        console.log('✅ Model training started');
        console.log('   - Training data:', response.data.data);
        return { success: true, message: 'Model training completed successfully', data: response.data.data };
      } else {
        console.error('❌ Training failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('❌ Error starting training:', error);
      return { success: false, message: error.response?.data?.message || 'Error starting training' };
    }
  }

  async retrainModel() {
    try {
      console.log('🔄 Starting Python ML model retraining...');
      // Using new Python ML service endpoint (owner only)
      const response = await api.post('/api/ai/retrain');

      if (response.data.success) {
        console.log('✅ Model retraining completed successfully');
        console.log('   - Metrics:', response.data.data?.metrics);
        return {
          success: true,
          message: 'Model retraining completed successfully',
          data: response.data.data
        };
      } else {
        console.error('❌ Retraining failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('❌ Error starting retraining:', error);

      // Handle 401 Unauthorized (not owner)
      if (error.response && error.response.status === 401) {
        return {
          success: false,
          message: 'Unauthorized. Only owners can retrain the model.',
          isUnauthorized: true
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Error starting retraining'
      };
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
