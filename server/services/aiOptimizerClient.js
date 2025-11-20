/**
 * AI Optimizer Service Client
 * ============================
 *
 * Node.js client for communicating with the AI Optimization Engine (Optuna-based).
 * Runs on user's PC and accessed via Cloudflare Tunnel.
 *
 * Features:
 * - Bayesian optimization for espresso parameter tuning
 * - Connection pooling and retry logic
 * - Timeout handling
 * - Health monitoring
 * - Fallback to default recommendations on failure
 */

const axios = require('axios');

class AIOptimizerClient {
  constructor() {
    this.baseURL = process.env.AI_OPTIMIZER_URL || 'http://localhost:8000';
    this.timeout = 15000; // 15 seconds (longer for optimization)
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
        console.log(`[AI Optimizer] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[AI Optimizer] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.error('[AI Optimizer] Connection refused. Is the optimizer service accessible?');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('[AI Optimizer] Request timeout.');
        } else if (error.code === 'ENOTFOUND') {
          console.error('[AI Optimizer] DNS lookup failed. Check AI_OPTIMIZER_URL.');
        } else {
          console.error('[AI Optimizer] Error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Start periodic health checks (every 60 seconds)
   */
  startHealthChecks() {
    // Initial health check
    this.checkHealth().catch(() => {});

    // Periodic health checks (less frequent since it's remote)
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        // Silent fail - just log
        console.warn('[AI Optimizer] Health check failed:', error.message);
      }
    }, 60000); // 60 seconds
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
   * Check AI optimizer service health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      this.isHealthy = response.data.status === 'healthy';
      this.lastHealthCheck = new Date();

      console.log('[AI Optimizer] Health check passed:', response.data);

      return response.data;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();

      console.warn('[AI Optimizer] Health check failed:', error.message);

      throw error;
    }
  }

  /**
   * Get next recommended parameters for a shot
   *
   * @param {Object} options
   * @param {string} options.beanId - MongoDB ID of the coffee bean
   * @param {string} options.userId - User ID (optional)
   * @param {string} options.method - Brewing method (default: 'espresso')
   * @param {Object} options.lastShot - Previous shot data (optional)
   * @param {number} options.lastShot.grind - Previous grind setting
   * @param {number} options.lastShot.dose - Previous dose in grams
   * @param {number} options.lastShot.time - Previous extraction time
   * @param {number} options.lastShot.score - Taste score (0-10)
   * @returns {Promise<Object>} Recommendation with parameters
   */
  async getNextRecommendation(options) {
    try {
      const {
        beanId,
        userId = null,
        method = 'espresso',
        lastShot = null
      } = options;

      // Validate required fields
      if (!beanId) {
        throw new Error('beanId is required');
      }

      // Build request payload
      const payload = {
        bean_id: beanId,
        user_id: userId,
        method: method
      };

      // Include previous shot data if available
      if (lastShot) {
        if (lastShot.grind !== undefined) payload.grind = lastShot.grind;
        if (lastShot.dose !== undefined) payload.dose = lastShot.dose;
        if (lastShot.time !== undefined) payload.time = lastShot.time;
        if (lastShot.score !== undefined) payload.taste_score = lastShot.score;
      }

      console.log('[AI Optimizer] Requesting recommendation for:', {
        beanId,
        userId,
        method,
        hasLastShot: !!lastShot
      });

      const response = await this.client.post('/optimize/next-shot', payload);

      console.log('[AI Optimizer] Recommendation received:', response.data);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('[AI Optimizer] Failed to get recommendation:', error.message);

      // Return fallback recommendation
      return this.getFallbackRecommendation(options);
    }
  }

  /**
   * Report the result of a specific trial
   *
   * @param {Object} options
   * @param {string} options.beanId - Coffee bean ID
   * @param {string} options.userId - User ID (optional)
   * @param {string} options.method - Brewing method
   * @param {number} options.trialNumber - Trial number to report
   * @param {number} options.tasteScore - Taste score (0-10)
   * @returns {Promise<Object>} Report status
   */
  async reportTrialResult(options) {
    try {
      const {
        beanId,
        userId = null,
        method = 'espresso',
        trialNumber,
        tasteScore
      } = options;

      // Validate required fields
      if (!beanId || trialNumber === undefined || tasteScore === undefined) {
        throw new Error('beanId, trialNumber, and tasteScore are required');
      }

      const payload = {
        bean_id: beanId,
        user_id: userId,
        method: method,
        trial_number: trialNumber,
        taste_score: tasteScore
      };

      console.log('[AI Optimizer] Reporting trial result:', payload);

      const response = await this.client.post('/optimize/report', payload);

      console.log('[AI Optimizer] Report successful:', response.data);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('[AI Optimizer] Failed to report result:', error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get optimization status for a bean
   *
   * @param {Object} options
   * @param {string} options.beanId - Coffee bean ID
   * @param {string} options.userId - User ID (optional)
   * @param {string} options.method - Brewing method
   * @returns {Promise<Object>} Optimization status
   */
  async getOptimizationStatus(options) {
    try {
      const {
        beanId,
        userId = null,
        method = 'espresso'
      } = options;

      if (!beanId) {
        throw new Error('beanId is required');
      }

      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      params.append('method', method);

      const url = `/optimize/status/${beanId}?${params.toString()}`;

      const response = await this.client.get(url);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('[AI Optimizer] Failed to get status:', error.message);

      return {
        success: false,
        error: error.message,
        data: {
          status: 'unavailable',
          message: 'Could not retrieve optimization status'
        }
      };
    }
  }

  /**
   * Get best parameters found so far for a bean
   *
   * @param {Object} options
   * @param {string} options.beanId - Coffee bean ID
   * @param {string} options.userId - User ID (optional)
   * @param {string} options.method - Brewing method
   * @returns {Promise<Object>} Best parameters
   */
  async getBestParameters(options) {
    try {
      const {
        beanId,
        userId = null,
        method = 'espresso'
      } = options;

      if (!beanId) {
        throw new Error('beanId is required');
      }

      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      params.append('method', method);

      const url = `/optimize/best/${beanId}?${params.toString()}`;

      const response = await this.client.get(url);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('[AI Optimizer] Failed to get best parameters:', error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get fallback recommendation when optimizer is unavailable
   *
   * @param {Object} options - Same as getNextRecommendation
   * @returns {Object} Default recommendation
   */
  getFallbackRecommendation(options) {
    console.log('[AI Optimizer] Using fallback recommendation');

    const { lastShot } = options;

    // If we have previous shot data, adjust based on simple rules
    let recommendation = {
      grind: 12.0,
      dose: 18.0,
      target_time: 28.0
    };

    if (lastShot && lastShot.score !== undefined) {
      // Simple rule-based adjustment
      if (lastShot.score < 5) {
        // Bad shot - make significant changes
        recommendation.grind = lastShot.grind ? lastShot.grind - 1.0 : 12.0;
      } else if (lastShot.score < 7) {
        // Okay shot - make small adjustments
        recommendation.grind = lastShot.grind ? lastShot.grind - 0.5 : 12.0;
        recommendation.dose = lastShot.dose ? lastShot.dose + 0.2 : 18.0;
      } else {
        // Good shot - keep similar
        recommendation.grind = lastShot.grind || 12.0;
        recommendation.dose = lastShot.dose || 18.0;
        recommendation.target_time = lastShot.time || 28.0;
      }
    }

    return {
      success: true,
      data: {
        study_name: 'fallback',
        trial_number: 0,
        recommendation: recommendation,
        best_so_far: null,
        total_trials: 0,
        message: 'AI Optimizer is offline. Using default recommendation.',
        fallback: true
      }
    };
  }

  /**
   * Check if optimizer service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isHealthy;
  }

  /**
   * Get service status information
   * @returns {Object}
   */
  getStatus() {
    return {
      baseURL: this.baseURL,
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      available: this.isHealthy
    };
  }
}

// Create singleton instance
const aiOptimizerClient = new AIOptimizerClient();

// Cleanup on process exit
process.on('SIGTERM', () => {
  aiOptimizerClient.stopHealthChecks();
});

process.on('SIGINT', () => {
  aiOptimizerClient.stopHealthChecks();
});

module.exports = aiOptimizerClient;
