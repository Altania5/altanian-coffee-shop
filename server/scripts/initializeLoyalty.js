const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { LoyaltyAccount, Reward, TierBenefit } = require('../models/loyalty.model');
const LoyaltyService = require('../services/loyaltyService');

async function initializeLoyaltySystem() {
  try {
    console.log('🚀 Initializing Loyalty System...');
    
    // Connect to MongoDB
    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    // Initialize tier benefits
    console.log('📊 Setting up tier benefits...');
    await LoyaltyService.initializeTierBenefits();
    
    // Create default rewards
    console.log('🎁 Creating default rewards...');
    await LoyaltyService.createDefaultRewards();
    
    console.log('✅ Loyalty system initialized successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Tier benefits: Bronze, Silver, Gold, Platinum');
    console.log('- Default rewards created');
    console.log('- System ready for use');
    
  } catch (error) {
    console.error('❌ Error initializing loyalty system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  initializeLoyaltySystem();
}

module.exports = initializeLoyaltySystem;
