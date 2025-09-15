const { LoyaltyAccount, Reward, TierBenefit } = require('../models/loyalty.model');

class LoyaltyService {
  constructor() {
    this.initializeTierBenefits();
  }

  // Initialize tier benefits if they don't exist
  async initializeTierBenefits() {
    try {
      const existingBenefits = await TierBenefit.countDocuments();
      if (existingBenefits === 0) {
        const tierBenefits = [
          {
            tier: 'Bronze',
            pointsMultiplier: 1.0,
            birthdayBonus: 50,
            anniversaryBonus: 25,
            benefits: [
              { name: 'Welcome Bonus', description: 'Get 50 points on your first order', value: 50, type: 'fixed' },
              { name: 'Birthday Reward', description: '50 bonus points on your birthday', value: 50, type: 'fixed' }
            ]
          },
          {
            tier: 'Silver',
            pointsMultiplier: 1.1,
            birthdayBonus: 100,
            anniversaryBonus: 50,
            freeDeliveryThreshold: 25,
            benefits: [
              { name: 'Points Bonus', description: 'Earn 10% extra points on all orders', value: 10, type: 'percentage' },
              { name: 'Birthday Reward', description: '100 bonus points on your birthday', value: 100, type: 'fixed' },
              { name: 'Free Delivery', description: 'Free delivery on orders over $25', value: 25, type: 'fixed' }
            ]
          },
          {
            tier: 'Gold',
            pointsMultiplier: 1.2,
            birthdayBonus: 150,
            anniversaryBonus: 100,
            freeDeliveryThreshold: 20,
            benefits: [
              { name: 'Points Bonus', description: 'Earn 20% extra points on all orders', value: 20, type: 'percentage' },
              { name: 'Birthday Reward', description: '150 bonus points on your birthday', value: 150, type: 'fixed' },
              { name: 'Free Delivery', description: 'Free delivery on orders over $20', value: 20, type: 'fixed' },
              { name: 'Priority Support', description: 'Priority customer support', value: true, type: 'boolean' }
            ]
          },
          {
            tier: 'Platinum',
            pointsMultiplier: 1.3,
            birthdayBonus: 200,
            anniversaryBonus: 150,
            freeDeliveryThreshold: 15,
            benefits: [
              { name: 'Points Bonus', description: 'Earn 30% extra points on all orders', value: 30, type: 'percentage' },
              { name: 'Birthday Reward', description: '200 bonus points on your birthday', value: 200, type: 'fixed' },
              { name: 'Free Delivery', description: 'Free delivery on orders over $15', value: 15, type: 'fixed' },
              { name: 'Priority Support', description: 'Priority customer support', value: true, type: 'boolean' },
              { name: 'Exclusive Access', description: 'Access to exclusive rewards and events', value: true, type: 'boolean' }
            ]
          }
        ];

        await TierBenefit.insertMany(tierBenefits);
        console.log('✅ Tier benefits initialized');
      }
    } catch (error) {
      console.error('Error initializing tier benefits:', error);
    }
  }

  // Get or create loyalty account for user
  async getOrCreateAccount(userId) {
    try {
      let account = await LoyaltyAccount.findByUserId(userId);
      
      if (!account) {
        account = new LoyaltyAccount({
          userId,
          anniversaryDate: new Date()
        });
        await account.save();
        console.log(`✅ Created new loyalty account for user ${userId}`);
      }
      
      return account;
    } catch (error) {
      console.error('Error getting/creating loyalty account:', error);
      throw error;
    }
  }

  // Award points for an order
  async awardPoints(userId, orderData) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const tierBenefit = await TierBenefit.findOne({ tier: account.tier });
      
      // Calculate base points (1 point per $1 spent)
      const basePoints = Math.floor(orderData.totalAmount);
      
      // Apply tier multiplier
      const multiplier = tierBenefit ? tierBenefit.pointsMultiplier : 1.0;
      const bonusPoints = Math.floor(basePoints * (multiplier - 1));
      const totalPointsEarned = basePoints + bonusPoints;
      
      // Update account
      account.points += totalPointsEarned;
      account.totalSpent += orderData.totalAmount;
      account.visits += 1;
      account.lastVisit = new Date();
      
      // Add transaction record
      account.addTransaction(
        'earned',
        totalPointsEarned,
        `Order #${orderData.orderNumber} - ${basePoints} base points${bonusPoints > 0 ? ` + ${bonusPoints} tier bonus` : ''}`,
        orderData.orderId
      );
      
      // Check for tier upgrade
      const tierUpdate = account.updateTier();
      if (tierUpdate.upgraded) {
        const upgradeBonus = this.getTierUpgradeBonus(tierUpdate.newTier);
        account.points += upgradeBonus;
        account.addTransaction(
          'bonus',
          upgradeBonus,
          `Tier upgrade bonus: ${tierUpdate.oldTier} → ${tierUpdate.newTier}`,
          orderData.orderId
        );
      }
      
      await account.save();
      
      return {
        pointsEarned: totalPointsEarned,
        basePoints,
        bonusPoints,
        newTier: account.tier,
        totalPoints: account.points,
        tierUpgraded: tierUpdate.upgraded,
        upgradeBonus: tierUpdate.upgraded ? this.getTierUpgradeBonus(tierUpdate.newTier) : 0
      };
      
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  // Get tier upgrade bonus
  getTierUpgradeBonus(tier) {
    const bonuses = {
      'Silver': 25,
      'Gold': 50,
      'Platinum': 100
    };
    return bonuses[tier] || 0;
  }

