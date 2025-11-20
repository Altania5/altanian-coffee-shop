import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './DialInMode.css';

/**
 * Dial-In Mode Component
 * ======================
 *
 * Multi-step workflow for Bayesian optimization of espresso parameters.
 *
 * Workflow:
 * 1. Setup: Select bean and brewing method
 * 2. Instructions: Show AI-recommended parameters
 * 3. Feedback: User inputs actual results and taste score
 * 4. Loop: Repeat steps 2-3 until optimized
 */
function DialInMode({ token, beans, user }) {
  // Workflow state
  const [step, setStep] = useState('setup'); // setup, instructions, feedback, complete
  const [beanId, setBeanId] = useState('');
  const [method, setMethod] = useState('espresso');

  // Optimization data
  const [recommendation, setRecommendation] = useState(null);
  const [optimizationStatus, setOptimizationStatus] = useState(null);
  const [trialNumber, setTrialNumber] = useState(0);

  // Shot data
  const [shotData, setShotData] = useState({
    grind: '',
    dose: '',
    time: '',
    outWeight: '',
    temperature: 93,
    pressure: 9,
    score: 5
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Selected bean info
  const selectedBean = beans.find(b => b._id === beanId);

  /**
   * Step 1: Start dial-in session
   */
  const handleStart = async () => {
    if (!beanId) {
      setError('Please select a coffee bean');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/dial-in/start', { beanId, method });

      if (response.data.success) {
        setRecommendation(response.data.data.recommendation);
        setOptimizationStatus(response.data.data.status);

        // Pre-fill shot data with recommendations
        setShotData(prev => ({
          ...prev,
          grind: response.data.data.recommendation.recommendation.grind,
          dose: response.data.data.recommendation.recommendation.dose,
          time: response.data.data.recommendation.recommendation.target_time
        }));

        setTrialNumber(response.data.data.recommendation.trial_number);
        setStep('instructions');
        setSuccess('Dial-in session started!');
      } else if (response.data.fallback) {
        // Fallback mode
        setRecommendation(response.data.data);
        setShotData(prev => ({
          ...prev,
          grind: response.data.data.recommendation.grind,
          dose: response.data.data.recommendation.dose,
          time: response.data.data.recommendation.target_time
        }));
        setStep('instructions');
        setError('AI Optimizer is offline. Using default recommendations.');
      }
    } catch (err) {
      console.error('Error starting dial-in:', err);
      setError(err.response?.data?.error || 'Failed to start dial-in session');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Submit feedback and get next recommendation
   */
  const handleSubmitFeedback = async () => {
    if (!shotData.score) {
      setError('Please provide a taste score');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const lastShot = {
        grind: parseFloat(shotData.grind),
        dose: parseFloat(shotData.dose),
        time: parseFloat(shotData.time),
        outWeight: shotData.outWeight ? parseFloat(shotData.outWeight) : undefined,
        temperature: shotData.temperature,
        pressure: shotData.pressure,
        score: parseFloat(shotData.score),
        trialNumber: trialNumber
      };

      const response = await api.post('/api/dial-in/next', {
        beanId,
        method,
        lastShot
      });

      if (response.data.success) {
        setRecommendation(response.data.data.recommendation);

        // Update shot data with new recommendations
        setShotData(prev => ({
          ...prev,
          grind: response.data.data.recommendation.recommendation.grind,
          dose: response.data.data.recommendation.recommendation.dose,
          time: response.data.data.recommendation.recommendation.target_time,
          score: 5 // Reset score
        }));

        setTrialNumber(response.data.data.recommendation.trial_number);

        // Check if we've found a great shot
        if (lastShot.score >= 8.5) {
          setSuccess(`Great shot! Score: ${lastShot.score}/10. You can continue optimizing or finish.`);
        } else {
          setSuccess('Feedback recorded. Try the new recommendation!');
        }

        setStep('instructions');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load history for the selected bean
   */
  const loadHistory = async () => {
    if (!beanId) return;

    try {
      const response = await api.get(`/api/dial-in/history/${beanId}?method=${method}&limit=10`);
      if (response.data.success) {
        setHistory(response.data.data.logs);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Load history when bean changes
  useEffect(() => {
    if (beanId && showHistory) {
      loadHistory();
    }
    // eslint-disable-next-line
  }, [beanId, showHistory, method]);

  /**
   * Get best parameters so far
   */
  const loadBestParameters = async () => {
    if (!beanId) return;

    try {
      const response = await api.get(`/api/dial-in/best/${beanId}?method=${method}`);
      if (response.data.success) {
        const best = response.data.data.bestParameters.best_trial;
        setShotData(prev => ({
          ...prev,
          grind: best.parameters.grind,
          dose: best.parameters.dose,
          time: best.parameters.time
        }));
        setSuccess(`Loaded best parameters (Score: ${best.score}/10)`);
      }
    } catch (err) {
      setError('No best parameters found yet');
    }
  };

  /**
   * Reset and start over
   */
  const handleReset = () => {
    setStep('setup');
    setBeanId('');
    setMethod('espresso');
    setRecommendation(null);
    setOptimizationStatus(null);
    setShotData({
      grind: '',
      dose: '',
      time: '',
      outWeight: '',
      temperature: 93,
      pressure: 9,
      score: 5
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="dial-in-mode">
      <div className="dial-in-header">
        <h2>🎯 Dial-In Mode</h2>
        <p>Use AI-powered Bayesian optimization to find your perfect espresso parameters</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Step 1: Setup */}
      {step === 'setup' && (
        <div className="dial-in-setup">
          <div className="form-group">
            <label>Select Coffee Bean</label>
            <select
              value={beanId}
              onChange={(e) => setBeanId(e.target.value)}
              required
            >
              <option value="">-- Select Bean --</option>
              {beans.map(bean => (
                <option key={bean._id} value={bean._id}>
                  {bean.name} ({bean.roastLevel})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Brewing Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="espresso">Espresso (1:2 ratio)</option>
              <option value="ristretto">Ristretto (1:1.5 ratio)</option>
              <option value="lungo">Lungo (1:3 ratio)</option>
            </select>
          </div>

          {selectedBean && (
            <div className="bean-info">
              <h4>{selectedBean.name}</h4>
              <p><strong>Roast:</strong> {selectedBean.roastLevel}</p>
              <p><strong>Process:</strong> {selectedBean.processMethod}</p>
              {selectedBean.origin && <p><strong>Origin:</strong> {selectedBean.origin}</p>}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={loading || !beanId}
          >
            {loading ? 'Starting...' : 'Start Dial-In Session'}
          </button>

          {beanId && (
            <button
              className="btn-secondary"
              onClick={() => { setShowHistory(!showHistory); loadHistory(); }}
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          )}

          {showHistory && history.length > 0 && (
            <div className="history-section">
              <h4>Previous Trials</h4>
              <div className="history-list">
                {history.map((log, idx) => (
                  <div key={log._id} className="history-item">
                    <span className="trial-num">Trial {log.trialNumber}</span>
                    <span className="trial-score">Score: {log.shotQuality}/10</span>
                    <span className="trial-params">
                      Grind: {log.grindSize}, Dose: {log.inWeight}g, Time: {log.extractionTime}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Instructions */}
      {step === 'instructions' && recommendation && (
        <div className="dial-in-instructions">
          <div className="trial-info">
            <h3>Trial #{trialNumber}</h3>
            {recommendation.best_so_far && (
              <div className="best-so-far">
                <p>🏆 Best Score So Far: {recommendation.best_so_far.score}/10</p>
                <p className="trial-count">Total Trials: {recommendation.total_trials}</p>
              </div>
            )}
          </div>

          <div className="recommendations-card">
            <h4>📋 Recommended Parameters</h4>
            <div className="param-list">
              <div className="param-item">
                <span className="param-label">Grind Size:</span>
                <span className="param-value">{recommendation.recommendation.grind}</span>
              </div>
              <div className="param-item">
                <span className="param-label">Dose:</span>
                <span className="param-value">{recommendation.recommendation.dose}g</span>
              </div>
              <div className="param-item">
                <span className="param-label">Target Time:</span>
                <span className="param-value">{recommendation.recommendation.target_time}s</span>
              </div>
            </div>
          </div>

          <div className="instructions-text">
            <h4>⚙️ Instructions:</h4>
            <ol>
              <li>Set your grinder to <strong>{recommendation.recommendation.grind}</strong></li>
              <li>Dose <strong>{recommendation.recommendation.dose}g</strong> of coffee</li>
              <li>Pull your shot, aiming for <strong>{recommendation.recommendation.target_time}s</strong></li>
              <li>Taste and evaluate the shot</li>
              <li>Return here to provide feedback</li>
            </ol>
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={() => setStep('feedback')}
            >
              I Made the Shot - Provide Feedback
            </button>
            <button
              className="btn-secondary"
              onClick={loadBestParameters}
            >
              Load Best Parameters
            </button>
            <button
              className="btn-secondary"
              onClick={handleReset}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Feedback */}
      {step === 'feedback' && (
        <div className="dial-in-feedback">
          <h3>📊 Report Your Results</h3>

          <div className="form-group">
            <label>Actual Extraction Time (seconds)</label>
            <input
              type="number"
              step="0.1"
              value={shotData.time}
              onChange={(e) => setShotData({...shotData, time: e.target.value})}
              placeholder="e.g., 28.5"
            />
          </div>

          <div className="form-group">
            <label>Output Weight (grams) - Optional</label>
            <input
              type="number"
              step="0.1"
              value={shotData.outWeight}
              onChange={(e) => setShotData({...shotData, outWeight: e.target.value})}
              placeholder="e.g., 36"
            />
          </div>

          <div className="form-group">
            <label>Taste Score (0-10) ⭐</label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={shotData.score}
              onChange={(e) => setShotData({...shotData, score: e.target.value})}
            />
            <div className="score-display">
              <span className="score-value">{shotData.score}</span>
              <span className="score-label">
                {shotData.score >= 9 ? '🎉 God Shot!' :
                 shotData.score >= 8 ? '😋 Excellent' :
                 shotData.score >= 7 ? '👍 Good' :
                 shotData.score >= 5 ? '😐 Okay' :
                 '😞 Needs Work'}
              </span>
            </div>
          </div>

          <div className="score-guide">
            <h4>Scoring Guide:</h4>
            <ul>
              <li><strong>9-10:</strong> Perfect balance, amazing flavor</li>
              <li><strong>7-8:</strong> Very good, minor improvements possible</li>
              <li><strong>5-6:</strong> Drinkable, but noticeable issues</li>
              <li><strong>3-4:</strong> Significant problems (sour/bitter)</li>
              <li><strong>0-2:</strong> Undrinkable</li>
            </ul>
          </div>

          <div className="form-group">
            <label>Temperature (°C) - Optional</label>
            <input
              type="number"
              step="0.5"
              value={shotData.temperature}
              onChange={(e) => setShotData({...shotData, temperature: e.target.value})}
            />
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={handleSubmitFeedback}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit & Get Next Recommendation'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setStep('instructions')}
            >
              Back to Instructions
            </button>
            {shotData.score >= 8.5 && (
              <button
                className="btn-success"
                onClick={handleReset}
              >
                ✅ Finish - I'm Happy With This
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DialInMode;
