import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './HealthInsights.css';

function HealthInsights({ user }) {
  const [activeTab, setActiveTab] = useState('caffeine');
  const [healthData, setHealthData] = useState({
    caffeineIntake: [],
    sleepData: [],
    recommendations: [],
    weeklyStats: null
  });
  const [loading, setLoading] = useState(true);
  const [sleepEntry, setSleepEntry] = useState({
    hours: '',
    quality: 5,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadHealthData();
    }
  }, [user]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      const [caffeineResponse, sleepResponse, recommendationsResponse] = await Promise.all([
        api.get('/health/caffeine'),
        api.get('/health/sleep'),
        api.get('/health/recommendations')
      ]);

      setHealthData({
        caffeineIntake: caffeineResponse.data.caffeineIntake || [],
        sleepData: sleepResponse.data.sleepData || [],
        recommendations: recommendationsResponse.data.recommendations || [],
        weeklyStats: caffeineResponse.data.weeklyStats || null
      });
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSleepEntry = async () => {
    if (!sleepEntry.hours || sleepEntry.hours < 0 || sleepEntry.hours > 24) {
      alert('Please enter a valid number of hours (0-24)');
      return;
    }

    try {
      await api.post('/health/sleep', sleepEntry);
      
      // Reset form
      setSleepEntry({ hours: '', quality: 5, notes: '' });
      
      // Reload data
      loadHealthData();
      
      alert('Sleep entry added successfully!');
    } catch (error) {
      console.error('Failed to add sleep entry:', error);
      alert('Failed to add sleep entry');
    }
  };

  const calculateCaffeineIntake = (orders) => {
    const caffeinePerDrink = {
      'Espresso': 64,
      'Americano': 64,
      'Cappuccino': 64,
      'Latte': 64,
      'Macchiato': 64,
      'Mocha': 64,
      'Cold Brew': 200,
      'Iced Coffee': 165,
      'Frappuccino': 90,
      'Hot Chocolate': 25,
      'Tea': 40
    };

    return orders.reduce((total, order) => {
      const orderCaffeine = order.items?.reduce((orderTotal, item) => {
        const baseCaffeine = caffeinePerDrink[item.productName] || 64;
        const extraShots = item.customizations?.extraShots?.quantity || 0;
        return orderTotal + (baseCaffeine + (extraShots * 64)) * item.quantity;
      }, 0) || 0;
      
      return total + orderCaffeine;
    }, 0);
  };

  const getCaffeineRecommendation = (dailyIntake) => {
    if (dailyIntake > 400) {
      return {
        level: 'high',
        message: 'Your caffeine intake is high. Consider reducing or switching to decaf.',
        color: '#CD5C5C'
      };
    } else if (dailyIntake > 200) {
      return {
        level: 'moderate',
        message: 'Your caffeine intake is moderate. You\'re doing well!',
        color: '#DAA520'
      };
    } else {
      return {
        level: 'low',
        message: 'Your caffeine intake is low. You could enjoy more coffee!',
        color: '#8FBC8F'
      };
    }
  };

  const getSleepRecommendation = (hours, quality) => {
    if (hours < 6) {
      return {
        level: 'poor',
        message: 'You\'re not getting enough sleep. Consider reducing evening caffeine.',
        color: '#CD5C5C'
      };
    } else if (hours > 9) {
      return {
        level: 'excessive',
        message: 'You\'re sleeping a lot. This might affect your energy levels.',
        color: '#DAA520'
      };
    } else if (quality < 3) {
      return {
        level: 'poor',
        message: 'Your sleep quality is poor. Try avoiding caffeine after 2 PM.',
        color: '#CD5C5C'
      };
    } else {
      return {
        level: 'good',
        message: 'Great sleep habits! Keep it up.',
        color: '#8FBC8F'
      };
    }
  };

  if (loading) {
    return (
      <div className="health-insights">
        <div className="loading-spinner"></div>
        <p>Loading health insights...</p>
      </div>
    );
  }

  return (
    <div className="health-insights">
      <div className="health-header">
        <h3>💚 Health Insights</h3>
        <div className="health-tabs">
          <button 
            className={`tab ${activeTab === 'caffeine' ? 'active' : ''}`}
            onClick={() => setActiveTab('caffeine')}
          >
            ☕ Caffeine
          </button>
          <button 
            className={`tab ${activeTab === 'sleep' ? 'active' : ''}`}
            onClick={() => setActiveTab('sleep')}
          >
            😴 Sleep
          </button>
          <button 
            className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Tips
          </button>
        </div>
      </div>

      <div className="health-content">
        {activeTab === 'caffeine' && (
          <CaffeineTab 
            caffeineData={healthData.caffeineIntake}
            weeklyStats={healthData.weeklyStats}
            getRecommendation={getCaffeineRecommendation}
          />
        )}

        {activeTab === 'sleep' && (
          <SleepTab 
            sleepData={healthData.sleepData}
            sleepEntry={sleepEntry}
            setSleepEntry={setSleepEntry}
            onAddSleepEntry={addSleepEntry}
            getRecommendation={getSleepRecommendation}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab 
            recommendations={healthData.recommendations}
            caffeineData={healthData.caffeineIntake}
            sleepData={healthData.sleepData}
          />
        )}
      </div>
    </div>
  );
}

