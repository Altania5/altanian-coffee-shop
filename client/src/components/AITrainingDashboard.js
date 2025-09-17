import React, { useState, useEffect } from 'react';
import { getAdvancedEspressoAI } from '../ai/AdvancedEspressoAI';
import { getAIDataCollectionService } from '../services/AIDataCollectionService';
import '../styles/ai-dashboard.css';

const AITrainingDashboard = () => {
  const [aiInfo, setAiInfo] = useState(null);
  const [collectionStats, setCollectionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);

  useEffect(() => {
    loadAIData();
    
    // Subscribe to training status updates
    const ai = getAdvancedEspressoAI();
    const statusCallback = (status) => {
      setTrainingStatus(status);
    };
    
    ai.addStatusCallback(statusCallback);
    
    return () => {
      ai.removeStatusCallback(statusCallback);
    };
  }, []);

  const loadAIData = async () => {
    try {
      const ai = getAdvancedEspressoAI();
      const dataService = getAIDataCollectionService();
      
      const [modelInfo, stats, aiStatus] = await Promise.all([
        ai.getModelInfo(),
        dataService.getCollectionStats(),
        ai.getAIStatus()
      ]);
      
      setAiInfo({ ...modelInfo, ...aiStatus });
      setCollectionStats(stats);
      setLoading(false);
      
      // Log AI status for debugging
      console.log('🤖 AI Status Check:', aiStatus);
    } catch (error) {
      console.error('Error loading AI data:', error);
      setLoading(false);
    }
  };

  const handleRetrainModel = async () => {
    try {
      setLoading(true);
      const ai = getAdvancedEspressoAI();
      const dataService = getAIDataCollectionService();
      
      // Flush any pending data
      await dataService.flushPendingData();
      
      // Retrain the model
      await ai.createAndTrainAdvancedModel();
      
      // Reload data
      await loadAIData();
      
      alert('✅ Model retrained successfully!');
    } catch (error) {
      console.error('Error retraining model:', error);
      alert('❌ Error retraining model. Check console for details.');
    }
  };

  const handleExportData = () => {
    const dataService = getAIDataCollectionService();
    dataService.exportCollectedData();
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all collected data? This cannot be undone.')) {
      const dataService = getAIDataCollectionService();
      dataService.clearCollectedData();
      loadAIData();
    }
  };

  const getPerformanceColor = (value, type = 'accuracy') => {
    if (type === 'accuracy') {
      if (value >= 0.8) return '#00aa00';
      if (value >= 0.6) return '#ff8800';
      return '#ff4444';
    }
    return '#666';
  };

  const getPerformanceLabel = (value, type = 'accuracy') => {
    if (type === 'accuracy') {
      if (value >= 0.8) return 'Excellent';
      if (value >= 0.6) return 'Good';
      return 'Needs Improvement';
    }
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="ai-dashboard-container">
        <div className="training-status-container">
          <h2>🤖 AI Training Status</h2>
          {trainingStatus ? (
            <div className="training-status">
              <div className="status-phase">
                <span className={`phase-badge ${trainingStatus.phase}`}>
                  {trainingStatus.phase.toUpperCase()}
                </span>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${trainingStatus.progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{trainingStatus.progress}%</span>
              </div>
              
              <div className="status-message">
                {trainingStatus.message}
              </div>
              
              {trainingStatus.phase === 'training' && trainingStatus.epoch > 0 && (
                <div className="training-details">
                  <div className="epoch-info">
                    Epoch: {trainingStatus.epoch}/{trainingStatus.totalEpochs}
                  </div>
                  {trainingStatus.loss && (
                    <div className="loss-info">
                      <span>Loss: {trainingStatus.loss.toFixed(4)}</span>
                      {trainingStatus.valLoss && (
                        <span>Val Loss: {trainingStatus.valLoss.toFixed(4)}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="loading-spinner">Loading AI Dashboard...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-dashboard-container">
      <div className="dashboard-header">
        <h2>🤖 AI Training Dashboard</h2>
        <p>Monitor your AI's learning progress and performance</p>
      </div>

      {/* Model Status */}
      <div className="dashboard-section">
        <h3>Model Status</h3>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">🧠</div>
            <div className="status-content">
              <div className="status-label">Model Version</div>
              <div className="status-value">{aiInfo?.modelVersion || 'Unknown'}</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">
              {aiInfo?.status === 'trained' ? '🤖' : 
               aiInfo?.status === 'fallback' ? '📝' : 
               aiInfo?.status === 'training' ? '🔄' : '❓'}
            </div>
            <div className="status-content">
              <div className="status-label">AI Status</div>
              <div className="status-value" style={{ 
                color: aiInfo?.status === 'trained' ? '#00aa00' : 
                       aiInfo?.status === 'fallback' ? '#ff8800' : 
                       aiInfo?.status === 'training' ? '#0066cc' : '#666'
              }}>
                {aiInfo?.status === 'trained' ? 'Trained Model' : 
                 aiInfo?.status === 'fallback' ? 'Rule-Based Fallback' : 
                 aiInfo?.status === 'training' ? 'Training...' : 
                 aiInfo?.isReady ? 'Ready' : 'Not Ready'}
              </div>
              <div className="status-message" style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                {aiInfo?.message || 'Unknown status'}
              </div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">📊</div>
            <div className="status-content">
              <div className="status-label">Training Data</div>
              <div className="status-value">{aiInfo?.userDataCount || 0} shots</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🎯</div>
            <div className="status-content">
              <div className="status-label">Accuracy</div>
              <div 
                className="status-value"
                style={{ color: getPerformanceColor(aiInfo?.performanceMetrics?.accuracy || 0) }}
              >
                {((aiInfo?.performanceMetrics?.accuracy || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {aiInfo?.performanceMetrics && (
        <div className="dashboard-section">
          <h3>Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Mean Absolute Error</div>
              <div className="metric-value">{aiInfo.performanceMetrics.mae?.toFixed(3) || 'N/A'}</div>
              <div className="metric-description">Lower is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Root Mean Square Error</div>
              <div className="metric-value">{aiInfo.performanceMetrics.rmse?.toFixed(3) || 'N/A'}</div>
              <div className="metric-description">Lower is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">R² Score</div>
              <div className="metric-value">{aiInfo.performanceMetrics.r2?.toFixed(3) || 'N/A'}</div>
              <div className="metric-description">Higher is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Last Updated</div>
              <div className="metric-value">
                {aiInfo.performanceMetrics.lastUpdated 
                  ? new Date(aiInfo.performanceMetrics.lastUpdated).toLocaleDateString()
                  : 'Never'
                }
              </div>
              <div className="metric-description">Model evaluation</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Collection Stats */}
      {collectionStats && (
        <div className="dashboard-section">
          <h3>Data Collection</h3>
          <div className="collection-stats">
            <div className="stat-item">
              <span className="stat-label">Total Collected:</span>
              <span className="stat-value">{collectionStats.totalCollected} shots</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Pending Processing:</span>
              <span className="stat-value">{collectionStats.pendingDataCount} shots</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Average Quality:</span>
              <span className="stat-value">{collectionStats.averageQuality?.toFixed(1) || 'N/A'}/10</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Last Collection:</span>
              <span className="stat-value">
                {collectionStats.lastCollection 
                  ? new Date(collectionStats.lastCollection).toLocaleString()
                  : 'Never'
                }
              </span>
            </div>
          </div>
          
          {/* Common Issues */}
          {collectionStats.mostCommonIssues?.length > 0 && (
            <div className="common-issues">
              <h4>Most Common Issues Detected</h4>
              <div className="issues-list">
                {collectionStats.mostCommonIssues.map((issue, index) => (
                  <div key={index} className="issue-item">
                    <span className="issue-name">{issue.issue.replace('_', ' ')}</span>
                    <span className="issue-count">{issue.count} occurrences</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="dashboard-section">
        <h3>Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={handleRetrainModel}
            disabled={loading}
          >
            🔄 Retrain Model
          </button>
          
          <button 
            className="action-btn secondary"
            onClick={handleExportData}
          >
            📥 Export Data
          </button>
          
          <button 
            className="action-btn secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '🔽 Hide' : '🔽 Show'} Advanced
          </button>
          
          <button 
            className="action-btn danger"
            onClick={handleClearData}
          >
            🗑️ Clear Data
          </button>
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="dashboard-section advanced">
          <h3>Advanced Settings</h3>
          <div className="advanced-content">
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  defaultChecked={collectionStats?.collectionEnabled}
                  onChange={(e) => {
                    const dataService = getAIDataCollectionService();
                    dataService.setCollectionEnabled(e.target.checked);
                    loadAIData();
                  }}
                />
                Enable automatic data collection
              </label>
              <p className="setting-description">
                Automatically collect shot data for AI training when you log coffee shots
              </p>
            </div>
            
            <div className="setting-group">
              <label>Batch Size:</label>
              <input 
                type="number" 
                min="1" 
                max="50" 
                defaultValue="10"
                onChange={(e) => {
                  const dataService = getAIDataCollectionService();
                  dataService.batchSize = parseInt(e.target.value);
                }}
              />
              <p className="setting-description">
                Number of shots to collect before processing
              </p>
            </div>

            <div className="setting-group">
              <button 
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const dataService = getAIDataCollectionService();
                    await dataService.flushPendingData();
                    await loadAIData();
                    alert('✅ Pending data processed!');
                  } catch (error) {
                    console.error('Error flushing data:', error);
                    alert('❌ Error processing pending data');
                  }
                }}
              >
                Process Pending Data ({collectionStats?.pendingDataCount || 0})
              </button>
              <p className="setting-description">
                Manually process any pending shot data for AI training
              </p>
            </div>

            <div className="setting-group">
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const ai = getAdvancedEspressoAI();
                    const result = await ai.trainWithExistingLogs();
                    
                    if (result.success) {
                      alert(`✅ ${result.message}\n\nTotal logs: ${result.totalLogs}\nValid for training: ${result.validLogs}`);
                    } else {
                      alert(`❌ ${result.message}`);
                    }
                    
                    await loadAIData();
                  } catch (error) {
                    console.error('Error training with existing logs:', error);
                    alert('❌ Error training with existing logs');
                    setLoading(false);
                  }
                }}
              >
                🚀 Train with All Existing Logs
              </button>
              <p className="setting-description">
                Train the AI model using all existing coffee logs that have AI training data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Training History */}
      {aiInfo?.trainingHistory && (
        <div className="dashboard-section">
          <h3>Training History</h3>
          <div className="training-info">
            <p>Model has been trained {aiInfo.trainingHistory.length} times</p>
            <p>Last training: {aiInfo.trainingHistory.lastUpdated || 'Unknown'}</p>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="dashboard-section tips">
        <h3>💡 Tips for Better AI Performance</h3>
        <ul className="tips-list">
          <li>Log shots consistently with accurate quality ratings</li>
          <li>Include detailed taste profiles for better recommendations</li>
          <li>Use advanced parameters like pre-infusion and WDT</li>
          <li>Retrain the model periodically as you collect more data</li>
          <li>Export your data regularly as a backup</li>
        </ul>
      </div>
    </div>
  );
};

export default AITrainingDashboard;
