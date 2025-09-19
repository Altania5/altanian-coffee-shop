import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import '../styles/ai-model-management.css';

const AIModelManagement = () => {
  const [models, setModels] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStopping: true,
    patience: 10
  });
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [jupyterStatus, setJupyterStatus] = useState(null);
  const [trainingMethod, setTrainingMethod] = useState('api'); // 'api' or 'jupyter'

  useEffect(() => {
    loadData();
    checkTrainingStatus();
    checkJupyterStatus();
    
    // Set up periodic training status checking
    const statusInterval = setInterval(checkTrainingStatus, 2000);
    return () => clearInterval(statusInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modelsRes, statsRes] = await Promise.all([
        api.get('/ai-models?limit=20'),
        api.get('/ai-models/statistics')
      ]);

      setModels(modelsRes.data.data?.models || []);
      setStatistics(statsRes.data.data || null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const checkTrainingStatus = async () => {
    try {
      const response = await api.get('/ai-models/training-status');
      setTrainingStatus(response.data.data);
    } catch (error) {
      console.error('Error checking training status:', error);
    }
  };

  const checkJupyterStatus = async () => {
    try {
      const response = await api.get('/ai-models/jupyter-status');
      setJupyterStatus(response.data.data);
    } catch (error) {
      console.error('Error checking Jupyter status:', error);
    }
  };

  const startTraining = async () => {
    try {
      setLoading(true);
      const endpoint = trainingMethod === 'jupyter' ? '/ai-models/train-jupyter' : '/ai-models/train';
      const response = await api.post(endpoint, trainingConfig);
      
      if (response.data.success) {
        alert('✅ Training started successfully!');
        await loadData();
      } else {
        alert('❌ Error starting training: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error starting training:', error);
      if (error.response?.status === 409) {
        alert('⏳ A model is already training. Please wait for it to complete.');
      } else {
        alert('❌ Error starting training');
      }
    } finally {
      setLoading(false);
    }
  };

  const publishModel = async (modelId) => {
    try {
      const notes = prompt('Enter deployment notes (optional):');
      const response = await api.post(`/ai-models/${modelId}/publish`, { notes });
      
      if (response.data.success) {
        alert('✅ Model published successfully!');
        await loadData();
      } else {
        alert('❌ Error publishing model: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error publishing model:', error);
      alert('❌ Error publishing model');
    }
  };

  const rollbackModel = async (modelId) => {
    try {
      const rollbackToModelId = prompt('Enter the model ID to rollback to:');
      if (!rollbackToModelId) return;

      const response = await api.post(`/ai-models/${modelId}/rollback`, { 
        rollbackToModelId 
      });
      
      if (response.data.success) {
        alert('✅ Model rollback completed!');
        await loadData();
      } else {
        alert('❌ Error rolling back model: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error rolling back model:', error);
      alert('❌ Error rolling back model');
    }
  };

  const archiveModel = async (modelId) => {
    try {
      if (!window.confirm('Are you sure you want to archive this model?')) return;

      const response = await api.post(`/ai-models/${modelId}/archive`);
      
      if (response.data.success) {
        alert('✅ Model archived successfully!');
        await loadData();
      } else {
        alert('❌ Error archiving model: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error archiving model:', error);
      alert('❌ Error archiving model');
    }
  };

  const deleteModel = async (modelId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this model? This cannot be undone.')) return;

      const response = await api.delete(`/ai-models/${modelId}`);
      
      if (response.data.success) {
        alert('✅ Model deleted successfully!');
        await loadData();
      } else {
        alert('❌ Error deleting model: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('❌ Error deleting model');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      training: '#0066cc',
      ready: '#00aa00',
      published: '#0066cc',
      archived: '#666666',
      failed: '#cc0000'
    };
    return colors[status] || '#666666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      training: '🔄',
      ready: '✅',
      published: '🚀',
      archived: '📦',
      failed: '❌'
    };
    return icons[status] || '❓';
  };

  if (loading && !statistics) {
    return (
      <div className="ai-model-management">
        <div className="loading-container">
          <div className="loading-spinner">Loading AI Model Management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-model-management">
      <div className="management-header">
        <h2>🤖 AI Model Management</h2>
        <p>Train, publish, and manage AI models for global deployment</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          🧠 Models
        </button>
        <button 
          className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          🚀 Training
        </button>
        <button 
          className={`tab-btn ${activeTab === 'deployment' ? 'active' : ''}`}
          onClick={() => setActiveTab('deployment')}
        >
          📢 Deployment
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && statistics && (
        <div className="overview-tab">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🧠</div>
              <div className="stat-content">
                <div className="stat-label">Total Models</div>
                <div className="stat-value">{statistics.modelStats.totalModels}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🚀</div>
              <div className="stat-content">
                <div className="stat-label">Active Model</div>
                <div className="stat-value">
                  {statistics.modelStats.activeModel ? 
                    `v${statistics.modelStats.activeModel.version}` : 'None'
                  }
                </div>
                <div className="stat-subtitle">
                  {statistics.modelStats.activeModel ? 
                    `${(statistics.modelStats.activeModel.accuracy * 100).toFixed(1)}% accuracy` : 
                    'No active model'
                  }
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-label">Training Data</div>
                <div className="stat-value">{statistics.trainingDataSummary.totalLogs}</div>
                <div className="stat-subtitle">
                  {statistics.trainingDataSummary.validLogs} valid logs
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-label">Data Quality</div>
                <div className="stat-value">
                  {(statistics.trainingDataSummary.dataQuality * 100).toFixed(1)}%
                </div>
                <div className="stat-subtitle">
                  {statistics.trainingDataSummary.invalidLogs} invalid logs
                </div>
              </div>
            </div>
          </div>

          {/* Training Status */}
          {trainingStatus?.isTraining && (
            <div className="training-status-card">
              <h3>🔄 Training in Progress</h3>
              <div className="training-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${trainingStatus.progress}%` }}
                  ></div>
                </div>
                <div className="progress-info">
                  <span>{trainingStatus.progress}% Complete</span>
                  <span>Epoch {trainingStatus.currentEpoch}/{trainingStatus.totalEpochs}</span>
                </div>
              </div>
              {trainingStatus.currentLoss && (
                <div className="loss-info">
                  <span>Loss: {trainingStatus.currentLoss.toFixed(4)}</span>
                  {trainingStatus.currentValLoss && (
                    <span>Val Loss: {trainingStatus.currentValLoss.toFixed(4)}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="models-tab">
          <div className="models-header">
            <h3>🧠 AI Models</h3>
            <button 
              className="btn btn-primary"
              onClick={() => setActiveTab('training')}
            >
              🚀 Start Training
            </button>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <p>Loading models...</p>
            </div>
          ) : (

          <div className="models-list">
            {models.length === 0 ? (
              <div className="no-models">
                <p>No AI models found</p>
                <p>Start training to create your first model</p>
              </div>
            ) : (
            models.map((model) => (
              <div key={model._id} className="model-card">
                <div className="model-header">
                  <div className="model-info">
                    <div className="model-name">
                      {getStatusIcon(model.status)} {model.modelName} v{model.version}
                    </div>
                    <div className="model-status" style={{ color: getStatusColor(model.status) }}>
                      {model.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="model-actions">
                    {model.status === 'ready' && (
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => publishModel(model._id)}
                      >
                        📢 Publish
                      </button>
                    )}
                    {model.status === 'published' && (
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => archiveModel(model._id)}
                      >
                        📦 Archive
                      </button>
                    )}
                    {model.status === 'archived' && (
                      <button 
                        className="btn btn-info btn-sm"
                        onClick={() => rollbackModel(model._id)}
                      >
                        🔄 Rollback
                      </button>
                    )}
                    {!model.isActive && (
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteModel(model._id)}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="model-details">
                  <div className="model-metrics">
                    <div className="metric">
                      <span className="metric-label">Accuracy:</span>
                      <span className="metric-value">
                        {model.performanceMetrics && model.performanceMetrics.accuracy ? 
                          `${(model.performanceMetrics.accuracy * 100).toFixed(1)}%` : 
                          'N/A'}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">MAE:</span>
                      <span className="metric-value">
                        {model.performanceMetrics && model.performanceMetrics.mae ? 
                          model.performanceMetrics.mae.toFixed(3) : 
                          'N/A'}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">R²:</span>
                      <span className="metric-value">
                        {model.performanceMetrics && model.performanceMetrics.r2 ? 
                          model.performanceMetrics.r2.toFixed(3) : 
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="model-meta">
                    <div className="meta-item">
                      <span className="meta-label">Trained:</span>
                      <span className="meta-value">
                        {model.trainingSession && model.trainingSession.startedAt ? 
                          new Date(model.trainingSession.startedAt).toLocaleDateString() : 
                          'Unknown'}
                      </span>
                    </div>
                    {model.publishingInfo && model.publishingInfo.publishedAt && (
                      <div className="meta-item">
                        <span className="meta-label">Published:</span>
                        <span className="meta-value">
                          {new Date(model.publishingInfo.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-label">Training Data:</span>
                      <span className="meta-value">
                        {model.trainingData && model.trainingData.validLogs ? 
                          `${model.trainingData.validLogs} logs` : 
                          'No data'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
          )}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div className="training-tab">
          <div className="training-header">
            <h3>🚀 Model Training</h3>
            <p>Configure and start training a new AI model</p>
          </div>

          <div className="training-config">
            <h4>Training Configuration</h4>
            
            {/* Training Method Selection */}
            <div className="training-method-selection">
              <h5>Training Method</h5>
              <div className="method-options">
                <label className="method-option">
                  <input 
                    type="radio" 
                    name="trainingMethod" 
                    value="api"
                    checked={trainingMethod === 'api'}
                    onChange={(e) => setTrainingMethod(e.target.value)}
                  />
                  <div className="method-card">
                    <div className="method-icon">🚀</div>
                    <div className="method-info">
                      <div className="method-name">API Training</div>
                      <div className="method-description">Fast training using centralized AI service</div>
                    </div>
                  </div>
                </label>
                
                <label className="method-option">
                  <input 
                    type="radio" 
                    name="trainingMethod" 
                    value="jupyter"
                    checked={trainingMethod === 'jupyter'}
                    onChange={(e) => setTrainingMethod(e.target.value)}
                  />
                  <div className="method-card">
                    <div className="method-icon">📓</div>
                    <div className="method-info">
                      <div className="method-name">Jupyter Notebook</div>
                      <div className="method-description">Advanced training using TensorFlow/Jupyter</div>
                      {jupyterStatus && (
                        <div className={`method-status ${jupyterStatus.environment.available ? 'available' : 'unavailable'}`}>
                          {jupyterStatus.environment.available ? '✅ Available' : '❌ Not Available'}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="config-grid">
              <div className="config-item">
                <label>Epochs:</label>
                <input 
                  type="number" 
                  min="10" 
                  max="1000" 
                  value={trainingConfig.epochs}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    epochs: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="config-item">
                <label>Batch Size:</label>
                <input 
                  type="number" 
                  min="8" 
                  max="128" 
                  value={trainingConfig.batchSize}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    batchSize: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="config-item">
                <label>Learning Rate:</label>
                <input 
                  type="number" 
                  min="0.0001" 
                  max="0.1" 
                  step="0.0001"
                  value={trainingConfig.learningRate}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    learningRate: parseFloat(e.target.value)
                  })}
                />
              </div>

              <div className="config-item">
                <label>Validation Split:</label>
                <input 
                  type="number" 
                  min="0.1" 
                  max="0.5" 
                  step="0.05"
                  value={trainingConfig.validationSplit}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    validationSplit: parseFloat(e.target.value)
                  })}
                />
              </div>

              <div className="config-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={trainingConfig.earlyStopping}
                    onChange={(e) => setTrainingConfig({
                      ...trainingConfig,
                      earlyStopping: e.target.checked
                    })}
                  />
                  Early Stopping
                </label>
              </div>

              <div className="config-item">
                <label>Patience:</label>
                <input 
                  type="number" 
                  min="5" 
                  max="50" 
                  value={trainingConfig.patience}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    patience: parseInt(e.target.value)
                  })}
                />
              </div>
            </div>

            <div className="training-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={startTraining}
                disabled={loading || trainingStatus?.isTraining}
              >
                {loading ? '🔄 Starting...' : '🚀 Start Training'}
              </button>
              
              {trainingStatus?.isTraining && (
                <div className="training-warning">
                  ⏳ A model is currently training. Please wait for it to complete.
                </div>
              )}
              
              <div className="training-info">
                <h5>Training Method Comparison</h5>
                <div className="method-comparison">
                  <div className="method-detail">
                    <strong>API Training:</strong> Fast, centralized training using all available coffee logs. Best for quick iterations and testing.
                  </div>
                  <div className="method-detail">
                    <strong>Jupyter Training:</strong> Advanced training with TensorFlow/Keras. Best for complex models and research.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Tab */}
      {activeTab === 'deployment' && (
        <div className="deployment-tab">
          <div className="deployment-header">
            <h3>📢 Model Deployment</h3>
            <p>Manage model publishing and rollback</p>
          </div>

          <div className="deployment-info">
            <div className="info-card">
              <h4>🚀 Active Model</h4>
              {statistics?.modelStats?.activeModel ? (
                <div className="active-model-info">
                  <div className="model-version">
                    Version: {statistics.modelStats.activeModel.version || 'Unknown'}
                  </div>
                  <div className="model-accuracy">
                    Accuracy: {statistics.modelStats.activeModel.accuracy ? 
                      `${(statistics.modelStats.activeModel.accuracy * 100).toFixed(1)}%` : 
                      'N/A'}
                  </div>
                  <div className="model-published">
                    Published: {statistics.modelStats.activeModel.publishedAt ? 
                      new Date(statistics.modelStats.activeModel.publishedAt).toLocaleString() : 
                      'Not published'}
                  </div>
                </div>
              ) : (
                <div className="no-active-model">
                  <p>No active model deployed</p>
                  <p>Train and publish a model to make it available to all users</p>
                </div>
              )}
            </div>

            <div className="info-card">
              <h4>📊 Deployment Statistics</h4>
              <div className="deployment-stats">
                <div className="stat">
                  <span className="stat-label">Total Models:</span>
                  <span className="stat-value">{statistics?.modelStats.totalModels || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Published Models:</span>
                  <span className="stat-value">
                    {statistics?.modelStats.statusBreakdown?.find(s => s._id === 'published')?.count || 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Ready for Deployment:</span>
                  <span className="stat-value">
                    {statistics?.modelStats.statusBreakdown?.find(s => s._id === 'ready')?.count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="deployment-actions">
            <h4>Quick Actions</h4>
            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('training')}
              >
                🚀 Train New Model
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('models')}
              >
                📋 View All Models
              </button>
              <button 
                className="btn btn-info"
                onClick={loadData}
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelManagement;
