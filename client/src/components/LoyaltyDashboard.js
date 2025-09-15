import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './LoyaltyDashboard.css';

const LoyaltyDashboard = ({ user, token }) => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user && token) {
      fetchLoyaltyData();
    }
  }, [user, token]);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      
      const [accountRes, rewardsRes, transactionsRes] = await Promise.all([
        api.get('/loyalty/account'),
        api.get('/loyalty/rewards'),
        api.get('/loyalty/transactions')
      ]);

      setLoyaltyData(accountRes.data.account);
      setRewards(rewardsRes.data.rewards);
      setTransactions(transactionsRes.data.transactions);
      setError(null);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      setError('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (rewardId) => {
    try {
      await api.post('/loyalty/redeem', { rewardId });
      
      // Refresh data after redemption
      fetchLoyaltyData();
      
      // Show success message (you could use a toast notification here)
      alert('Reward redeemed successfully!');
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert('Failed to redeem reward: ' + (error.response?.data?.message || error.message));
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      'Bronze': '#cd7f32',
      'Silver': '#c0c0c0',
      'Gold': '#ffd700',
      'Platinum': '#e5e4e2'
    };
    return colors[tier] || '#6c757d';
  };

  const getTierIcon = (tier) => {
    const icons = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '💎'
    };
    return icons[tier] || '⭐';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="loyalty-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your loyalty information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loyalty-dashboard error">
        <div className="error-message">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchLoyaltyData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!loyaltyData) {
    return (
      <div className="loyalty-dashboard">
        <div className="no-account">
          <h2>Join Our Loyalty Program!</h2>
          <p>Start earning points with every purchase and unlock amazing rewards.</p>
          <button className="join-btn">Join Now</button>
        </div>
      </div>
    );
  }

  const progressPercentage = loyaltyData.nextTierThreshold 
    ? ((loyaltyData.totalSpent / loyaltyData.nextTierThreshold) * 100)
    : 100;

  return (
    <div className="loyalty-dashboard">
      <div className="loyalty-header">
        <h2>Your Loyalty Status</h2>
        <div className="welcome-message">
          Welcome back, {user.firstName}! 👋
        </div>
      </div>

      {/* Tier Status Card */}
      <div className="tier-card" style={{ borderColor: getTierColor(loyaltyData.tier) }}>
        <div className="tier-info">
          <div className="tier-icon">{getTierIcon(loyaltyData.tier)}</div>
          <div className="tier-details">
            <h3 className="tier-name">{loyaltyData.tier} Member</h3>
            <p className="tier-description">
              {loyaltyData.tierBenefits?.benefits?.[0]?.description || 'Enjoy exclusive benefits and rewards'}
            </p>
          </div>
        </div>
        
        {loyaltyData.nextTierThreshold && (
          <div className="tier-progress">
            <div className="progress-label">
              <span>Progress to {loyaltyData.tier === 'Bronze' ? 'Silver' : loyaltyData.tier === 'Silver' ? 'Gold' : 'Platinum'}</span>
              <span>${loyaltyData.totalSpent} / ${loyaltyData.nextTierThreshold}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: getTierColor(loyaltyData.tier)
                }}
              ></div>
            </div>
            <div className="progress-text">
              ${loyaltyData.pointsToNextTier} more to reach the next tier
            </div>
          </div>
        )}
      </div>

      {/* Points Display */}
      <div className="points-section">
        <div className="points-card">
          <div className="points-current">
            <span className="points-number">{loyaltyData.points}</span>
            <span className="points-label">Points</span>
          </div>
          <div className="points-stats">
            <div className="stat">
              <span className="stat-value">{loyaltyData.pointsEarned}</span>
              <span className="stat-label">Earned</span>
            </div>
            <div className="stat">
              <span className="stat-value">{loyaltyData.pointsRedeemed}</span>
              <span className="stat-label">Redeemed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{loyaltyData.visits}</span>
              <span className="stat-label">Visits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="loyalty-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          Rewards ({rewards.length})
        </button>
        <button 
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total Spent</h4>
                <div className="stat-value">${loyaltyData.totalSpent.toFixed(2)}</div>
              </div>
              <div className="stat-card">
                <h4>Member Since</h4>
                <div className="stat-value">{formatDate(loyaltyData.anniversaryDate)}</div>
              </div>
              <div className="stat-card">
                <h4>Last Visit</h4>
                <div className="stat-value">
                  {loyaltyData.lastVisit ? formatDate(loyaltyData.lastVisit) : 'Never'}
                </div>
              </div>
              <div className="stat-card">
                <h4>Points Multiplier</h4>
                <div className="stat-value">
                  {loyaltyData.tierBenefits?.pointsMultiplier || 1.0}x
                </div>
              </div>
            </div>

            {/* Tier Benefits */}
            {loyaltyData.tierBenefits && (
              <div className="benefits-section">
                <h3>Your Benefits</h3>
                <div className="benefits-list">
                  {loyaltyData.tierBenefits.benefits.map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <span className="benefit-icon">✨</span>
                      <div className="benefit-content">
                        <div className="benefit-name">{benefit.name}</div>
                        <div className="benefit-description">{benefit.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-tab">
            <h3>Available Rewards</h3>
            {rewards.length === 0 ? (
              <div className="no-rewards">
                <p>You don't have enough points for any rewards yet.</p>
                <p>Keep earning points with your purchases!</p>
              </div>
            ) : (
              <div className="rewards-grid">
                {rewards.map(reward => (
                  <div key={reward._id} className="reward-card">
                    <div className="reward-header">
                      <h4>{reward.name}</h4>
                      <div className="reward-cost">{reward.pointsRequired} pts</div>
                    </div>
                    <p className="reward-description">{reward.description}</p>
                    <div className="reward-category">{reward.category}</div>
                    <button 
                      onClick={() => redeemReward(reward._id)}
                      className="redeem-btn"
                    >
                      Redeem
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <h3>Transaction History</h3>
            {transactions.length === 0 ? (
              <div className="no-transactions">
                <p>No transactions yet.</p>
                <p>Start making purchases to earn points!</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map((transaction, index) => (
                  <div key={index} className="transaction-item">
                    <div className="transaction-icon">
                      {transaction.type === 'earned' ? '➕' : 
                       transaction.type === 'redeemed' ? '➖' : 
                       transaction.type === 'bonus' ? '🎁' : '📝'}
                    </div>
                    <div className="transaction-content">
                      <div className="transaction-description">{transaction.description}</div>
                      <div className="transaction-time">
                        {formatDate(transaction.createdAt)} at {formatTime(transaction.createdAt)}
                      </div>
                    </div>
                    <div className={`transaction-points ${transaction.type}`}>
                      {transaction.type === 'earned' || transaction.type === 'bonus' ? '+' : '-'}
                      {transaction.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyDashboard;
