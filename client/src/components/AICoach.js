import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCentralizedAIService } from '../services/CentralizedAIService';

const AICoach = ({ shotData, onRecommendationApplied }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState('initializing');
  const [expanded, setExpanded] = useState(true);
  const [showingPersisted, setShowingPersisted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzedShotsRef = useRef(new Set());

  // Memoize shotData to prevent unnecessary re-renders
  const memoizedShotData = useMemo(() => shotData, [shotData?._id, shotData?.timestamp]);
  
  // Debug logging
  console.log('🤖 AICoach component rendered with shotData:', memoizedShotData);

  const analyzeShot = useCallback(async () => {
    // Prevent duplicate analysis calls
    if (isAnalyzing) {
      console.log('⚠️ Analysis already in progress, skipping duplicate call');
      return;
    }
    
    // Check if we've already analyzed this shot
    const shotId = memoizedShotData?._id || memoizedShotData?.timestamp;
    if (shotId && analyzedShotsRef.current.has(shotId)) {
      console.log('⚠️ Shot already analyzed, skipping duplicate call:', shotId);
      return;
    }
    
    console.log('🔍 AICoach.analyzeShot called with shotData:', memoizedShotData);
    setIsAnalyzing(true);
    setLoading(true);
    setAiStatus('analyzing');
    
    try {
      const ai = getCentralizedAIService();
      console.log('🤖 AI Service ready status:', ai.isReady);
      
      // Initialize if not ready
      if (!ai.isReady) {
        console.log('🔄 Initializing AI service...');
        await ai.initialize();
      }
      
      const modelInfo = ai.getModelInfo();
      console.log('📊 Model info:', modelInfo);
      
      if (modelInfo.isTraining) {
        setAiStatus('training');
        // Wait for training to complete
        const checkTraining = setInterval(async () => {
          const status = await ai.getTrainingStatus();
          if (!status?.isTraining && modelInfo.isReady) {
            clearInterval(checkTraining);
            // Perform analysis directly here instead of calling performAnalysis
            const result = await ai.analyzeShot(memoizedShotData);
            console.log('✅ AICoach received analysis result:', result);
            setAnalysis(result);
            setAiStatus('ready');
            setLoading(false);
            setIsAnalyzing(false);
            // Mark this shot as analyzed
            if (shotId) analyzedShotsRef.current.add(shotId);
          }
        }, 2000);
      } else if (modelInfo.isReady) {
        // Perform analysis directly here instead of calling performAnalysis
        const result = await ai.analyzeShot(memoizedShotData);
        console.log('✅ AICoach received analysis result (ready path):', result);
        setAnalysis(result);
        setAiStatus('ready');
        setLoading(false);
        setIsAnalyzing(false);
        // Mark this shot as analyzed
        if (shotId) analyzedShotsRef.current.add(shotId);
      } else {
        setAiStatus('initializing');
        setTimeout(analyzeShot, 2000); // Retry in 2 seconds
      }
    } catch (error) {
      console.error('Error analyzing shot:', error);
      setAiStatus('error');
      setLoading(false);
      setIsAnalyzing(false);
    }
  }, [memoizedShotData, isAnalyzing]);

  useEffect(() => {
    // First, try to load persisted AI response
    const loadPersistedResponse = async () => {
      const ai = getCentralizedAIService();
      const lastResponse = ai.getLastAnalysis();
      
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
      // Only analyze if we don't already have analysis for this shot data
      if (!analysis || analysis.timestamp !== shotData.timestamp) {
        analyzeShot();
      }
    }
  }, [shotData, analyzeShot]); // Include analyzeShot in dependencies

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
    if (!confidence || isNaN(confidence)) return '#666';
    if (confidence >= 0.8) return '#00aa00';
    if (confidence >= 0.6) return '#ff8800';
    return '#ff4444';
  };

  const getQualityImprovement = () => {
    if (!analysis) return null;
    
    // Check if we have valid quality values
    const currentQuality = analysis.currentQuality && !isNaN(analysis.currentQuality) ? analysis.currentQuality : 0;
    const predictedQuality = analysis.predictedQuality && !isNaN(analysis.predictedQuality) ? analysis.predictedQuality : 0;
    
    if (currentQuality === 0 || predictedQuality === 0) {
      return {
        text: 'Unable to calculate quality improvement',
        color: '#666',
        icon: '❓',
        confidence: 'Unknown'
      };
    }
    
    const improvement = predictedQuality - currentQuality;
    const confidence = analysis.confidence && !isNaN(analysis.confidence) 
      ? (analysis.confidence >= 0.8 ? 'High confidence' : analysis.confidence >= 0.6 ? 'Medium confidence' : 'Low confidence')
      : 'Unknown';
    
    if (Math.abs(improvement) < 0.2) {
      return {
        text: 'Great! You\'re already making excellent coffee.',
        color: '#00aa00',
        icon: '🎉',
        confidence
      };
    } else if (improvement > 0.2) {
      return {
        text: `AI predicts +${improvement.toFixed(1)} points improvement`,
        color: '#00aa00',
        icon: '📈',
        confidence
      };
    } else if (improvement < -0.2) {
      return {
        text: `Quality may decrease by ${Math.abs(improvement).toFixed(1)} points`,
        color: '#ff4444',
        icon: '📉',
        confidence
      };
    }
    return {
      text: 'Quality should remain stable',
      color: '#666',
      icon: '➡️',
      confidence
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
            {analysis.confidence && !isNaN(analysis.confidence) ? Math.round(analysis.confidence * 100) : 0}% confident
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
                  <div className="confidence-indicator" style={{ fontSize: '0.8em', opacity: 0.8 }}>
                    ({qualityImprovement.confidence})
                  </div>
                </div>
              )}
            </div>
            
            <div className="quality-comparison">
              <div className="quality-item">
                <span className="quality-label">Current:</span>
                <span className="quality-value current">
                  {analysis.currentQuality && !isNaN(analysis.currentQuality) ? analysis.currentQuality : 'N/A'}/10
                </span>
              </div>
              <div className="quality-arrow">→</div>
              <div className="quality-item">
                <span className="quality-label">AI Prediction:</span>
                <span className="quality-value predicted">
                  {analysis.predictedQuality && !isNaN(analysis.predictedQuality) ? analysis.predictedQuality : 'N/A'}/10
                </span>
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
                    {typeof rec === 'string' ? (
                      // Handle simple string recommendations (new ML format)
                      <>
                        <div className="rec-header">
                          <div className="rec-priority" style={{ color: '#4CAF50' }}>
                            💡 RECOMMENDATION
                          </div>
                          <div className="rec-type">TECHNIQUE</div>
                        </div>
                        <div className="rec-action">{rec}</div>
                        <div className="rec-improvement">
                          <span className="improvement-icon">📊</span>
                          Expected to improve shot quality
                        </div>
                      </>
                    ) : (
                      // Handle structured recommendations (old format)
                      <>
                        <div className="rec-header">
                          <div className="rec-priority" style={{ color: getPriorityColor(rec.priority) }}>
                            {getPriorityIcon(rec.priority)} {rec.priority?.toUpperCase() || 'MEDIUM'}
                          </div>
                          <div className="rec-type">{rec.type || 'TECHNIQUE'}</div>
                        </div>
                        <div className="rec-action">{rec.action || rec.message || rec}</div>
                        <div className="rec-improvement">
                          <span className="improvement-icon">📊</span>
                          {rec.expectedImprovement || rec.impact || 'Expected to improve shot quality'}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          <div className="analysis-section">
            <h4>📋 Detailed Analysis</h4>
            <div className="analysis-items">
              <div className="analysis-item">
                <div className="analysis-header">
                  <span className="analysis-icon">📊</span>
                  <span className="analysis-param">Quality Score</span>
                </div>
                <div className="analysis-message">
                  {analysis.analysis?.qualityScore || analysis.predictedQuality || 'N/A'} out of 10
                </div>
              </div>
              
              <div className="analysis-item">
                <div className="analysis-header">
                  <span className="analysis-icon">🎯</span>
                  <span className="analysis-param">Confidence</span>
                </div>
                <div className="analysis-message">
                  {analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : 'N/A'}
                </div>
              </div>
              
              <div className="analysis-item">
                <div className="analysis-header">
                  <span className="analysis-icon">🤖</span>
                  <span className="analysis-param">Model Used</span>
                </div>
                <div className="analysis-message">
                  {analysis.analysis?.modelUsed || 'Colab-Trained Scikit-Learn Model'}
                </div>
              </div>
              
              <div className="analysis-item">
                <div className="analysis-header">
                  <span className="analysis-icon">📝</span>
                  <span className="analysis-param">Model Version</span>
                </div>
                <div className="analysis-message">
                  {analysis.modelVersion || analysis.analysis?.modelVersion || '1.0'}
                </div>
              </div>
              
              <div className="analysis-item">
                <div className="analysis-header">
                  <span className="analysis-icon">⏰</span>
                  <span className="analysis-param">Analysis Time</span>
                </div>
                <div className="analysis-message">
                  {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis (if available from rule-based fallback) */}
          {analysis.diagnosis && (
            <div className="diagnosis-section">
              <h4>🔍 Diagnosis</h4>
              <div className="diagnosis-text">{analysis.diagnosis}</div>
            </div>
          )}

          {/* AI Learning Insights */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="learning-insights">
              <h4>🧠 AI Learning Insights</h4>
              <div className="insights-content">
                <div className="insight-item">
                  <span className="insight-icon">📊</span>
                  <span className="insight-text">
                    Based on {analysis.trainingDataCount || 'your'} previous shots, the AI has identified patterns in your brewing technique.
                  </span>
                </div>
                {analysis.modelVersion && analysis.modelVersion !== 'fallback' && (
                  <div className="insight-item">
                    <span className="insight-icon">🤖</span>
                    <span className="insight-text">
                      Using trained model v{analysis.modelVersion} with {analysis.confidence >= 0.8 ? 'high' : analysis.confidence >= 0.6 ? 'medium' : 'low'} confidence.
                    </span>
                  </div>
                )}
                <div className="insight-item">
                  <span className="insight-icon">💡</span>
                  <span className="insight-text">
                    Each shot you log helps improve the AI's recommendations for you and other users.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Model Info */}
          <div className="model-info">
            <small>
              {analysis.confidence && !isNaN(analysis.confidence) ? (
                analysis.confidence >= 0.8 
                  ? '🧠 High-confidence AI prediction' 
                  : analysis.confidence >= 0.6 
                  ? '🤔 Medium-confidence AI prediction'
                  : '📝 Low-confidence prediction (more data needed)'
              ) : (
                '📝 Unable to determine confidence level'
              )}
            </small>
            {analysis.modelVersion && analysis.modelVersion !== 'fallback' && (
              <small style={{ display: 'block', marginTop: '4px' }}>
                Model: {analysis.modelVersion} | Last updated: {analysis.lastTrainingDate ? new Date(analysis.lastTrainingDate).toLocaleDateString() : 'Unknown'}
              </small>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoach;
