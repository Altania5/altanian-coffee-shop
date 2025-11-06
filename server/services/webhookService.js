const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/webhook.model');

class WebhookService {
  constructor() {
    this.pendingWebhooks = new Map(); // Track pending webhook deliveries
    this.retryQueue = []; // Queue for failed webhooks to retry
    this.isProcessing = false;
    
    // Start processing retry queue
    this.startRetryProcessor();
  }

  /**
   * Trigger webhooks for a specific event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} options - Additional options
   */
  async triggerWebhooks(event, data, options = {}) {
    try {
      const webhooks = await Webhook.findByEvent(event);
      
      if (webhooks.length === 0) {
        console.log(`No webhooks found for event: ${event}`);
        return { triggered: 0, failed: 0 };
      }

      const promises = webhooks.map(webhook => 
        this.deliverWebhook(webhook, event, data, options)
      );

      const results = await Promise.allSettled(promises);
      
      const triggered = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Webhook delivery completed: ${triggered} successful, ${failed} failed for event: ${event}`);
      
      return { triggered, failed };
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      return { triggered: 0, failed: 1 };
    }
  }

  /**
   * Deliver webhook to a specific endpoint
   * @param {Object} webhook - Webhook configuration
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} options - Additional options
   */
  async deliverWebhook(webhook, event, data, options = {}) {
    const webhookId = webhook._id.toString();
    const deliveryId = crypto.randomUUID();
    
    try {
      // Prepare payload
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        deliveryId,
        webhookId: webhookId
      };

      const payloadString = JSON.stringify(payload);
      
      // Generate signature
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payloadString)
        .digest('hex');

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': deliveryId,
        'User-Agent': 'AltanianCoffee-Webhook/1.0',
        ...webhook.headers,
        ...options.headers
      };

      // Track delivery start
      this.pendingWebhooks.set(deliveryId, {
        webhookId,
        event,
        startTime: Date.now(),
        attempts: 0
      });

      // Make HTTP request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: options.timeout || 10000,
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Success
      await this.handleWebhookSuccess(webhook, deliveryId, response);
      
      return {
        success: true,
        deliveryId,
        statusCode: response.status,
        responseTime: Date.now() - this.pendingWebhooks.get(deliveryId).startTime
      };

    } catch (error) {
      // Failure
      await this.handleWebhookFailure(webhook, deliveryId, error, event, data, options);
      
      throw {
        success: false,
        deliveryId,
        error: error.message,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Handle successful webhook delivery
   */
  async handleWebhookSuccess(webhook, deliveryId, response) {
    try {
      const pending = this.pendingWebhooks.get(deliveryId);
      const responseTime = Date.now() - pending.startTime;

      // Update webhook statistics
      await Webhook.findByIdAndUpdate(webhook._id, {
        $inc: { successCount: 1 },
        lastTriggered: new Date()
      });

      // Log success
      console.log(`Webhook delivered successfully: ${webhook.name} (${deliveryId}) - ${response.status} - ${responseTime}ms`);

      // Clean up
      this.pendingWebhooks.delete(deliveryId);

    } catch (error) {
      console.error('Error handling webhook success:', error);
    }
  }

  /**
   * Handle failed webhook delivery
   */
  async handleWebhookFailure(webhook, deliveryId, error, event, data, options) {
    try {
      const pending = this.pendingWebhooks.get(deliveryId);
      pending.attempts += 1;

      // Update webhook statistics
      await Webhook.findByIdAndUpdate(webhook._id, {
        $inc: { failureCount: 1 }
      });

      // Log failure
      console.error(`Webhook delivery failed: ${webhook.name} (${deliveryId}) - Attempt ${pending.attempts} - ${error.message}`);

      // Check if we should retry
      if (pending.attempts < webhook.retryConfig.maxRetries) {
        const retryDelay = webhook.retryConfig.retryDelay * 
          Math.pow(webhook.retryConfig.backoffMultiplier, pending.attempts - 1);
        
        // Add to retry queue
        this.retryQueue.push({
          webhook,
          event,
          data,
          options,
          deliveryId,
          retryAt: Date.now() + retryDelay,
          attempts: pending.attempts
        });

        console.log(`Webhook queued for retry: ${webhook.name} (${deliveryId}) - Retry in ${retryDelay}ms`);
      } else {
        console.error(`Webhook delivery permanently failed: ${webhook.name} (${deliveryId}) - Max retries exceeded`);
      }

      // Clean up
      this.pendingWebhooks.delete(deliveryId);

    } catch (error) {
      console.error('Error handling webhook failure:', error);
    }
  }

  /**
   * Start retry processor
   */
  startRetryProcessor() {
    setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    if (this.isProcessing || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = Date.now();
      const readyToRetry = this.retryQueue.filter(item => item.retryAt <= now);
      
      if (readyToRetry.length === 0) {
        return;
      }

      // Remove ready items from queue
      this.retryQueue = this.retryQueue.filter(item => item.retryAt > now);

      // Process retries
      for (const item of readyToRetry) {
        try {
          await this.deliverWebhook(item.webhook, item.event, item.data, item.options);
        } catch (error) {
          console.error(`Retry failed for webhook ${item.webhook.name}:`, error);
        }
      }

    } catch (error) {
      console.error('Error processing retry queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId, testData = {}) {
    try {
      const webhook = await Webhook.findById(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const testPayload = {
        event: 'webhook.test',
        data: {
          message: 'This is a test webhook delivery',
          timestamp: new Date().toISOString(),
          ...testData
        }
      };

      const result = await this.deliverWebhook(webhook, 'webhook.test', testPayload.data);
      
      return {
        success: true,
        message: 'Test webhook delivered successfully',
        result
      };

    } catch (error) {
      return {
        success: false,
        message: 'Test webhook failed',
        error: error.message
      };
    }
  }

  /**
   * Get webhook delivery logs
   */
  async getDeliveryLogs(webhookId, limit = 50) {
    // This would typically be stored in a separate collection
    // For now, we'll return pending webhooks as a proxy
    const pending = Array.from(this.pendingWebhooks.values())
      .filter(item => item.webhookId === webhookId)
      .slice(0, limit);

    return pending;
  }

  /**
   * Get webhook statistics
   */
  async getStatistics() {
    try {
      const stats = await Webhook.getStatistics();
      const totalPending = this.pendingWebhooks.size;
      const totalInRetryQueue = this.retryQueue.length;

      return {
        ...stats[0],
        totalPending,
        totalInRetryQueue,
        isProcessing: this.isProcessing
      };
    } catch (error) {
      console.error('Error getting webhook statistics:', error);
      return null;
    }
  }

  /**
   * Validate webhook signature
   */
  validateSignature(payload, signature, secret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature.replace('sha256=', ''), 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Clean up old pending webhooks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [deliveryId, pending] of this.pendingWebhooks.entries()) {
      if (now - pending.startTime > maxAge) {
        this.pendingWebhooks.delete(deliveryId);
        console.log(`Cleaned up old pending webhook: ${deliveryId}`);
      }
    }
  }
}

module.exports = new WebhookService();



