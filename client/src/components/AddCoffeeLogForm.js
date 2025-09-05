import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddBeanForm from './AddBeanForm';

function AddCoffeeLogForm({ token, beans, onLogAdded, onBeanAdded, user }) {
  const [showBeanForm, setShowBeanForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({});
  const [formData, setFormData] = useState({
    // Basic Parameters
    bean: '',
    machine: 'Meraki',
    grindSize: '',
    extractionTime: '',
    temperature: 93,
    inWeight: 18,
    outWeight: 36,
    
    // AI Training Parameters
    shotQuality: 5,
    tasteProfile: {
      sweetness: 3,
      acidity: 3,
      bitterness: 3,
      body: 3
    },
    targetProfile: 'balanced',
    
    // Advanced Parameters
    humidity: '',
    pressure: 9,
    
    // Legacy
    tasteMetExpectations: true,
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Real-time calculations
  useEffect(() => {
    const { inWeight, outWeight, extractionTime } = formData;
    const calculated = {};
    
    if (inWeight && outWeight) {
      calculated.ratio = (outWeight / inWeight).toFixed(2);
      calculated.extractionYield = ((outWeight * 0.12) / inWeight * 100).toFixed(1);
    }
    
    if (outWeight && extractionTime) {
      calculated.flowRate = (outWeight / extractionTime).toFixed(2);
    }
    
    setCalculatedValues(calculated);
  }, [formData.inWeight, formData.outWeight, formData.extractionTime]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects (like tasteProfile.sweetness)
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'number' ? parseFloat(value) || 0 : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
      });
    }
  };
  
  const getQualityLabel = (value) => {
    const labels = {
      1: '😞 Terrible', 2: '😕 Poor', 3: '😐 Below Average', 4: '🙂 Fair', 5: '😊 Good',
      6: '😄 Very Good', 7: '🤩 Great', 8: '⭐ Excellent', 9: '🔥 Amazing', 10: '☕ Perfect'
    };
    return labels[value] || 'Rate it!';
  };
  
  const getTasteLabel = (value) => {
    const labels = { 1: 'Very Low', 2: 'Low', 3: 'Balanced', 4: 'High', 5: 'Very High' };
    return labels[value] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const headers = { 'x-auth-token': token };
      const response = await axios.post('/coffeelogs/add', formData, { headers });
      
      onLogAdded(response.data);
      setSuccess('✅ Coffee log added successfully! Keep tracking your progress.');
      
      // Reset form to defaults
      setFormData({
        bean: '',
        machine: 'Meraki',
        grindSize: '',
        extractionTime: '',
        temperature: 93,
        inWeight: 18,
        outWeight: 36,
        shotQuality: 5,
        tasteProfile: {
          sweetness: 3,
          acidity: 3,
          bitterness: 3,
          body: 3
        },
        targetProfile: 'balanced',
        humidity: '',
        pressure: 9,
        tasteMetExpectations: true,
        notes: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred while saving your coffee log.');
    }
  };

  return (
    <div className="coffee-log-container">
      <div className="log-header">
        <h2 className="log-title">Espresso Training Log ☕</h2>
        <p className="log-subtitle">Track your shots, improve your craft with AI insights</p>
      </div>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      {user.role === 'owner' && (
        <button 
          className="toggle-bean-form-btn" 
          onClick={() => setShowBeanForm(!showBeanForm)}
        >
          {showBeanForm ? '❌ Cancel' : '🌱 Add New Bean'}
        </button>
      )}

      {showBeanForm && (
        <div className="bean-form-wrapper">
          <AddBeanForm token={token} onBeanAdded={(newBean) => {
            onBeanAdded(newBean);
            setShowBeanForm(false);
          }} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="coffee-log-form">
        {/* Basic Shot Parameters */}
        <div className="form-section">
          <h3 className="section-title">Shot Setup</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Coffee Bean *</label>
              <select name="bean" value={formData.bean} onChange={handleChange} required>
                <option value="">Select your bean</option>
                {beans.map(bean => (
                  <option key={bean._id} value={bean._id}>
                    {bean.name} - {bean.roaster}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Machine</label>
              <select name="machine" value={formData.machine} onChange={handleChange} required>
                <option value="Meraki">Meraki</option>
                <option value="Breville">Breville</option>
                <option value="La Marzocco">La Marzocco</option>
                <option value="Rancilio">Rancilio</option>
                <option value="Gaggia">Gaggia</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Grind Size *</label>
              <input 
                type="number" 
                name="grindSize" 
                value={formData.grindSize} 
                onChange={handleChange} 
                min="1" 
                max="50" 
                step="0.5"
                required 
              />
              <span className="input-hint">1-50 scale</span>
            </div>
            
            <div className="form-group">
              <label>Temperature (°C)</label>
              <input 
                type="number" 
                name="temperature" 
                value={formData.temperature} 
                onChange={handleChange} 
                min="85" 
                max="96" 
                step="0.5"
              />
              <span className="input-hint">85-96°C recommended</span>
            </div>
          </div>
        </div>

        {/* Weight & Timing */}
        <div className="form-section">
          <h3 className="section-title">Extraction Parameters</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Coffee In (g) *</label>
              <input 
                type="number" 
                name="inWeight" 
                value={formData.inWeight} 
                onChange={handleChange} 
                min="10" 
                max="30" 
                step="0.1"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Espresso Out (g) *</label>
              <input 
                type="number" 
                name="outWeight" 
                value={formData.outWeight} 
                onChange={handleChange} 
                min="15" 
                max="80" 
                step="0.1"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Time (seconds) *</label>
              <input 
                type="number" 
                name="extractionTime" 
                value={formData.extractionTime} 
                onChange={handleChange} 
                min="10" 
                max="60" 
                step="0.1"
                required 
              />
            </div>
          </div>
          
          {/* Real-time calculations */}
          {(calculatedValues.ratio || calculatedValues.flowRate) && (
            <div className="calculated-values">
              <div className="calc-item">
                <span className="calc-label">Ratio:</span>
                <span className="calc-value">{calculatedValues.ratio || '--'}:1</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Flow Rate:</span>
                <span className="calc-value">{calculatedValues.flowRate || '--'} ml/s</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Est. Yield:</span>
                <span className="calc-value">{calculatedValues.extractionYield || '--'}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Shot Quality & Taste */}
        <div className="form-section">
          <h3 className="section-title">Shot Evaluation</h3>
          
          <div className="form-group quality-rating">
            <label>Overall Quality: {getQualityLabel(formData.shotQuality)}</label>
            <input 
              type="range" 
              name="shotQuality" 
              value={formData.shotQuality} 
              onChange={handleChange} 
              min="1" 
              max="10" 
              className="quality-slider"
            />
            <div className="range-labels">
              <span>1 - Terrible</span>
              <span>10 - Perfect</span>
            </div>
          </div>
          
          <div className="taste-profile">
            <h4>Taste Profile</h4>
            <div className="taste-sliders">
              {['sweetness', 'acidity', 'bitterness', 'body'].map(taste => (
                <div key={taste} className="taste-item">
                  <label>{taste.charAt(0).toUpperCase() + taste.slice(1)}: {getTasteLabel(formData.tasteProfile[taste])}</label>
                  <input 
                    type="range" 
                    name={`tasteProfile.${taste}`} 
                    value={formData.tasteProfile[taste]} 
                    onChange={handleChange} 
                    min="1" 
                    max="5" 
                    className="taste-slider"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Target Profile</label>
            <select name="targetProfile" value={formData.targetProfile} onChange={handleChange}>
              <option value="balanced">Balanced</option>
              <option value="bright">Bright & Acidic</option>
              <option value="sweet">Sweet & Smooth</option>
              <option value="strong">Strong & Bold</option>
              <option value="fruity">Fruity</option>
              <option value="chocolatey">Chocolatey</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Advanced Parameters */}
        <button 
          type="button" 
          className="toggle-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '⬆️ Hide Advanced' : '⬇️ Show Advanced Settings'}
        </button>
        
        {showAdvanced && (
          <div className="form-section advanced-section">
            <h3 className="section-title">Advanced Parameters</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Humidity (%)</label>
                <input 
                  type="number" 
                  name="humidity" 
                  value={formData.humidity} 
                  onChange={handleChange} 
                  min="30" 
                  max="80" 
                />
                <span className="input-hint">Optional environmental factor</span>
              </div>
              
              <div className="form-group">
                <label>Pressure (bars)</label>
                <input 
                  type="number" 
                  name="pressure" 
                  value={formData.pressure} 
                  onChange={handleChange} 
                  min="6" 
                  max="12" 
                  step="0.1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="form-section">
          <div className="form-group">
            <label>Notes & Observations</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              placeholder="What did you notice? Any adjustments made? How did it taste?"
              maxLength="500"
            />
            <span className="input-hint">{formData.notes.length}/500 characters</span>
          </div>
        </div>

        {/* Legacy satisfaction */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              name="tasteMetExpectations" 
              checked={formData.tasteMetExpectations} 
              onChange={handleChange} 
            />
            <span className="checkmark"></span>
            This shot met my expectations ✓
          </label>
        </div>
        
        <button type="submit" className="submit-btn">
          <span>📊 Log This Shot</span>
        </button>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

export default AddCoffeeLogForm;