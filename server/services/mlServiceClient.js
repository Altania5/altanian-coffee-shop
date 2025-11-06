/**
 * ML Service Client
 * =================
 *
 * Node.js client for communicating with the Python ML Service (Flask API).
 *
 * Features:
 * - Connection pooling and retry logic
 * - Timeout handling
 * - Health monitoring
 * - Comprehensive error handling
 * - Fallback to rule-based system on failure
 */

const axios = require('axios');

class MLServiceClient {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    this.timeout = 10000; // 10 seconds default timeout
    this.healthCheckInterval = null;
    this.isHealthy = false;
    this.lastHealthCheck = null;

    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[ML Service] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ML Service] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.error('[ML Service] Connection refused. Is the ML service running?');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('[ML Service] Request timeout.');
        } else {
          console.error('[ML Service] Error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Start periodic health checks (every 30 seconds)
   */
  startHealthChecks() {
    // Initial health check
    this.checkHealth().catch(() => {});

    // Periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        // Silent fail - just log
        console.warn('[ML Service] Health check failed:', error.message);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop health checks (cleanup)
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check ML service health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      this.isHealthy = response.data.status === 'healthy';
      this.lastHealthCheck = new Date();

      if (this.isHealthy) {
        console.log('[ML Service] ✅ Healthy - Models loaded:', response.data.models?.length || 0);
      } else {
        console.warn('[ML Service] ⚠️  Service up but models not loaded');
      }

      return response.data;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      throw new Error(`ML service health check failed: ${error.message}`);
    }
  }

  /**
   * Predict espresso quality and taste profile
   * @param {Object} parameters - Espresso parameters
   * @returns {Promise<Object>} Predictions and metadata
   */
  async predict(parameters) {
    try {
      // Validate required parameters
      this.validatePredictionParams(parameters);

      const response = await this.client.post('/predict', parameters, {
        timeout: 5000 // 5 seconds for predictions
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Prediction failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('[ML Service] Prediction error:', error.message);

      // Fallback to rule-based system
      console.log('[ML Service] Falling back to rule-based prediction');
      return this.fallbackPredict(parameters);
    }
  }

  /**
   * Get SHAP explanation for a prediction
   * @param {Object} parameters - Espresso parameters
   * @param {string} target - Target variable (default: 'shotQuality')
   * @returns {Promise<Object>} SHAP explanation
   */
  async explain(parameters, target = 'shotQuality') {
    try {
      const response = await this.client.post('/explain', {
        parameters,
        target
      }, {
        timeout: 15000 // 15 seconds for SHAP (slower)
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Explanation failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('[ML Service] Explanation error:', error.message);
      throw error;
    }
  }

  /**
   * Get feature importance for a target variable
   * @param {string} target - Target variable
   * @param {number} topN - Number of top features
   * @returns {Promise<Array>} Feature importance rankings
   */
  async getFeatureImportance(target = 'shotQuality', topN = 15) {
    try {
      const response = await this.client.get(`/feature-importance/${target}`, {
        params: { top_n: topN },
        timeout: 5000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get feature importance');
      }

      return response.data.data;
    } catch (error) {
      console.error('[ML Service] Feature importance error:', error.message);
      throw error;
    }
  }

  /**
   * Get model information and metadata
   * @returns {Promise<Object>} Model info
   */
  async getModelInfo() {
    try {
      const response = await this.client.get('/model-info', { timeout: 5000 });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get model info');
      }

      return response.data.data;
    } catch (error) {
      console.error('[ML Service] Model info error:', error.message);
      throw error;
    }
  }

  /**
   * Trigger model retraining
   * @param {string} dataPath - Path to training data (optional)
   * @returns {Promise<Object>} Training results
   */
  async train(dataPath = null) {
    try {
      const payload = dataPath ? { data_path: dataPath } : {};

      const response = await this.client.post('/train', payload, {
        timeout: 300000 // 5 minutes for training
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Training failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('[ML Service] Training error:', error.message);
      throw error;
    }
  }

  /**
   * Get parameter recommendations (placeholder)
   * @param {Object} currentParams - Current parameters
   * @param {Object} targetProfile - Desired taste profile
   * @returns {Promise<Object>} Recommendations
   */
  async recommend(currentParams, targetProfile) {
    try {
      const response = await this.client.post('/recommend', {
        currentParams,
        targetProfile
      }, {
        timeout: 10000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Recommendation failed');
      }

      return response.data.data;
    } catch (error) {
      // Not implemented yet, expected to fail
      console.warn('[ML Service] Recommendations not yet implemented');
      throw error;
    }
  }

  /**
   * Validate prediction parameters
   * @param {Object} params - Parameters to validate
   * @throws {Error} If validation fails
   */
  validatePredictionParams(params) {
    const required = ['grindSize', 'extractionTime', 'inWeight', 'outWeight'];
    const missing = required.filter(field => !(field in params));

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }

    // Validate ranges
    if (params.grindSize < 1 || params.grindSize > 50) {
      throw new Error('grindSize must be between 1-50');
    }

    if (params.extractionTime < 10 || params.extractionTime > 60) {
      throw new Error('extractionTime must be between 10-60 seconds');
    }

    if (params.inWeight < 10 || params.inWeight > 30) {
      throw new Error('inWeight must be between 10-30 grams');
    }

    if (params.outWeight < 15 || params.outWeight > 80) {
      throw new Error('outWeight must be between 15-80 grams');
    }
  }

  /**
   * Fallback rule-based prediction (when ML service is unavailable)
   * @param {Object} params - Espresso parameters
   * @returns {Object} Simple rule-based predictions
   */
  fallbackPredict(params) {
    console.log('[ML Service] Using fallback rule-based prediction');

    const ratio = params.outWeight / params.inWeight;
    const flowRate = params.outWeight / params.extractionTime;

    // Simple rules
    let baseQuality = 5;

    // Good ratio (1.8-2.2)
    if (ratio >= 1.8 && ratio <= 2.2) baseQuality += 1;

    // Good extraction time (25-30s)
    if (params.extractionTime >= 25 && params.extractionTime <= 30) baseQuality += 1;

    // Good temperature (91-94°C)
    if (params.temperature && params.temperature >= 91 && params.temperature <= 94) {
      baseQuality += 0.5;
    }

    // WDT usage
    if (params.usedWDT) baseQuality += 0.5;

    // Puck screen usage
    if (params.usedPuckScreen) baseQuality += 0.3;

    // Fresh beans (<14 days)
    if (params.daysPastRoast && params.daysPastRoast <= 14) baseQuality += 0.5;

    // Clamp to 1-10
    const shotQuality = Math.max(1, Math.min(10, baseQuality));

    return {
      predictions: {
        shotQuality: parseFloat(shotQuality.toFixed(2)),
        sweetness: 5.0, // Default middle values
        acidity: 5.0,
        bitterness: 5.0,
        body: 5.0
      },
      confidence: {
        overall: 0.5, // Lower confidence for fallback
        note: 'Using rule-based fallback prediction. ML service unavailable.'
      },
      metadata: {
        source: 'fallback',
        ml_service_available: false
      }
    };
  }

  /**
   * Get current service status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      isHealthy: this.isHealthy,
      baseURL: this.baseURL,
      lastHealthCheck: this.lastHealthCheck,
      timeout: this.timeout
    };
  }
}

// Create singleton instance
const mlServiceClient = new MLServiceClient();

// Cleanup on process exit
process.on('SIGTERM', () => {
  mlServiceClient.stopHealthChecks();
});

process.on('SIGINT', () => {
  mlServiceClient.stopHealthChecks();
});

module.exports = mlServiceClient;
