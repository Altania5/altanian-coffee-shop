import React, { useState, useEffect, useCallback } from 'react';
import { getEspressoAI } from '../ai/EspressoAI';

const AICoach = ({ shotData, onRecommendationApplied }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState('initializing');
  const [expanded, setExpanded] = useState(false);
  const [showingPersisted, setShowingPersisted] = useState(false);

  const performAnalysis = useCallback(async () => {
    try {
      const ai = getEspressoAI();
      const result = await ai.analyzeShot(shotData);
      setAnalysis(result);
      setAiStatus('ready');
      setLoading(false);
    } catch (error) {
      console.error('Error performing analysis:', error);
      setAiStatus('error');
      setLoading(false);
    }
  }, [shotData]);

  const analyzeShot = useCallback(async () => {
    setLoading(true);
    setAiStatus('analyzing');
    
    try {
      const ai = getEspressoAI();
      const modelInfo = ai.getModelInfo();
      
      if (modelInfo.isTraining) {
        setAiStatus('training');
        // Wait for training to complete
        const checkTraining = setInterval(() => {
          const info = ai.getModelInfo();
          if (!info.isTraining && info.isReady) {
            clearInterval(checkTraining);
            performAnalysis();
          }
        }, 1000);
      } else if (modelInfo.isReady) {
        await performAnalysis();
      } else {
        setAiStatus('initializing');
        setTimeout(analyzeShot, 2000); // Retry in 2 seconds
      }
    } catch (error) {
      console.error('Error analyzing shot:', error);
      setAiStatus('error');
      setLoading(false);
    }
  }, [performAnalysis]);

  useEffect(() => {
    // First, try to load persisted AI response
    const loadPersistedResponse = async () => {
      const ai = getEspressoAI();
      const lastResponse = ai.getLastAIResponse();
      
      if (lastResponse && !shotData) {
        // Show persisted recommendation if no new shot data
        setAnalysis(lastResponse);
        setShowingPersisted(true);
        setLoading(false);
        setAiStatus('ready');
        setExpanded(true); // Auto-expand for persisted recommendations
        return;
      }
    };
    
    if (!shotData) {
      loadPersistedResponse();
    } else {
      setShowingPersisted(false);
      analyzeShot();
    }
  }, [shotData, analyzeShot]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ff8800';
      case 'low': return '#00aa00';
      default: return '#666';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const handleRecommendationClick = (recommendation) => {
    if (onRecommendationApplied) {
      onRecommendationApplied(recommendation);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#00aa00';
    if (confidence >= 0.6) return '#ff8800';
    return '#ff4444';
  };

  const getQualityImprovement = () => {
    if (!analysis) return null;
    
    const improvement = analysis.predictedQuality - analysis.currentQuality;
    if (improvement > 0) {
      return {
        text: `AI predicts +${improvement} points improvement`,
        color: '#00aa00',
        icon: '📈'
      };
    } else if (improvement < 0) {
      return {
        text: `Quality may decrease by ${Math.abs(improvement)} points`,
        color: '#ff4444',
        icon: '📉'
      };
    }
    return {
      text: 'Quality should remain stable',
      color: '#666',
      icon: '➡️'
    };
  };

  if (loading) {
    return (
      <div className="ai-coach-container">
        <div className="ai-coach-header">
          <h3 className="ai-coach-title">🤖 AI Espresso Coach</h3>
          <div className="ai-status">
            {aiStatus === 'training' && (
              <div className="status-item training">
                <div className="loading-spinner"></div>
                <span>Training AI model... This may take a moment</span>
              </div>
            )}
            {aiStatus === 'analyzing' && (
              <div className="status-item analyzing">
                <div className="loading-pulse"></div>
                <span>Analyzing your shot...</span>
              </div>
            )}
            {aiStatus === 'initializing' && (
              <div className="status-item initializing">
                <div className="loading-dots"></div>
                <span>Initializing AI...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (aiStatus === 'error' || !analysis) {
    return (
      <div className="ai-coach-container error">
        <div className="ai-coach-header">
          <h3 className="ai-coach-title">🤖 AI Espresso Coach</h3>
          <div className="error-message">
            <span>❌ Unable to analyze shot. Using manual analysis mode.</span>
          </div>
        </div>
      </div>
    );
  }

  const qualityImprovement = getQualityImprovement();

  return (
    <div className="ai-coach-container">
      <div className="ai-coach-header" onClick={() => setExpanded(!expanded)}>
        <h3 className="ai-coach-title">
          🤖 AI Espresso Coach
          {showingPersisted && (
            <span className="persisted-badge" title="Last recommendation from previous session">
              💾 Saved
            </span>
          )}
        </h3>
        <div className="coach-summary">
          <div className="confidence-badge" style={{ borderColor: getConfidenceColor(analysis.confidence) }}>
            {Math.round(analysis.confidence * 100)}% confident
          </div>
          {showingPersisted && (
            <div className="timestamp-badge">
              {new Date(analysis.timestamp).toLocaleTimeString()}
            </div>
          )}
          <div className="expand-arrow" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ⬇️
          </div>
        </div>
      </div>

      {expanded && (
        <div className="ai-coach-content">
          {/* Quality Prediction */}
          <div className="prediction-section">
            <div className="prediction-header">
              <h4>Quality Assessment</h4>
              {qualityImprovement && (
                <div 
                  className="quality-improvement" 
                  style={{ color: qualityImprovement.color }}
                >
                  {qualityImprovement.icon} {qualityImprovement.text}
                </div>
              )}
            </div>
            
            <div className="quality-comparison">
              <div className="quality-item">
                <span className="quality-label">Current:</span>
                <span className="quality-value current">{analysis.currentQuality}/10</span>
              </div>
              <div className="quality-arrow">→</div>
              <div className="quality-item">
                <span className="quality-label">AI Prediction:</span>
                <span className="quality-value predicted">{analysis.predictedQuality}/10</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>🎯 Recommendations</h4>
              <div className="recommendations-list">
                {analysis.recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="recommendation-card"
                    onClick={() => handleRecommendationClick(rec)}
                  >
                    <div className="rec-header">
                      <div className="rec-priority" style={{ color: getPriorityColor(rec.priority) }}>
                        {getPriorityIcon(rec.priority)} {rec.priority.toUpperCase()}
                      </div>
                      <div className="rec-type">{rec.type}</div>
                    </div>
                    <div className="rec-action">{rec.action}</div>
                    <div className="rec-improvement">
                      <span className="improvement-icon">📊</span>
                      {rec.expectedImprovement}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          {analysis.analysis && (
            <div className="analysis-section">
              <h4>📋 Detailed Analysis</h4>
              <div className="analysis-items">
                {Object.entries(analysis.analysis).map(([param, data]) => (
                  <div key={param} className="analysis-item">
                    <div className="analysis-header">
                      <span className="analysis-icon">{getStatusIcon(data.status)}</span>
                      <span className="analysis-param">{param.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                    </div>
                    <div className="analysis-message">{data.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis (if available from rule-based fallback) */}
          {analysis.diagnosis && (
            <div className="diagnosis-section">
              <h4>🔍 Diagnosis</h4>
              <div className="diagnosis-text">{analysis.diagnosis}</div>
            </div>
          )}

          {/* AI Model Info */}
          <div className="model-info">
            <small>
              {analysis.confidence >= 0.8 
                ? '🧠 High-confidence AI prediction' 
                : analysis.confidence >= 0.6 
                ? '🤔 Medium-confidence AI prediction'
                : '📝 Low-confidence prediction (more data needed)'}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoach;