// Caffeine Tab Component
function CaffeineTab({ caffeineData, weeklyStats, getRecommendation }) {
  const todayIntake = caffeineData.find(entry => 
    new Date(entry.date).toDateString() === new Date().toDateString()
  )?.totalCaffeine || 0;

  const recommendation = getRecommendation(todayIntake);

  return (
    <div className="caffeine-tab">
      <div className="daily-summary">
        <h4>Today's Caffeine Intake</h4>
        <div className="caffeine-meter">
          <div className="caffeine-amount">
            <span className="amount">{todayIntake}</span>
            <span className="unit">mg</span>
          </div>
          <div className="caffeine-bar">
            <div 
              className="caffeine-fill"
              style={{ 
                width: `${Math.min((todayIntake / 400) * 100, 100)}%`,
                backgroundColor: recommendation.color
              }}
            ></div>
          </div>
          <div className="caffeine-labels">
            <span>0mg</span>
            <span>400mg (Recommended Max)</span>
          </div>
        </div>
        
        <div className="recommendation-card" style={{ borderColor: recommendation.color }}>
          <span className="recommendation-icon">
            {recommendation.level === 'high' ? '⚠️' : 
             recommendation.level === 'moderate' ? '👍' : '☕'}
          </span>
          <p>{recommendation.message}</p>
        </div>
      </div>

      {weeklyStats && (
        <div className="weekly-stats">
          <h4>Weekly Overview</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Average Daily</span>
              <span className="stat-value">{weeklyStats.averageDaily}mg</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Highest Day</span>
              <span className="stat-value">{weeklyStats.highestDay}mg</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Week</span>
              <span className="stat-value">{weeklyStats.totalWeek}mg</span>
            </div>
          </div>
        </div>
      )}

      <div className="caffeine-history">
        <h4>Recent History</h4>
        <div className="history-list">
          {caffeineData.slice(0, 7).map(entry => (
            <div key={entry.date} className="history-item">
              <span className="date">{new Date(entry.date).toLocaleDateString()}</span>
              <span className="amount">{entry.totalCaffeine}mg</span>
              <span className="drinks">{entry.drinkCount} drinks</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sleep Tab Component
function SleepTab({ sleepData, sleepEntry, setSleepEntry, onAddSleepEntry, getRecommendation }) {
  const lastSleepEntry = sleepData[0];
  const recommendation = lastSleepEntry ? 
    getRecommendation(lastSleepEntry.hours, lastSleepEntry.quality) : null;

  return (
    <div className="sleep-tab">
      <div className="sleep-entry">
        <h4>Log Sleep</h4>
        <div className="sleep-form">
          <div className="form-group">
            <label htmlFor="sleep-hours">Hours Slept</label>
            <input
              id="sleep-hours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepEntry.hours}
              onChange={(e) => setSleepEntry({ ...sleepEntry, hours: e.target.value })}
              placeholder="8.5"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="sleep-quality">Sleep Quality (1-10)</label>
            <input
              id="sleep-quality"
              type="range"
              min="1"
              max="10"
              value={sleepEntry.quality}
              onChange={(e) => setSleepEntry({ ...sleepEntry, quality: parseInt(e.target.value) })}
            />
            <span className="quality-value">{sleepEntry.quality}/10</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="sleep-notes">Notes (Optional)</label>
            <textarea
              id="sleep-notes"
              value={sleepEntry.notes}
              onChange={(e) => setSleepEntry({ ...sleepEntry, notes: e.target.value })}
              placeholder="Any notes about your sleep..."
              rows={2}
            />
          </div>
          
          <button 
            className="add-sleep-btn"
            onClick={onAddSleepEntry}
            disabled={!sleepEntry.hours}
          >
            💤 Add Sleep Entry
          </button>
        </div>
      </div>

      {lastSleepEntry && recommendation && (
        <div className="sleep-recommendation">
          <h4>Latest Sleep Analysis</h4>
          <div className="recommendation-card" style={{ borderColor: recommendation.color }}>
            <span className="recommendation-icon">
              {recommendation.level === 'poor' ? '😴' : 
               recommendation.level === 'excessive' ? '😴' : '😊'}
            </span>
            <p>{recommendation.message}</p>
          </div>
        </div>
      )}

      <div className="sleep-history">
        <h4>Sleep History</h4>
        <div className="history-list">
          {sleepData.slice(0, 7).map(entry => (
            <div key={entry._id} className="history-item">
              <span className="date">{new Date(entry.date).toLocaleDateString()}</span>
              <span className="hours">{entry.hours}h</span>
              <span className="quality">Quality: {entry.quality}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Recommendations Tab Component
function RecommendationsTab({ recommendations, caffeineData, sleepData }) {
  const personalizedTips = [
    {
      category: 'Caffeine Timing',
      tip: 'Avoid caffeine 6 hours before bedtime for better sleep quality.',
      icon: '⏰'
    },
    {
      category: 'Hydration',
      tip: 'Drink water between coffee drinks to stay hydrated.',
      icon: '💧'
    },
    {
      category: 'Sleep Hygiene',
      tip: 'Maintain consistent sleep and wake times, even on weekends.',
      icon: '🌙'
    },
    {
      category: 'Caffeine Sensitivity',
      tip: 'If you feel jittery, try switching to half-caf or decaf options.',
      icon: '☕'
    }
  ];

  return (
    <div className="recommendations-tab">
      <h4>Personalized Health Tips</h4>
      
      <div className="tips-grid">
        {personalizedTips.map((tip, index) => (
          <div key={index} className="tip-card">
            <div className="tip-icon">{tip.icon}</div>
            <div className="tip-content">
              <h5>{tip.category}</h5>
              <p>{tip.tip}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="health-facts">
        <h4>Did You Know?</h4>
        <div className="facts-list">
          <div className="fact-item">
            <span className="fact-icon">🧠</span>
            <p>Caffeine can improve focus and alertness for up to 6 hours</p>
          </div>
          <div className="fact-item">
            <span className="fact-icon">💪</span>
            <p>Moderate coffee consumption may reduce the risk of certain diseases</p>
          </div>
          <div className="fact-item">
            <span className="fact-icon">😴</span>
            <p>Sleep quality is more important than sleep quantity</p>
          </div>
          <div className="fact-item">
            <span className="fact-icon">⚡</span>
            <p>Caffeine tolerance builds up over time with regular consumption</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthInsights;
