const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const LoyaltyService = require('../services/loyaltyService');
const { LoyaltyAccount, Reward, TierBenefit } = require('../models/loyalty.model');

/**
 * @route   GET /loyalty/account
 * @desc    Get user's loyalty account
 * @access  Private
 */
router.get('/account', auth, async (req, res) => {
  try {
    const account = await LoyaltyService.getUserAccount(req.user.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty account not found'
      });
    }
    
    res.json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Get loyalty account error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get loyalty account'
    });
  }
});

/**
 * @route   GET /loyalty/rewards
 * @desc    Get available rewards for user
 * @access  Private
 */
router.get('/rewards', auth, async (req, res) => {
  try {
    const rewards = await LoyaltyService.getAvailableRewards(req.user.id);
    
    res.json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rewards'
    });
  }
});

/**
 * @route   POST /loyalty/redeem
 * @desc    Redeem a reward
 * @access  Private
 */
router.post('/redeem', auth, async (req, res) => {
  try {
    const { rewardId, orderId } = req.body;
    
    if (!rewardId) {
      return res.status(400).json({
        success: false,
        message: 'Reward ID is required'
      });
    }
    
    const result = await LoyaltyService.redeemReward(req.user.id, rewardId, orderId);
    
    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      reward: result.reward,
      pointsUsed: result.pointsUsed,
      remainingPoints: result.remainingPoints
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to redeem reward'
    });
  }
});

/**
 * @route   GET /loyalty/transactions
 * @desc    Get user's loyalty transactions
 * @access  Private
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const account = await LoyaltyAccount.findByUserId(req.user.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty account not found'
      });
    }
    
    const transactions = account.transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((page - 1) * limit, page * limit);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: account.transactions.length,
        pages: Math.ceil(account.transactions.length / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get transactions'
    });
  }
});

/**
 * @route   GET /loyalty/tiers
 * @desc    Get all tier benefits
 * @access  Public
 */
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await TierBenefit.find().sort({ 
      tier: 1 // Bronze, Gold, Platinum, Silver
    });
    
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tier information'
    });
  }
});

/**
 * @route   POST /loyalty/birthday-bonus
 * @desc    Award birthday bonus (admin only)
 * @access  Private (Admin/Owner)
 */
router.post('/birthday-bonus', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required'
      });
    }
    
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const result = await LoyaltyService.awardBirthdayBonus(userId);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'No birthday bonus available for this user'
      });
    }
    
    res.json({
      success: true,
      message: 'Birthday bonus awarded successfully',
      bonus: result.bonus,
      totalPoints: result.totalPoints
    });
  } catch (error) {
    console.error('Award birthday bonus error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to award birthday bonus'
    });
  }
});

/**
 * @route   GET /loyalty/stats
 * @desc    Get loyalty program statistics (admin only)
 * @access  Private (Admin/Owner)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required'
      });
    }
    
    const stats = await LoyaltyService.getLoyaltyStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get loyalty statistics'
    });
  }
});

/**
 * @route   GET /loyalty/leaderboard
 * @desc    Get top customers leaderboard
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topCustomers = await LoyaltyAccount.getTopCustomers(parseInt(limit));
    
    res.json({
      success: true,
      leaderboard: topCustomers.map(customer => ({
        rank: topCustomers.indexOf(customer) + 1,
        firstName: customer.userId?.firstName || 'Anonymous',
        lastName: customer.userId?.lastName || '',
        tier: customer.tier,
        totalSpent: customer.totalSpent,
        points: customer.points,
        visits: customer.visits
      }))
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get leaderboard'
    });
  }
});

/**
 * @route   POST /loyalty/initialize
 * @desc    Initialize loyalty program (admin only)
 * @access  Private (Admin/Owner)
 */
router.post('/initialize', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required'
      });
    }
    
    await LoyaltyService.initializeTierBenefits();
    await LoyaltyService.createDefaultRewards();
    
    res.json({
      success: true,
      message: 'Loyalty program initialized successfully'
    });
  } catch (error) {
    console.error('Initialize loyalty program error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize loyalty program'
    });
  }
});

module.exports = router;

