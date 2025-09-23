import React, { useState, useEffect, useCallback } from 'react';
import smartRecommendationService from '../services/SmartRecommendationService';
import './SmartRecommendations.css';

function SmartRecommendations({ user, onRecommendationClick }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await smartRecommendationService.generateRecommendations(user.id);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, loadRecommendations]);

  const handleRecommendationClick = (drinkName) => {
    if (onRecommendationClick) {
      onRecommendationClick(drinkName);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⭐';
      case 'low': return '💡';
      default: return '☕';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'weather': return '🌤️';
      case 'time': return '⏰';
      case 'preference': return '❤️';
      default: return '☕';
    }
  };

  if (loading) {
    return (
      <div className="smart-recommendations">
        <div className="recommendations-header">
          <h3>🤖 Smart Recommendations</h3>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smart-recommendations">
        <div className="recommendations-header">
          <h3>🤖 Smart Recommendations</h3>
          <button onClick={loadRecommendations} className="retry-btn">
            🔄 Retry
          </button>
        </div>
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.recommendations.length === 0) {
    return (
      <div className="smart-recommendations">
        <div className="recommendations-header">
          <h3>🤖 Smart Recommendations</h3>
        </div>
        <div className="no-recommendations">
          <span className="no-rec-icon">☕</span>
          <p>No recommendations available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-recommendations">
      <div className="recommendations-header">
        <h3>🤖 Smart Recommendations</h3>
        <div className="header-actions">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="expand-btn"
            title={expanded ? 'Show less' : 'Show more'}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={loadRecommendations} className="refresh-btn" title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {recommendations.weather && (
        <div className="weather-info">
          <span className="weather-icon">🌤️</span>
          <span className="weather-text">
            {recommendations.weather.location}: {Math.round(recommendations.weather.temperature)}°C, {recommendations.weather.condition}
          </span>
        </div>
      )}

      <div className={`recommendations-list ${expanded ? 'expanded' : 'collapsed'}`}>
        {recommendations.recommendations.map((rec, index) => (
          <div key={index} className="recommendation-item">
            <div className="recommendation-header">
              <span className="type-icon">{getTypeIcon(rec.type)}</span>
              <span className="priority-icon">{getPriorityIcon(rec.priority)}</span>
              <span className="recommendation-reason">{rec.reason}</span>
            </div>
            
            <div className="recommended-drinks">
              {rec.drinks.map((drink, drinkIndex) => (
                <button
                  key={drinkIndex}
                  className="drink-recommendation"
                  onClick={() => handleRecommendationClick(drink)}
                >
                  {drink}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {recommendations.userPreferences && (
        <div className="preferences-summary">
          <h4>Your Preferences</h4>
          <div className="preference-items">
            <div className="preference-item">
              <span className="pref-label">Taste:</span>
              <span className="pref-value">
                Sweet: {recommendations.userPreferences.tasteProfile.sweetness}/5 | 
                Acidity: {recommendations.userPreferences.tasteProfile.acidity}/5
              </span>
            </div>
            <div className="preference-item">
              <span className="pref-label">Size:</span>
              <span className="pref-value">{recommendations.userPreferences.orderingPatterns.preferredSize}</span>
            </div>
            <div className="preference-item">
              <span className="pref-label">Temperature:</span>
              <span className="pref-value">{recommendations.userPreferences.orderingPatterns.preferredTemperature}</span>
            </div>
          </div>
        </div>
      )}

      <div className="recommendations-footer">
        <small>
          Generated at {new Date(recommendations.generatedAt).toLocaleTimeString()}
        </small>
      </div>
    </div>
  );
}

export default SmartRecommendations;
