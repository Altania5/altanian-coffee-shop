const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const apiKeyLogSchema = new Schema({
  apiKeyId: {
    type: String,
    required: true,
    index: true
  },
  apiKeyName: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  requestBody: {
    type: Schema.Types.Mixed,
    default: null
  },
  responseStatus: {
    type: Number,
    required: true,
    index: true
  },
  responseTime: {
    type: Number, // in milliseconds
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
apiKeyLogSchema.index({ apiKeyId: 1, timestamp: -1 });
apiKeyLogSchema.index({ timestamp: -1 });
apiKeyLogSchema.index({ endpoint: 1, timestamp: -1 });
apiKeyLogSchema.index({ responseStatus: 1, timestamp: -1 });

// Static methods
apiKeyLogSchema.statics.getUsageStats = function(apiKeyId = null, fromDate = null, toDate = null) {
  const matchStage = {};
  
  if (apiKeyId) {
    matchStage.apiKeyId = apiKeyId;
  }
  
  if (fromDate || toDate) {
    matchStage.timestamp = {};
    if (fromDate) matchStage.timestamp.$gte = new Date(fromDate);
    if (toDate) matchStage.timestamp.$lte = new Date(toDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ['$responseStatus', 400] }, 1, 0]
          }
        },
        successCount: {
          $sum: {
            $cond: [{ $lt: ['$responseStatus', 400] }, 1, 0]
          }
        },
        endpoints: {
          $push: {
            endpoint: '$endpoint',
            method: '$method',
            count: 1,
            avgResponseTime: '$responseTime',
            status: '$responseStatus'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        errorCount: 1,
        successCount: 1,
        successRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$successCount', '$totalRequests'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]);
};

apiKeyLogSchema.statics.getTopEndpoints = function(apiKeyId = null, limit = 10, fromDate = null, toDate = null) {
  const matchStage = {};
  
  if (apiKeyId) {
    matchStage.apiKeyId = apiKeyId;
  }
  
  if (fromDate || toDate) {
    matchStage.timestamp = {};
    if (fromDate) matchStage.timestamp.$gte = new Date(fromDate);
    if (toDate) matchStage.timestamp.$lte = new Date(toDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          endpoint: '$endpoint',
          method: '$method'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ['$responseStatus', 400] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 0,
        endpoint: '$_id.endpoint',
        method: '$_id.method',
        count: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        errorCount: 1,
        successRate: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $subtract: ['$count', '$errorCount'] }, '$count'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]);
};

apiKeyLogSchema.statics.getRecentLogs = function(apiKeyId = null, limit = 50, fromDate = null, toDate = null) {
  const query = {};
  
  if (apiKeyId) {
    query.apiKeyId = apiKeyId;
  }
  
  if (fromDate || toDate) {
    query.timestamp = {};
    if (fromDate) query.timestamp.$gte = new Date(fromDate);
    if (toDate) query.timestamp.$lte = new Date(toDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('-requestBody'); // Exclude request body for performance
};

apiKeyLogSchema.statics.cleanupOldLogs = function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
};

const ApiKeyLog = mongoose.model('ApiKeyLog', apiKeyLogSchema);

module.exports = ApiKeyLog;