  // Redeem reward
  async redeemReward(userId, rewardId, orderId = null) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const reward = await Reward.findById(rewardId);
      
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      if (!account.canRedeemReward(reward)) {
        throw new Error('Cannot redeem this reward');
      }
      
      // Add reward to account
      account.rewards.push({
        rewardId: reward._id,
        pointsUsed: reward.pointsRequired
      });
      
      // Deduct points
      account.points -= reward.pointsRequired;
      
      // Add transaction record
      account.addTransaction(
        'redeemed',
        reward.pointsRequired,
        `Redeemed: ${reward.name}`,
        orderId,
        reward._id
      );
      
      // Update reward usage count
      reward.usageCount += 1;
      await reward.save();
      
      await account.save();
      
      return {
        reward,
        pointsUsed: reward.pointsRequired,
        remainingPoints: account.points
      };
      
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  // Get available rewards for user
  async getAvailableRewards(userId) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const rewards = await Reward.find({ 
        isActive: true,
        $or: [
          { tierRestriction: null },
          { tierRestriction: account.tier }
        ]
      }).sort({ pointsRequired: 1 });
      
      return rewards.filter(reward => account.canRedeemReward(reward));
    } catch (error) {
      console.error('Error getting available rewards:', error);
      throw error;
    }
  }

  // Get user's loyalty account with populated data
  async getUserAccount(userId) {
    try {
      const account = await LoyaltyAccount.findByUserId(userId);
      if (!account) {
        return null;
      }
      
      // Get tier benefits
      const tierBenefit = await TierBenefit.findOne({ tier: account.tier });
      
      // Get available rewards
      const availableRewards = await this.getAvailableRewards(userId);
      
      return {
        ...account.toObject(),
        tierBenefits: tierBenefit,
        availableRewards,
        nextTierThreshold: this.getNextTierThreshold(account.tier),
        pointsToNextTier: this.getPointsToNextTier(account)
      };
    } catch (error) {
      console.error('Error getting user account:', error);
      throw error;
    }
  }

  // Get next tier threshold
  getNextTierThreshold(currentTier) {
    const thresholds = {
      'Bronze': 100,
      'Silver': 200,
      'Gold': 500,
      'Platinum': null // Highest tier
    };
    return thresholds[currentTier];
  }

  // Get points needed for next tier
  getPointsToNextTier(account) {
    const threshold = this.getNextTierThreshold(account.tier);
    if (!threshold) return 0;
    return Math.max(0, threshold - account.totalSpent);
  }

  // Award birthday bonus
  async awardBirthdayBonus(userId) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const tierBenefit = await TierBenefit.findOne({ tier: account.tier });
      
      if (!tierBenefit || !tierBenefit.birthdayBonus) {
        return null;
      }
      
      const bonus = tierBenefit.birthdayBonus;
      account.points += bonus;
      account.addTransaction(
        'bonus',
        bonus,
        `Birthday bonus - ${account.tier} tier`
      );
      
      await account.save();
      
      return { bonus, totalPoints: account.points };
    } catch (error) {
      console.error('Error awarding birthday bonus:', error);
      throw error;
    }
  }

  // Get loyalty statistics
  async getLoyaltyStats() {
    try {
      const totalAccounts = await LoyaltyAccount.countDocuments();
      const totalPointsAwarded = await LoyaltyAccount.aggregate([
        { $group: { _id: null, total: { $sum: '$pointsEarned' } } }
      ]);
      
      const tierDistribution = await LoyaltyAccount.aggregate([
        { $group: { _id: '$tier', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      const topCustomers = await LoyaltyAccount.getTopCustomers(5);
      
      return {
        totalAccounts,
        totalPointsAwarded: totalPointsAwarded[0]?.total || 0,
        tierDistribution,
        topCustomers
      };
    } catch (error) {
      console.error('Error getting loyalty stats:', error);
      throw error;
    }
  }

  // Create default rewards
  async createDefaultRewards() {
    try {
      const existingRewards = await Reward.countDocuments();
      if (existingRewards > 0) return;
      
      const defaultRewards = [
        {
          name: 'Free Small Coffee',
          description: 'Get a free small coffee of your choice',
          pointsRequired: 100,
          discountType: 'free_item',
          discountValue: 0,
          category: 'drink'
        },
        {
          name: '10% Off Your Order',
          description: 'Save 10% on your entire order',
          pointsRequired: 150,
          discountType: 'percentage',
          discountValue: 10,
          category: 'general'
        },
        {
          name: 'Free Medium Coffee',
          description: 'Get a free medium coffee of your choice',
          pointsRequired: 200,
          discountType: 'free_item',
          discountValue: 0,
          category: 'drink'
        },
        {
          name: '$5 Off Your Order',
          description: 'Save $5 on your order',
          pointsRequired: 300,
          discountType: 'fixed',
          discountValue: 5,
          category: 'general'
        },
        {
          name: 'Free Large Coffee',
          description: 'Get a free large coffee of your choice',
          pointsRequired: 400,
          discountType: 'free_item',
          discountValue: 0,
          category: 'drink'
        },
        {
          name: '20% Off Your Order',
          description: 'Save 20% on your entire order',
          pointsRequired: 500,
          discountType: 'percentage',
          discountValue: 20,
          category: 'general',
          tierRestriction: 'Gold'
        },
        {
          name: 'Free Pastry',
          description: 'Get a free pastry with your order',
          pointsRequired: 250,
          discountType: 'free_item',
          discountValue: 0,
          category: 'food'
        }
      ];
      
      await Reward.insertMany(defaultRewards);
      console.log('✅ Default rewards created');
    } catch (error) {
      console.error('Error creating default rewards:', error);
    }
  }
}

module.exports = new LoyaltyService();

