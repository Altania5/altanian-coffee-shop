import React, { useState, useEffect } from 'react';
import { getCentralizedAIService } from '../services/CentralizedAIService';
import api from '../utils/api';

const AIInsights = ({ userId }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    loadInsights();
  }, [userId, timeRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      
      // Get user's coffee logs for analysis
      const response = await api.get(`/coffee-logs?userId=${userId}&limit=100&days=${timeRange}`);
      const logs = response.data.data || [];
      
      if (logs.length === 0) {
        setInsights({
          hasData: false,
          message: 'No coffee logs found for analysis. Start logging shots to get personalized insights!'
        });
        setLoading(false);
        return;
      }

      // Analyze user's brewing patterns
      const analysis = analyzeBrewingPatterns(logs);
      setInsights(analysis);
      setLoading(false);
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights({
        hasData: false,
        message: 'Unable to load insights. Please try again later.'
      });
      setLoading(false);
    }
  };

  const analyzeBrewingPatterns = (logs) => {
    const patterns = {
      totalShots: logs.length,
      avgQuality: 0,
      qualityTrend: 'stable',
      commonIssues: [],
      strengths: [],
      recommendations: [],
      brewingStyle: 'balanced'
    };

    // Calculate average quality
    const validQualityLogs = logs.filter(log => log.shotQuality && log.shotQuality >= 1 && log.shotQuality <= 10);
    if (validQualityLogs.length > 0) {
      patterns.avgQuality = validQualityLogs.reduce((sum, log) => sum + log.shotQuality, 0) / validQualityLogs.length;
    }

    // Analyze extraction times
    const extractionTimes = logs.filter(log => log.extractionTime).map(log => log.extractionTime);
    if (extractionTimes.length > 0) {
      const avgExtractionTime = extractionTimes.reduce((sum, time) => sum + time, 0) / extractionTimes.length;
      
      if (avgExtractionTime < 25) {
        patterns.commonIssues.push('Extraction time tends to be short');
        patterns.recommendations.push('Try grinding finer to increase extraction time');
      } else if (avgExtractionTime > 35) {
        patterns.commonIssues.push('Extraction time tends to be long');
        patterns.recommendations.push('Consider grinding coarser to reduce extraction time');
      } else {
        patterns.strengths.push('Consistent extraction timing');
      }
    }

    // Analyze ratios
    const ratios = logs.filter(log => log.inWeight && log.outWeight).map(log => log.outWeight / log.inWeight);
    if (ratios.length > 0) {
      const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
      
      if (avgRatio < 1.8) {
        patterns.commonIssues.push('Brew ratios tend to be concentrated');
        patterns.recommendations.push('Try increasing yield for more balanced extraction');
        patterns.brewingStyle = 'concentrated';
      } else if (avgRatio > 2.2) {
        patterns.commonIssues.push('Brew ratios tend to be high');
        patterns.recommendations.push('Consider reducing yield to avoid over-extraction');
        patterns.brewingStyle = 'light';
      } else {
        patterns.strengths.push('Well-balanced brew ratios');
      }
    }

    // Analyze technique usage
    const wdtUsage = logs.filter(log => log.usedWDT).length;
    const puckScreenUsage = logs.filter(log => log.usedPuckScreen).length;
    const preInfusionUsage = logs.filter(log => log.usedPreInfusion).length;
    
    if (wdtUsage > logs.length * 0.7) {
      patterns.strengths.push('Consistent use of WDT technique');
    }
    if (puckScreenUsage > logs.length * 0.7) {
      patterns.strengths.push('Regular puck screen usage');
    }
    if (preInfusionUsage > logs.length * 0.7) {
      patterns.strengths.push('Frequent pre-infusion practice');
    }

    // Analyze quality trend
    if (validQualityLogs.length >= 10) {
      const recentLogs = validQualityLogs.slice(0, 5);
      const olderLogs = validQualityLogs.slice(-5);
      
      const recentAvg = recentLogs.reduce((sum, log) => sum + log.shotQuality, 0) / recentLogs.length;
      const olderAvg = olderLogs.reduce((sum, log) => sum + log.shotQuality, 0) / olderLogs.length;
      
      if (recentAvg > olderAvg + 0.5) {
        patterns.qualityTrend = 'improving';
      } else if (recentAvg < olderAvg - 0.5) {
        patterns.qualityTrend = 'declining';
      }
    }

    return {
      hasData: true,
      patterns,
      lastUpdated: new Date().toISOString()
    };
  };

  const getQualityTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getQualityTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return '#00aa00';
      case 'declining': return '#ff4444';
      default: return '#666';
    }
  };

  const getBrewingStyleDescription = (style) => {
    switch (style) {
      case 'concentrated': return 'You prefer concentrated, intense shots with lower ratios';
      case 'light': return 'You prefer lighter, more delicate shots with higher ratios';
      default: return 'You maintain a balanced approach to brewing';
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-container">
        <div className="loading-container">
          <div className="loading-spinner">Analyzing your brewing patterns...</div>
        </div>
      </div>
    );
  }

  if (!insights.hasData) {
    return (
      <div className="ai-insights-container">
        <div className="no-data-message">
          <h3>🧠 AI Insights</h3>
          <p>{insights.message}</p>
          <div className="call-to-action">
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/coffee-log'}
            >
              📝 Start Logging Shots
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights-container">
      <div className="insights-header">
        <h3>🧠 Your AI Brewing Insights</h3>
        <div className="time-range-selector">
          <label>Analysis Period:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      <div className="insights-grid">
        {/* Overview Card */}
        <div className="insight-card overview">
          <h4>📊 Overview</h4>
          <div className="overview-stats">
            <div className="stat">
              <span className="stat-label">Total Shots:</span>
              <span className="stat-value">{insights.patterns.totalShots}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Average Quality:</span>
              <span className="stat-value">{insights.patterns.avgQuality.toFixed(1)}/10</span>
            </div>
            <div className="stat">
              <span className="stat-label">Quality Trend:</span>
              <span 
                className="stat-value" 
                style={{ color: getQualityTrendColor(insights.patterns.qualityTrend) }}
              >
                {getQualityTrendIcon(insights.patterns.qualityTrend)} {insights.patterns.qualityTrend}
              </span>
            </div>
          </div>
        </div>

        {/* Brewing Style Card */}
        <div className="insight-card style">
          <h4>🎯 Your Brewing Style</h4>
          <div className="style-content">
            <div className="style-description">
              {getBrewingStyleDescription(insights.patterns.brewingStyle)}
            </div>
            <div className="style-tags">
              <span className="style-tag">{insights.patterns.brewingStyle}</span>
            </div>
          </div>
        </div>

        {/* Strengths Card */}
        {insights.patterns.strengths.length > 0 && (
          <div className="insight-card strengths">
            <h4>💪 Your Strengths</h4>
            <ul className="strengths-list">
              {insights.patterns.strengths.map((strength, index) => (
                <li key={index} className="strength-item">
                  <span className="strength-icon">✅</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for Improvement */}
        {insights.patterns.commonIssues.length > 0 && (
          <div className="insight-card improvements">
            <h4>🔧 Areas for Improvement</h4>
            <ul className="improvements-list">
              {insights.patterns.commonIssues.map((issue, index) => (
                <li key={index} className="improvement-item">
                  <span className="improvement-icon">⚠️</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insights.patterns.recommendations.length > 0 && (
          <div className="insight-card recommendations">
            <h4>💡 AI Recommendations</h4>
            <ul className="recommendations-list">
              {insights.patterns.recommendations.map((rec, index) => (
                <li key={index} className="recommendation-item">
                  <span className="recommendation-icon">🎯</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="insights-footer">
        <p>
          <small>
            Insights generated from {insights.patterns.totalShots} shots over the last {timeRange} days. 
            Last updated: {new Date(insights.lastUpdated).toLocaleString()}
          </small>
        </p>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={loadInsights}
        >
          🔄 Refresh Analysis
        </button>
      </div>
    </div>
  );
};

export default AIInsights;

