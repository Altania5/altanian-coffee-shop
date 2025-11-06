const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const webhookSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  url: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  events: [{ 
    type: String, 
    required: true,
    enum: [
      'order.created',
      'order.updated', 
      'order.completed',
      'order.cancelled',
      'product.updated',
      'inventory.low_stock',
      'user.registered',
      'payment.completed',
      'payment.failed'
    ]
  }],
  secret: { 
    type: String, 
    required: true,
    minlength: 32
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  retryConfig: {
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 1000 }, // milliseconds
    backoffMultiplier: { type: Number, default: 2 }
  },
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  lastTriggered: { type: Date },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
webhookSchema.index({ events: 1 });
webhookSchema.index({ isActive: 1 });
webhookSchema.index({ createdBy: 1 });

// Virtual for success rate
webhookSchema.virtual('successRate').get(function() {
  const total = this.successCount + this.failureCount;
  return total > 0 ? (this.successCount / total) * 100 : 0;
});

// Method to generate secret
webhookSchema.methods.generateSecret = function() {
  const crypto = require('crypto');
  this.secret = crypto.randomBytes(32).toString('hex');
  return this.secret;
};

// Method to validate webhook signature
webhookSchema.methods.validateSignature = function(payload, signature) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', this.secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// Static method to find webhooks by event
webhookSchema.statics.findByEvent = function(event) {
  return this.find({ 
    events: event, 
    isActive: true 
  });
};

// Static method to get webhook statistics
webhookSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalWebhooks: { $sum: 1 },
        activeWebhooks: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalSuccess: { $sum: '$successCount' },
        totalFailures: { $sum: '$failureCount' }
      }
    }
  ]);
};

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;



