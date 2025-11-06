/**
 * ML Service Client
 * =================
 *
 * Client for interacting with the Python ML service (port 5000).
 * Provides predictions, explanations, and recommendations for espresso shots.
 */

class MLServiceClient {
  constructor() {
    // Use environment variable or default to localhost
    this.baseURL = process.env.REACT_APP_ML_SERVICE_URL || 'http://localhost:5000';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if ML service is healthy and ready
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return {
        isHealthy: data.status === 'healthy',
        modelLoaded: data.model_loaded,
        models: data.models || [],
        numFeatures: data.num_features
      };
    } catch (error) {
      console.error('ML Service health check failed:', error);
      return {
        isHealthy: false,
        modelLoaded: false,
        error: error.message
      };
    }
  }

  /**
   * Get model information and performance metrics
   */
  async getModelInfo() {
    try {
      const response = await fetch(`${this.baseURL}/model-info`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to get model info');
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  }

  /**
   * Predict espresso quality for given parameters
   *
   * @param {Object} shotParams - Shot parameters
   * @returns {Promise<Object>} Predictions for all targets
   */
  async predict(shotParams) {
    try {
      const response = await fetch(`${this.baseURL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shotParams)
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Prediction failed');
    } catch (error) {
      console.error('Error making prediction:', error);
      throw error;
    }
  }

  /**
   * Get SHAP explanation for a prediction
   *
   * @param {Object} shotParams - Shot parameters
   * @param {String} target - Target variable (shotQuality, sweetness, etc.)
   * @returns {Promise<Object>} SHAP explanation data
   */
  async explain(shotParams, target = 'shotQuality') {
    try {
      const response = await fetch(`${this.baseURL}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...shotParams,
          target
        })
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Explanation failed');
    } catch (error) {
      console.error('Error getting explanation:', error);
      throw error;
    }
  }

  /**
   * Get feature importance for a target
   *
   * @param {String} target - Target variable
   * @returns {Promise<Array>} Feature importance rankings
   */
  async getFeatureImportance(target = 'shotQuality') {
    const cacheKey = `feature-importance-${target}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/feature-importance/${target}`);
      const result = await response.json();

      if (result.success) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
        return result.data;
      }
      throw new Error(result.error || 'Failed to get feature importance');
    } catch (error) {
      console.error('Error getting feature importance:', error);
      throw error;
    }
  }

  /**
   * Get parameter recommendations based on clustering
   *
   * @param {Object} currentParams - Current shot parameters
   * @returns {Promise<Object>} Recommended parameters
   */
  async getRecommendations(currentParams) {
    try {
      const response = await fetch(`${this.baseURL}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentParams)
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Recommendations failed');
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze a complete shot and provide comprehensive feedback
   *
   * @param {Object} shotData - Complete shot data
   * @returns {Promise<Object>} Analysis with predictions, explanations, and recommendations
   */
  async analyzeShot(shotData) {
    try {
      // Get predictions
      const predictions = await this.predict(shotData);

      // Get explanations for shotQuality
      let explanation = null;
      try {
        explanation = await this.explain(shotData, 'shotQuality');
      } catch (e) {
        console.warn('Could not get SHAP explanation:', e);
      }

      // Get feature importance
      let featureImportance = null;
      try {
        featureImportance = await this.getFeatureImportance('shotQuality');
      } catch (e) {
        console.warn('Could not get feature importance:', e);
      }

      // Generate recommendations based on predictions
      const recommendations = this.generateRecommendations(shotData, predictions);

      return {
        predictions,
        explanation,
        featureImportance,
        recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing shot:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable recommendations based on predictions
   * @private
   */
  generateRecommendations(shotData, predictions) {
    const recommendations = [];
    const { shotQuality } = predictions.predictions || {};

    if (!shotQuality) return recommendations;

    // Quality-based recommendations
    if (shotQuality < 5) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        title: 'Shot Quality Below Target',
        message: `Predicted quality: ${shotQuality.toFixed(1)}/10. Consider adjusting grind size or extraction time.`,
        parameters: {
          grindSize: 'Try going finer to increase extraction',
          extractionTime: 'Target 25-30 seconds for optimal extraction'
        }
      });
    } else if (shotQuality >= 7) {
      recommendations.push({
        priority: 'low',
        category: 'quality',
        title: 'Excellent Shot Predicted',
        message: `Predicted quality: ${shotQuality.toFixed(1)}/10. Your parameters look great!`,
        parameters: {}
      });
    }

    // Grind size recommendations
    if (shotData.grindSize && shotData.extractionTime) {
      if (shotData.grindSize > 14 && shotData.extractionTime < 25) {
        recommendations.push({
          priority: 'medium',
          category: 'extraction',
          title: 'Grind May Be Too Coarse',
          message: 'Your extraction time is short with a coarse grind. Try grinding finer.',
          parameters: {
            grindSize: `Try ${shotData.grindSize - 2} (finer)`
          }
        });
      } else if (shotData.grindSize < 10 && shotData.extractionTime > 35) {
        recommendations.push({
          priority: 'medium',
          category: 'extraction',
          title: 'Grind May Be Too Fine',
          message: 'Your extraction time is long with a fine grind. Try grinding coarser.',
          parameters: {
            grindSize: `Try ${shotData.grindSize + 2} (coarser)`
          }
        });
      }
    }

    // Technique recommendations
    if (!shotData.usedWDT) {
      recommendations.push({
        priority: 'low',
        category: 'technique',
        title: 'Consider Using WDT',
        message: 'WDT (Weiss Distribution Technique) is a top-5 feature for shot quality. Try it!',
        parameters: {
          usedWDT: true
        }
      });
    }

    return recommendations;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let instance = null;

export function getMLServiceClient() {
  if (!instance) {
    instance = new MLServiceClient();
  }
  return instance;
}

export default MLServiceClient;
