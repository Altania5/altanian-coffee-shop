const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Loyalty Account Schema
const loyaltyAccountSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  points: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], 
    default: 'Bronze' 
  },
  totalSpent: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  visits: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  pointsRedeemed: {
    type: Number,
    default: 0,
    min: 0
  },
  rewards: [{
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
    earnedAt: { type: Date, default: Date.now },
    redeemedAt: Date,
    isRedeemed: { type: Boolean, default: false },
    pointsUsed: { type: Number, default: 0 }
  }],
  transactions: [{
    type: { 
      type: String, 
      enum: ['earned', 'redeemed', 'expired', 'bonus'], 
      required: true 
    },
    points: { type: Number, required: true },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
    createdAt: { type: Date, default: Date.now }
  }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    birthdayReward: { type: Boolean, default: true }
  },
  lastVisit: Date,
  birthday: Date,
  anniversaryDate: Date // When they joined the program
}, {
  timestamps: true,
});

// Reward Schema
const rewardSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  pointsRequired: { type: Number, required: true, min: 0 },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed', 'free_item', 'bonus_points'], 
    required: true 
  },
  discountValue: { type: Number, required: true },
  category: {
    type: String,
    enum: ['drink', 'food', 'merchandise', 'general'],
    default: 'general'
  },
  isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: null }, // null = unlimited
  expiryDays: { type: Number, default: null }, // null = no expiry
  tierRestriction: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: null
  },
  usageCount: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' }
}, {
  timestamps: true,
});

// Tier Benefits Schema
const tierBenefitSchema = new Schema({
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], 
    required: true,
    unique: true 
  },
  pointsMultiplier: { type: Number, default: 1.0 },
  birthdayBonus: { type: Number, default: 0 },
  anniversaryBonus: { type: Number, default: 0 },
  freeDeliveryThreshold: { type: Number, default: null },
  exclusiveRewards: [{ type: Schema.Types.ObjectId, ref: 'Reward' }],
  benefits: [{
    name: String,
    description: String,
    value: Number,
    type: { type: String, enum: ['percentage', 'fixed', 'boolean'] }
  }]
}, {
  timestamps: true,
});

// Methods for LoyaltyAccount
loyaltyAccountSchema.methods.calculateTier = function() {
  if (this.totalSpent >= 500) return 'Platinum';
  if (this.totalSpent >= 200) return 'Gold';
  if (this.totalSpent >= 100) return 'Silver';
  return 'Bronze';
};

loyaltyAccountSchema.methods.updateTier = function() {
  const newTier = this.calculateTier();
  const oldTier = this.tier;
  
  if (newTier !== oldTier) {
    this.tier = newTier;
    return { upgraded: true, oldTier, newTier };
  }
  
  return { upgraded: false };
};

loyaltyAccountSchema.methods.addTransaction = function(type, points, description, orderId = null, rewardId = null) {
  this.transactions.push({
    type,
    points,
    description,
    orderId,
    rewardId
  });
  
  if (type === 'earned' || type === 'bonus') {
    this.points += points;
    this.pointsEarned += points;
  } else if (type === 'redeemed') {
    this.points -= points;
    this.pointsRedeemed += points;
  }
};

loyaltyAccountSchema.methods.canRedeemReward = function(reward) {
  if (!reward.isActive) return false;
  if (this.points < reward.pointsRequired) return false;
  if (reward.tierRestriction && this.tier !== reward.tierRestriction) return false;
  if (reward.maxUses && reward.usageCount >= reward.maxUses) return false;
  
  return true;
};

loyaltyAccountSchema.methods.getAvailableRewards = function() {
  // This would be populated with actual rewards in the service layer
  return [];
};

// Static methods
loyaltyAccountSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('rewards.rewardId');
};

loyaltyAccountSchema.statics.getTopCustomers = function(limit = 10) {
  return this.find()
    .populate('userId', 'firstName lastName email')
    .sort({ totalSpent: -1 })
    .limit(limit);
};

// Indexes for performance
// userId index is already created by unique: true
loyaltyAccountSchema.index({ tier: 1 });
loyaltyAccountSchema.index({ totalSpent: -1 });
loyaltyAccountSchema.index({ points: -1 });

rewardSchema.index({ isActive: 1 });
rewardSchema.index({ pointsRequired: 1 });
rewardSchema.index({ tierRestriction: 1 });

// Create models
const LoyaltyAccount = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
const Reward = mongoose.model('Reward', rewardSchema);
const TierBenefit = mongoose.model('TierBenefit', tierBenefitSchema);

module.exports = {
  LoyaltyAccount,
  Reward,
  TierBenefit
};

