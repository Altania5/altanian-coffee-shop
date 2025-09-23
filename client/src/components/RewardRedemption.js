import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const RewardRedemption = ({ user, onRewardSelected, selectedReward, onClearReward }) => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    if (user && user.token) {
      fetchAvailableRewards();
    }
  }, [user]);

  const fetchAvailableRewards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/loyalty/rewards');
      setRewards(response.data.rewards || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setError('Failed to load available rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleRewardSelect = (reward) => {
    onRewardSelected(reward);
    setShowRewards(false);
  };

  const handleClearReward = () => {
    onClearReward();
    setShowRewards(false);
  };


  if (!user || !user.token) {
    return null; // Don't show rewards for guest users
  }

  return (
    <div className="reward-redemption">
      <div className="reward-section-header">
        <h4>🎯 Loyalty Rewards</h4>
        <p>Use your loyalty points to save on this order</p>
      </div>

      {selectedReward ? (
        <div className="selected-reward">
          <div className="selected-reward-info">
            <div className="reward-name">{selectedReward.name}</div>
            <div className="reward-description">{selectedReward.description}</div>
            <div className="reward-points">{selectedReward.pointsRequired} points</div>
          </div>
          <button 
            onClick={handleClearReward}
            className="clear-reward-btn"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="reward-actions">
          {!showRewards ? (
            <button 
              onClick={() => setShowRewards(true)}
              className="show-rewards-btn"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Apply Reward'}
            </button>
          ) : (
            <div className="rewards-list">
              {error ? (
                <div className="error">{error}</div>
              ) : rewards.length === 0 ? (
                <div className="no-rewards">
                  <p>You don't have enough points for any rewards.</p>
                  <button 
                    onClick={() => setShowRewards(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="rewards-header">
                    <h5>Available Rewards</h5>
                    <button 
                      onClick={() => setShowRewards(false)}
                      className="close-btn"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="rewards-grid">
                    {rewards.map(reward => (
                      <div key={reward._id} className="reward-option">
                        <div className="reward-option-header">
                          <div className="reward-option-name">{reward.name}</div>
                          <div className="reward-option-points">{reward.pointsRequired} pts</div>
                        </div>
                        <div className="reward-option-description">{reward.description}</div>
                        <button 
                          onClick={() => handleRewardSelect(reward)}
                          className="select-reward-btn"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .reward-redemption {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          border: 2px solid #e9ecef;
        }

        .reward-section-header h4 {
          margin: 0 0 5px 0;
          color: #8B4513;
          font-size: 1.2rem;
        }

        .reward-section-header p {
          margin: 0 0 15px 0;
          color: #666;
          font-size: 0.9rem;
        }

        .selected-reward {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .selected-reward-info {
          flex: 1;
        }

        .reward-name {
          font-weight: bold;
          font-size: 1.1rem;
          margin-bottom: 5px;
        }

        .reward-description {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-bottom: 5px;
        }

        .reward-points {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .clear-reward-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .clear-reward-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .show-rewards-btn {
          background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
          width: 100%;
        }

        .show-rewards-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #A0522D 0%, #CD853F 100%);
          transform: translateY(-2px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }

        .show-rewards-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .rewards-list {
          background: white;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #e0e0e0;
        }

        .rewards-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .rewards-header h5 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #666;
          padding: 5px;
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: #f0f0f0;
          color: #333;
        }

        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .reward-option {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .reward-option:hover {
          border-color: #8B4513;
          transform: translateY(-2px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        .reward-option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .reward-option-name {
          font-weight: bold;
          color: #333;
          font-size: 1rem;
        }

        .reward-option-points {
          font-weight: bold;
          color: #8B4513;
          font-size: 0.9rem;
        }

        .reward-option-description {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .select-reward-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          width: 100%;
          transition: all 0.3s ease;
        }

        .select-reward-btn:hover {
          background: linear-gradient(135deg, #1e7e34 0%, #17a2b8 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .no-rewards {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .no-rewards p {
          margin: 0 0 15px 0;
        }

        .cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover {
          background: #5a6268;
        }

        .error {
          color: #dc3545;
          background: #f8d7da;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .rewards-grid {
            grid-template-columns: 1fr;
          }
          
          .selected-reward {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .clear-reward-btn {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default RewardRedemption;
