import React, { useState, useEffect } from 'react';
import { getCentralizedAIService } from '../services/CentralizedAIService';
import { getAIDataCollectionService } from '../services/AIDataCollectionService';
import api from '../utils/api';
import '../styles/ai-dashboard.css';

const AITrainingDashboard = () => {
  const [aiInfo, setAiInfo] = useState(null);
  const [collectionStats, setCollectionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [activeModel, setActiveModel] = useState(null);

  useEffect(() => {
    loadAIData();
    
    // Set up periodic status checking for centralized AI
    const statusInterval = setInterval(async () => {
      const ai = getCentralizedAIService();
      const status = await ai.getTrainingStatus();
      console.log('📊 Training Status Update:', status);
      if (status) {
        setTrainingStatus({
          phase: status.isTraining ? 'training' : 'ready',
          progress: status.trainingProgress || 0,
          message: status.message || (status.isTraining ? 'Training centralized model...' : 'Centralized model ready'),
          currentEpoch: status.currentEpoch || 0,
          totalEpochs: status.totalEpochs || 1000,
          loss: status.currentLoss ? status.currentLoss.toFixed(4) : '0.0000',
          valLoss: status.currentValLoss ? status.currentValLoss.toFixed(4) : '0.0000'
        });
      }
    }, 1000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const loadAIData = async () => {
    try {
      const ai = getCentralizedAIService();
      const dataService = getAIDataCollectionService();
      
      // Initialize centralized AI if not ready
      if (!ai.isReady) {
        await ai.initialize();
      }
      
      const [modelInfo, stats, aiStats] = await Promise.all([
        ai.getModelInfo(),
        dataService.getCollectionStats(),
        api.get('/ai-models/statistics').catch(() => ({ data: { data: null } }))
      ]);
      
      setAiInfo(modelInfo);
      setCollectionStats(stats);
      setModelStats(aiStats.data.data);
      setActiveModel(aiStats.data.data?.modelStats?.activeModel || null);
      setLoading(false);
      
      // Log AI status for debugging
      console.log('🤖 Centralized AI Status Check:', modelInfo);
    } catch (error) {
      console.error('Error loading AI data:', error);
      setLoading(false);
    }
  };

  const handleRetrainModel = async () => {
    try {
      setLoading(true);
      const ai = getCentralizedAIService();
      const dataService = getAIDataCollectionService();
      
      // Flush any pending data
      await dataService.flushPendingData();
      
      // Retrain the centralized model
      const result = await ai.retrainModel();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
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
              <div className="status-label">Active Model</div>
              <div className="status-value">
                {activeModel ? `v${activeModel.version}` : 'No Active Model'}
              </div>
              <div className="status-message" style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                {activeModel ? 'Published model in use' : 'Train and publish a model'}
              </div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">
              {activeModel ? '🚀' : 
               aiInfo?.hasModel ? '🤖' : 
               aiInfo?.isUsingFallback ? '📝' : 
               aiInfo?.isTraining ? '🔄' : '❓'}
            </div>
            <div className="status-content">
              <div className="status-label">AI Status</div>
              <div className="status-value" style={{ 
                color: activeModel ? '#00aa00' : 
                       aiInfo?.hasModel ? '#00aa00' : 
                       aiInfo?.isUsingFallback ? '#ff8800' : 
                       aiInfo?.isTraining ? '#0066cc' : '#666'
              }}>
                {activeModel ? 'Published Model Active' :
                 aiInfo?.hasModel ? 'Centralized Model' : 
                 aiInfo?.isUsingFallback ? 'Rule-Based Fallback' : 
                 aiInfo?.isTraining ? 'Training...' : 
                 aiInfo?.isReady ? 'Ready' : 'Not Ready'}
              </div>
              <div className="status-message" style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                {activeModel ? 'Global deployment active' : 
                 aiInfo?.isCentralized ? 'Shared across all users' : 'Local model'}
              </div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">📊</div>
            <div className="status-content">
              <div className="status-label">Training Data</div>
              <div className="status-value">
                {modelStats?.totalModels ? 
                  `${modelStats.totalModels} models trained` :
                  aiInfo?.isCentralized ? 
                    `${aiInfo?.validLogs || 0}/${aiInfo?.totalLogs || 0} valid logs` : 
                    (aiInfo?.userDataCount || 0) + ' shots'
                }
              </div>
              <div className="status-message" style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                {modelStats?.totalModels ? 
                  `Latest: ${modelStats.latestModel?.version || 'N/A'}` :
                  aiInfo?.validLogs < 10 ? 'Need at least 10 logs for training' : 
                  aiInfo?.totalLogs > 0 ? `Training with ALL ${aiInfo.totalLogs} database logs` : 'Ready for training'}
              </div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🎯</div>
            <div className="status-content">
              <div className="status-label">Accuracy</div>
              <div 
                className="status-value"
                style={{ color: getPerformanceColor(
                  activeModel?.accuracy || 
                  aiInfo?.performanceMetrics?.accuracy || 0
                ) }}
              >
                {((activeModel?.accuracy || 
                   aiInfo?.performanceMetrics?.accuracy || 0) * 100).toFixed(1)}%
              </div>
              <div className="status-message" style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                {activeModel ? 'Published model accuracy' : 'Current model accuracy'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {(activeModel?.performanceMetrics || aiInfo?.performanceMetrics) && (
        <div className="dashboard-section">
          <h3>Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Mean Absolute Error</div>
              <div className="metric-value">
                {(activeModel?.performanceMetrics?.mae || aiInfo?.performanceMetrics?.mae)?.toFixed(3) || 'N/A'}
              </div>
              <div className="metric-description">Lower is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Root Mean Square Error</div>
              <div className="metric-value">
                {(activeModel?.performanceMetrics?.rmse || aiInfo?.performanceMetrics?.rmse)?.toFixed(3) || 'N/A'}
              </div>
              <div className="metric-description">Lower is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">R² Score</div>
              <div className="metric-value">
                {(activeModel?.performanceMetrics?.r2 || aiInfo?.performanceMetrics?.r2)?.toFixed(3) || 'N/A'}
              </div>
              <div className="metric-description">Higher is better</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Last Updated</div>
              <div className="metric-value">
                {activeModel?.publishedAt ? 
                  new Date(activeModel.publishedAt).toLocaleDateString() :
                  aiInfo?.performanceMetrics?.lastUpdated ? 
                    new Date(aiInfo.performanceMetrics.lastUpdated).toLocaleDateString() :
                    'Never'
                }
              </div>
              <div className="metric-description">
                {activeModel ? 'Model published' : 'Model evaluation'}
              </div>
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
            onClick={() => window.location.href = '/admin?tab=ai-models'}
            disabled={loading}
          >
            🚀 Manage AI Models
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
        
        <div className="action-info">
          <p>
            <strong>🚀 AI Model Management:</strong> Use the new AI Model Management system to train, test, and publish models with full control over epochs, batch size, and training parameters.
          </p>
          <p>
            <strong>📊 Real-time Training:</strong> Monitor training progress with live epoch tracking, loss values, and performance metrics.
          </p>
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
                onClick={() => window.location.href = '/admin?tab=ai-models'}
              >
                🚀 Open AI Model Management
              </button>
              <p className="setting-description">
                Access the new AI Model Management system for advanced training, testing, and publishing
              </p>
            </div>

            <div className="setting-group">
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const ai = getCentralizedAIService();
                    await ai.initialize();
                    await loadAIData();
                    const sampleInfo = aiInfo?.sampleLogs ? 
                      aiInfo.sampleLogs.map(log => 
                        `Log ${log.id.slice(-4)}: Quality=${log.shotQuality}, In=${log.inWeight}g, Out=${log.outWeight}g, Time=${log.extractionTime}s`
                      ).join('\n') : 'No sample logs';
                    
                    alert(`📊 Debug Info:\nTotal Logs: ${aiInfo?.totalLogs || 0}\nValid Logs: ${aiInfo?.validLogs || 0}\nReady: ${aiInfo?.isReady ? 'Yes' : 'No'}\nHas Model: ${aiInfo?.hasModel ? 'Yes' : 'No'}\nLast Training: ${aiInfo?.lastTrainingDate ? new Date(aiInfo.lastTrainingDate).toLocaleString() : 'Never'}\n\n📝 Sample Logs:\n${sampleInfo}`);
                  } catch (error) {
                    console.error('Error getting debug info:', error);
                    alert('❌ Error getting debug info');
                  }
                }}
              >
                🔍 Debug Info
              </button>
              <p className="setting-description">
                Check coffee log counts and AI service status
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Training Status */}
      {trainingStatus && trainingStatus.phase === 'training' && (
        <div className="dashboard-section">
          <h3>🔄 Current Training Status</h3>
          <div className="training-status-card">
            <div className="training-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${trainingStatus.progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{trainingStatus.progress}%</span>
            </div>
            
            <div className="training-details">
              <div className="training-message">{trainingStatus.message}</div>
              
              {trainingStatus.currentEpoch > 0 && (
                <div className="epoch-info">
                  <span>Epoch: {trainingStatus.currentEpoch}/{trainingStatus.totalEpochs}</span>
                  {trainingStatus.loss && (
                    <span>Loss: {trainingStatus.loss}</span>
                  )}
                  {trainingStatus.valLoss && (
                    <span>Val Loss: {trainingStatus.valLoss}</span>
                  )}
                </div>
              )}
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

      {/* AI Performance Insights */}
      <div className="dashboard-section">
        <h3>🧠 AI Performance Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <h4>Model Accuracy Trend</h4>
              <p>
                {activeModel?.accuracy >= 0.8 
                  ? 'Your AI model shows excellent accuracy! The recommendations are highly reliable.'
                  : activeModel?.accuracy >= 0.6 
                  ? 'Your AI model has good accuracy. Consider training with more data to improve further.'
                  : 'Your AI model needs more training data. Log more shots to improve accuracy.'}
              </p>
            </div>
          </div>
          
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Recommendation Quality</h4>
              <p>
                {aiInfo?.coffeeLogCount > 100 
                  ? 'With extensive training data, your AI provides personalized recommendations based on your brewing patterns.'
                  : aiInfo?.coffeeLogCount > 50 
                  ? 'Your AI is learning your preferences. More data will improve recommendation accuracy.'
                  : 'Log more shots to help the AI learn your brewing style and provide better recommendations.'}
              </p>
            </div>
          </div>
          
          <div className="insight-card">
            <div className="insight-icon">🔄</div>
            <div className="insight-content">
              <h4>Continuous Learning</h4>
              <p>
                The AI system continuously improves as you log more shots. Each shot contributes to better predictions for you and other users.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="dashboard-section tips">
        <h3>💡 Tips for Better AI Performance</h3>
        <ul className="tips-list">
          <li>Log shots consistently with accurate quality ratings</li>
          <li>Include detailed taste profiles for better recommendations</li>
          <li>Use advanced parameters like pre-infusion and WDT</li>
          <li>Use the AI Model Management system to train models with configurable epochs</li>
          <li>Test models before publishing to ensure quality</li>
          <li>Monitor training progress with real-time epoch tracking</li>
          <li>Export your data regularly as a backup</li>
          <li>Review AI insights to understand your brewing patterns</li>
          <li>Share successful recipes to help improve the global model</li>
        </ul>
      </div>
    </div>
  );
};

export default AITrainingDashboard;
