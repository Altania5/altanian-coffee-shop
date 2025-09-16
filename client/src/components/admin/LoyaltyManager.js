import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const LoyaltyManager = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      const [statsRes, leaderboardRes] = await Promise.all([
        api.get('/loyalty/stats'),
        api.get('/loyalty/leaderboard?limit=10')
      ]);
      
      setStats(statsRes.data.stats);
      setLeaderboard(leaderboardRes.data.leaderboard);
      setError(null);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      setError('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const awardBirthdayBonus = async (userId) => {
    try {
      await api.post('/loyalty/birthday-bonus', { userId });
      alert('Birthday bonus awarded successfully!');
      fetchLoyaltyData(); // Refresh data
    } catch (error) {
      console.error('Error awarding birthday bonus:', error);
      alert('Failed to award birthday bonus: ' + (error.response?.data?.message || error.message));
    }
  };

  const initializeLoyaltySystem = async () => {
    try {
      await api.post('/loyalty/initialize');
      alert('Loyalty system initialized successfully!');
      fetchLoyaltyData(); // Refresh data
    } catch (error) {
      console.error('Error initializing loyalty system:', error);
      alert('Failed to initialize loyalty system: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="loyalty-manager">
        <div className="loading">Loading loyalty data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loyalty-manager">
        <div className="error">{error}</div>
        <button onClick={fetchLoyaltyData} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="loyalty-manager">
      <div className="loyalty-manager-header">
        <h2>Loyalty Program Management</h2>
        <div className="action-buttons">
          <button onClick={initializeLoyaltySystem} className="btn btn-primary">
            Initialize System
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        <button 
          className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          🎁 Rewards
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'stats' && stats && (
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalAccounts}</div>
                  <div className="stat-label">Total Members</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalPointsAwarded}</div>
                  <div className="stat-label">Points Awarded</div>
                </div>
              </div>
            </div>

            <div className="tier-distribution">
              <h3>Tier Distribution</h3>
              <div className="tier-stats">
                {stats.tierDistribution.map((tier, index) => (
                  <div key={index} className="tier-stat">
                    <div className="tier-name">{tier._id}</div>
                    <div className="tier-count">{tier.count} members</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="top-customers">
              <h3>Top Customers</h3>
              <div className="customer-list">
                {stats.topCustomers.slice(0, 5).map((customer, index) => (
                  <div key={index} className="customer-item">
                    <div className="customer-rank">#{index + 1}</div>
                    <div className="customer-info">
                      <div className="customer-name">
                        {customer.userId?.firstName} {customer.userId?.lastName}
                      </div>
                      <div className="customer-tier">{customer.tier}</div>
                    </div>
                    <div className="customer-stats">
                      <div className="customer-points">{customer.points} pts</div>
                      <div className="customer-spent">${customer.totalSpent}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <h3>Top Customers Leaderboard</h3>
            <div className="leaderboard-table">
              <div className="leaderboard-header">
                <div>Rank</div>
                <div>Customer</div>
                <div>Tier</div>
                <div>Points</div>
                <div>Total Spent</div>
                <div>Visits</div>
              </div>
              {leaderboard.map((customer, index) => (
                <div key={index} className="leaderboard-row">
                  <div className="rank">
                    <span className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="customer">
                    {customer.firstName} {customer.lastName}
                  </div>
                  <div className="tier">
                    <span className={`tier-badge tier-${customer.tier.toLowerCase()}`}>
                      {customer.tier}
                    </span>
                  </div>
                  <div className="points">{customer.points}</div>
                  <div className="spent">${customer.totalSpent}</div>
                  <div className="visits">{customer.visits}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-section">
            <h3>Manage Rewards</h3>
            <p>Reward management features coming soon...</p>
            <div className="rewards-info">
              <p>Current rewards in the system:</p>
              <ul>
                <li>Free Small Coffee - 100 points</li>
                <li>10% Off Order - 150 points</li>
                <li>Free Medium Coffee - 200 points</li>
                <li>Free Pastry - 250 points</li>
                <li>$5 Off Order - 300 points</li>
                <li>Free Large Coffee - 400 points</li>
                <li>20% Off Order (Gold tier) - 500 points</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .loyalty-manager {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .loyalty-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .loyalty-manager-header h2 {
          margin: 0;
          color: #333;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #8B4513;
          color: white;
        }

        .btn-primary:hover {
          background: #A0522D;
        }

        .admin-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab-button {
          padding: 12px 24px;
          border: none;
          background: transparent;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          transition: all 0.3s ease;
        }

        .tab-button.active {
          color: #8B4513;
          border-bottom-color: #8B4513;
        }

        .tab-button:hover {
          color: #8B4513;
        }

        .tab-content {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #8B4513;
        }

        .stat-icon {
          font-size: 2rem;
          margin-right: 15px;
        }

        .stat-number {
          font-size: 1.8rem;
          font-weight: bold;
          color: #8B4513;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .tier-distribution {
          margin-bottom: 30px;
        }

        .tier-distribution h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .tier-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .tier-stat {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }

        .tier-name {
          font-weight: bold;
          color: #8B4513;
          margin-bottom: 5px;
        }

        .tier-count {
          font-size: 0.9rem;
          color: #666;
        }

        .top-customers h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .customer-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .customer-item {
          display: flex;
          align-items: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .customer-rank {
          font-weight: bold;
          color: #8B4513;
          margin-right: 15px;
          min-width: 30px;
        }

        .customer-info {
          flex: 1;
        }

        .customer-name {
          font-weight: 500;
          color: #333;
        }

        .customer-tier {
          font-size: 0.8rem;
          color: #666;
          text-transform: uppercase;
        }

        .customer-stats {
          text-align: right;
        }

        .customer-points {
          font-weight: bold;
          color: #8B4513;
        }

        .customer-spent {
          font-size: 0.9rem;
          color: #666;
        }

        .leaderboard-section h3 {
          color: #333;
          margin-bottom: 20px;
        }

        .leaderboard-table {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .leaderboard-header {
          display: grid;
          grid-template-columns: 60px 1fr 100px 80px 100px 80px;
          gap: 15px;
          padding: 15px;
          background: #f8f9fa;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
        }

        .leaderboard-row {
          display: grid;
          grid-template-columns: 60px 1fr 100px 80px 100px 80px;
          gap: 15px;
          padding: 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .leaderboard-row:last-child {
          border-bottom: none;
        }

        .rank-badge {
          display: inline-block;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          text-align: center;
          line-height: 25px;
          font-size: 0.8rem;
          font-weight: bold;
          color: white;
        }

        .rank-1 { background: #ffd700; }
        .rank-2 { background: #c0c0c0; }
        .rank-3 { background: #cd7f32; }

        .tier-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .tier-bronze { background: #cd7f32; color: white; }
        .tier-silver { background: #c0c0c0; color: white; }
        .tier-gold { background: #ffd700; color: black; }
        .tier-platinum { background: #e5e4e2; color: black; }

        .rewards-section h3 {
          color: #333;
          margin-bottom: 20px;
        }

        .rewards-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }

        .rewards-info ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .rewards-info li {
          margin: 5px 0;
          color: #666;
        }

        .loading, .error {
          text-align: center;
          padding: 40px;
          font-size: 1.1rem;
        }

        .error {
          color: #dc3545;
          background: #f8d7da;
          border-radius: 8px;
          margin: 20px 0;
        }

        .retry-btn {
          background: #8B4513;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        }

        .retry-btn:hover {
          background: #A0522D;
        }
      `}</style>
    </div>
  );
};

export default LoyaltyManager;
