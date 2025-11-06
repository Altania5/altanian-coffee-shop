const fs = require('fs');
const path = require('path');

class RateLimitService {
  constructor() {
    this.limitsPath = path.join(__dirname, '../config/rate-limits.json');
    this.limits = this.loadLimits();
    this.buckets = new Map(); // In-memory token buckets
    this.cleanupInterval = setInterval(() => this.cleanupBuckets(), 60000); // Cleanup every minute
  }

  loadLimits() {
    try {
      const data = fs.readFileSync(this.limitsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading rate limits:', error);
      return { tiers: {}, scopeLimits: {}, defaultTier: 'basic' };
    }
  }

  reloadLimits() {
    this.limits = this.loadLimits();
  }

  getTier(scopeName) {
    return this.limits.scopeLimits[scopeName] || this.limits.defaultTier;
  }

  getTierLimits(tierName) {
    return this.limits.tiers[tierName];
  }

  // Token bucket algorithm implementation
  getBucketKey(apiKeyId, window) {
    return `${apiKeyId}:${window}`;
  }

  getBucket(apiKeyId, tierName, windowSize = 60) {
    const bucketKey = this.getBucketKey(apiKeyId, windowSize);
    
    if (!this.buckets.has(bucketKey)) {
      const tier = this.getTierLimits(tierName);
      if (!tier) return null;

      const limit = this.getLimitForWindow(tier, windowSize);
      this.buckets.set(bucketKey, {
        tokens: limit,
        lastRefill: Date.now(),
        limit: limit,
        windowSize: windowSize
      });
    }

    return this.buckets.get(bucketKey);
  }

  getLimitForWindow(tier, windowSize) {
    if (windowSize <= 60) {
      return tier.requestsPerMinute === -1 ? Infinity : tier.requestsPerMinute;
    } else if (windowSize <= 3600) {
      return tier.requestsPerHour === -1 ? Infinity : Math.floor(tier.requestsPerHour / 60);
    } else {
      return tier.requestsPerDay === -1 ? Infinity : Math.floor(tier.requestsPerDay / 1440);
    }
  }

  refillBucket(bucket) {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = (timePassed / bucket.windowSize) * bucket.limit;
    
    bucket.tokens = Math.min(bucket.limit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  consumeToken(apiKeyId, scopeName, windowSize = 60) {
    const tierName = this.getTier(scopeName);
    const bucket = this.getBucket(apiKeyId, tierName, windowSize);
    
    if (!bucket) {
      return { allowed: false, remaining: 0, resetTime: Date.now() + windowSize * 1000 };
    }

    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: bucket.lastRefill + bucket.windowSize * 1000
      };
    } else {
      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.lastRefill + bucket.windowSize * 1000
      };
    }
  }

  getRateLimitInfo(apiKeyId, scopeName) {
    const tierName = this.getTier(scopeName);
    const tier = this.getTierLimits(tierName);
    
    if (!tier) return null;

    return {
      tier: tierName,
      name: tier.name,
      description: tier.description,
      limits: {
        perMinute: tier.requestsPerMinute,
        perHour: tier.requestsPerHour,
        perDay: tier.requestsPerDay
      }
    };
  }

  getBucketStatus(apiKeyId, scopeName, windowSize = 60) {
    const tierName = this.getTier(scopeName);
    const bucket = this.getBucket(apiKeyId, tierName, windowSize);
    
    if (!bucket) return null;

    this.refillBucket(bucket);

    return {
      tokens: Math.floor(bucket.tokens),
      limit: bucket.limit,
      windowSize: bucket.windowSize,
      lastRefill: bucket.lastRefill,
      nextRefill: bucket.lastRefill + bucket.windowSize * 1000
    };
  }

  // Cleanup old buckets to prevent memory leaks
  cleanupBuckets() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }

  // Get rate limit headers for response
  getRateLimitHeaders(apiKeyId, scopeName, windowSize = 60) {
    const bucket = this.getBucket(apiKeyId, scopeName, windowSize);
    if (!bucket) return {};

    this.refillBucket(bucket);
    const tier = this.getTierLimits(this.getTier(scopeName));

    return {
      'X-RateLimit-Limit': bucket.limit === Infinity ? -1 : bucket.limit,
      'X-RateLimit-Remaining': Math.floor(bucket.tokens),
      'X-RateLimit-Reset': Math.ceil(bucket.lastRefill / 1000) + bucket.windowSize,
      'X-RateLimit-Window': bucket.windowSize
    };
  }

  // Check if request should be allowed
  checkRateLimit(apiKeyId, scopeName, windowSize = 60) {
    const result = this.consumeToken(apiKeyId, scopeName, windowSize);
    const headers = this.getRateLimitHeaders(apiKeyId, scopeName, windowSize);

    return {
      ...result,
      headers
    };
  }

  // Reset bucket for testing or manual intervention
  resetBucket(apiKeyId, scopeName, windowSize = 60) {
    const bucketKey = this.getBucketKey(apiKeyId, windowSize);
    this.buckets.delete(bucketKey);
  }

  // Get all buckets (for monitoring)
  getAllBuckets() {
    const buckets = [];
    for (const [key, bucket] of this.buckets.entries()) {
      this.refillBucket(bucket);
      buckets.push({
        key,
        tokens: Math.floor(bucket.tokens),
        limit: bucket.limit,
        windowSize: bucket.windowSize,
        lastRefill: bucket.lastRefill
      });
    }
    return buckets;
  }

  // Cleanup on service shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
  }
}

module.exports = new RateLimitService();

