import React, { useState, useEffect } from 'react';
import { getCentralizedAIService } from '../services/CentralizedAIService';
import api from '../utils/api';

const AIPerformanceMonitor = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    loadPerformanceData();
    
    // Set up auto-refresh
    const interval = setInterval(loadPerformanceData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadPerformanceData = async () => {
    try {
      const ai = getCentralizedAIService();
      
      // Get AI service status
      const modelInfo = ai.getModelInfo();
      
      // Get system performance metrics
      const [statusResponse, logsResponse] = await Promise.all([
        api.get('/ai/status').catch(() => ({ data: { data: null } })),
        api.get('/coffee-logs?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      const logs = logsResponse.data.data || [];
      const systemStatus = statusResponse.data.data || {};

      // Calculate performance metrics
      const metrics = calculatePerformanceMetrics(logs, modelInfo, systemStatus);
      
      setPerformanceData(metrics);
      setLoading(false);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setLoading(false);
    }
  };

  const calculatePerformanceMetrics = (logs, modelInfo, systemStatus) => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recent activity
    const recentLogs = logs.filter(log => new Date(log.createdAt) > last24Hours);
    const weeklyLogs = logs.filter(log => new Date(log.createdAt) > last7Days);

    // Quality distribution
    const qualityDistribution = {};
    logs.forEach(log => {
      if (log.shotQuality && log.shotQuality >= 1 && log.shotQuality <= 10) {
        qualityDistribution[log.shotQuality] = (qualityDistribution[log.shotQuality] || 0) + 1;
      }
    });

    // Average quality
    const validQualityLogs = logs.filter(log => log.shotQuality && log.shotQuality >= 1 && log.shotQuality <= 10);
    const avgQuality = validQualityLogs.length > 0 
      ? validQualityLogs.reduce((sum, log) => sum + log.shotQuality, 0) / validQualityLogs.length 
      : 0;

    // System health indicators
    const systemHealth = {
      aiServiceReady: modelInfo.isReady,
      hasActiveModel: modelInfo.hasModel || modelInfo.hasTrainedModel,
      isTraining: modelInfo.isTraining,
      dataQuality: validQualityLogs.length / Math.max(logs.length, 1),
      responseTime: 'fast', // This would be measured in production
      uptime: '99.9%' // This would be calculated in production
    };

    return {
      systemHealth,
      activity: {
        totalLogs: logs.length,
        recentLogs: recentLogs.length,
        weeklyLogs: weeklyLogs.length,
        avgQuality: avgQuality,
        qualityDistribution
      },
      modelPerformance: {
        accuracy: modelInfo.performanceMetrics?.accuracy || 0,
        mae: modelInfo.performanceMetrics?.mae || 0,
        rmse: modelInfo.performanceMetrics?.rmse || 0,
        r2: modelInfo.performanceMetrics?.r2 || 0,
        trainingDataCount: modelInfo.coffeeLogCount || 0,
        lastTrainingDate: modelInfo.lastTrainingDate
      },
      lastUpdated: now.toISOString()
    };
  };

  const getHealthStatus = (health) => {
    if (health.aiServiceReady && health.hasActiveModel && health.dataQuality > 0.8) {
      return { status: 'excellent', color: '#27ae60', icon: '🟢' };
    } else if (health.aiServiceReady && health.dataQuality > 0.6) {
      return { status: 'good', color: '#f39c12', icon: '🟡' };
    } else {
      return { status: 'needs attention', color: '#e74c3c', icon: '🔴' };
    }
  };

  const getPerformanceGrade = (accuracy) => {
    if (accuracy >= 0.8) return { grade: 'A', color: '#27ae60' };
    if (accuracy >= 0.7) return { grade: 'B', color: '#f39c12' };
    if (accuracy >= 0.6) return { grade: 'C', color: '#e67e22' };
    return { grade: 'D', color: '#e74c3c' };
  };

  if (loading) {
    return (
      <div className="ai-performance-monitor">
        <div className="loading-container">
          <div className="loading-spinner">Loading AI Performance Data...</div>
        </div>
      </div>
    );
  }

  const healthStatus = getHealthStatus(performanceData.systemHealth);
  const performanceGrade = getPerformanceGrade(performanceData.modelPerformance.accuracy);

  return (
    <div className="ai-performance-monitor">
      <div className="monitor-header">
        <h3>📊 AI Performance Monitor</h3>
        <div className="refresh-controls">
          <label>Auto-refresh:</label>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={loadPerformanceData}
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      <div className="performance-grid">
        {/* System Health */}
        <div className="performance-card health">
          <h4>🏥 System Health</h4>
          <div className="health-status">
            <div className="status-indicator" style={{ color: healthStatus.color }}>
              {healthStatus.icon} {healthStatus.status.toUpperCase()}
            </div>
            <div className="health-metrics">
              <div className="metric">
                <span className="metric-label">AI Service:</span>
                <span className={`metric-value ${performanceData.systemHealth.aiServiceReady ? 'good' : 'bad'}`}>
                  {performanceData.systemHealth.aiServiceReady ? '✅ Ready' : '❌ Not Ready'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Active Model:</span>
                <span className={`metric-value ${performanceData.systemHealth.hasActiveModel ? 'good' : 'bad'}`}>
                  {performanceData.systemHealth.hasActiveModel ? '✅ Available' : '❌ None'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Data Quality:</span>
                <span className="metric-value">
                  {(performanceData.systemHealth.dataQuality * 100).toFixed(1)}%
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Training Status:</span>
                <span className="metric-value">
                  {performanceData.systemHealth.isTraining ? '🔄 Training' : '✅ Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Model Performance */}
        <div className="performance-card model">
          <h4>🧠 Model Performance</h4>
          <div className="model-metrics">
            <div className="performance-grade">
              <div className="grade-circle" style={{ borderColor: performanceGrade.color }}>
                {performanceGrade.grade}
              </div>
              <div className="grade-info">
                <div className="grade-label">Overall Grade</div>
                <div className="grade-details">
                  {(performanceData.modelPerformance.accuracy * 100).toFixed(1)}% Accuracy
                </div>
              </div>
            </div>
            <div className="detailed-metrics">
              <div className="metric">
                <span className="metric-label">MAE:</span>
                <span className="metric-value">{performanceData.modelPerformance.mae.toFixed(3)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">RMSE:</span>
                <span className="metric-value">{performanceData.modelPerformance.rmse.toFixed(3)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">R²:</span>
                <span className="metric-value">{performanceData.modelPerformance.r2.toFixed(3)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Training Data:</span>
                <span className="metric-value">{performanceData.modelPerformance.trainingDataCount} shots</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Metrics */}
        <div className="performance-card activity">
          <h4>📈 Activity Metrics</h4>
          <div className="activity-metrics">
            <div className="activity-stat">
              <div className="stat-value">{performanceData.activity.totalLogs}</div>
              <div className="stat-label">Total Shots Logged</div>
            </div>
            <div className="activity-stat">
              <div className="stat-value">{performanceData.activity.recentLogs}</div>
              <div className="stat-label">Last 24 Hours</div>
            </div>
            <div className="activity-stat">
              <div className="stat-value">{performanceData.activity.weeklyLogs}</div>
              <div className="stat-label">Last 7 Days</div>
            </div>
            <div className="activity-stat">
              <div className="stat-value">{performanceData.activity.avgQuality.toFixed(1)}</div>
              <div className="stat-label">Avg Quality</div>
            </div>
          </div>
          
          {/* Quality Distribution */}
          <div className="quality-distribution">
            <h5>Quality Distribution</h5>
            <div className="distribution-bars">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(quality => {
                const count = performanceData.activity.qualityDistribution[quality] || 0;
                const percentage = performanceData.activity.totalLogs > 0 
                  ? (count / performanceData.activity.totalLogs) * 100 
                  : 0;
                
                return (
                  <div key={quality} className="distribution-bar">
                    <div className="bar-label">{quality}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          height: `${percentage}%`,
                          backgroundColor: quality >= 7 ? '#27ae60' : quality >= 5 ? '#f39c12' : '#e74c3c'
                        }}
                      ></div>
                    </div>
                    <div className="bar-count">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="performance-card recommendations">
          <h4>💡 Recommendations</h4>
          <div className="recommendations-list">
            {performanceData.systemHealth.dataQuality < 0.8 && (
              <div className="recommendation-item warning">
                <span className="rec-icon">⚠️</span>
                <span className="rec-text">Improve data quality by logging more complete shot information</span>
              </div>
            )}
            {performanceData.modelPerformance.accuracy < 0.7 && (
              <div className="recommendation-item warning">
                <span className="rec-icon">📊</span>
                <span className="rec-text">Consider retraining the model with more diverse data</span>
              </div>
            )}
            {performanceData.activity.recentLogs < 5 && (
              <div className="recommendation-item info">
                <span className="rec-icon">📝</span>
                <span className="rec-text">Log more shots to improve AI recommendations</span>
              </div>
            )}
            {performanceData.systemHealth.aiServiceReady && performanceData.systemHealth.hasActiveModel && (
              <div className="recommendation-item success">
                <span className="rec-icon">✅</span>
                <span className="rec-text">AI system is performing optimally</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="monitor-footer">
        <small>
          Last updated: {new Date(performanceData.lastUpdated).toLocaleString()} | 
          Auto-refresh: {refreshInterval / 1000}s
        </small>
      </div>
    </div>
  );
};

export default AIPerformanceMonitor;

