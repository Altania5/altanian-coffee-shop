import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import AddBeanForm from './AddBeanForm';
import { getAIDataCollectionService } from '../services/AIDataCollectionService';

function AddCoffeeLogForm({ token, beans, onLogAdded, onBeanAdded, user }) {
  const [showBeanForm, setShowBeanForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({});
  const [formData, setFormData] = useState({
    // Basic Parameters
    bean: '',
    bag: '',
    machine: 'Meraki',
    grindSize: '',
    extractionTime: '',
    temperature: 93,
    inWeight: 18,
    outWeight: 36,

    // NEW: Bean Characteristics (auto-populated from bean selection)
    roastLevel: '',
    processMethod: '',
    daysPastRoast: 14, // CRITICAL: 13.4% feature importance
    beanUsageCount: 1, // CRITICAL: 6.9% feature importance

    // NEW: Preparation Technique Parameters
    usedPuckScreen: false,
    usedWDT: false,
    distributionTechnique: 'none',

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

    // NEW: Pre-Infusion Parameters
    usedPreInfusion: false,
    preInfusionTime: '',
    preInfusionPressure: '',

    // Legacy
    tasteMetExpectations: true,
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bags, setBags] = useState([]);
  const [bagForm, setBagForm] = useState({ bagSizeGrams: 250 });
  const [bagWarning, setBagWarning] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.inWeight, formData.outWeight, formData.extractionTime]);

  // Fetch bags when bean changes
  useEffect(() => {
    const fetchBags = async () => {
      if (!formData.bean) { setBags([]); return; }
      try {
        const resp = await api.get(`/beanbags?bean=${formData.bean}`);
        setBags(resp.data || []);
      } catch (e) {
        setBags([]);
      }
    };
    fetchBags();
  }, [formData.bean, token]);

  // Predict low bag warning
  useEffect(() => {
    const selectedBag = bags.find(b => b._id === formData.bag);
    if (selectedBag && formData.inWeight) {
      const remainingAfter = (selectedBag.remainingGrams || 0) - (formData.inWeight || 0);
      setBagWarning(remainingAfter <= 0 ? '⚠️ This bag will be empty after this shot.' : (remainingAfter <= 20 ? '⚠️ Running low. Consider preparing a new bag soon.' : ''));
    } else {
      setBagWarning('');
    }
  }, [bags, formData.bag, formData.inWeight]);

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
      let newFormData = {
        ...formData,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
      };
      
      // Auto-populate bean characteristics when bean is selected
      if (name === 'bean' && value && beans) {
        const selectedBean = beans.find(bean => bean._id === value);
        if (selectedBean) {
          newFormData.roastLevel = selectedBean.roastLevel || '';
          newFormData.processMethod = selectedBean.processMethod || '';
        }
        // Reset selected bag when bean changes
        newFormData.bag = '';
      }
      
      setFormData(newFormData);
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
      const response = await api.post('/coffeelogs/add', formData);
      
      // Collect data for AI training
      const dataCollectionService = getAIDataCollectionService();
      await dataCollectionService.collectShotData(response.data);
      
      onLogAdded(response.data);
      setSuccess('✅ Coffee log added successfully! Keep tracking your progress.');
      
      // Reset form to defaults
      setFormData({
        bean: '',
        bag: '',
        machine: 'Meraki',
        grindSize: '',
        extractionTime: '',
        temperature: 93,
        inWeight: 18,
        outWeight: 36,

        // NEW: Bean Characteristics
        roastLevel: '',
        processMethod: '',
        daysPastRoast: 14,
        beanUsageCount: 1,

        // NEW: Preparation Technique Parameters
        usedPuckScreen: false,
        usedWDT: false,
        distributionTechnique: 'none',

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

        // NEW: Pre-Infusion Parameters
        usedPreInfusion: false,
        preInfusionTime: '',
        preInfusionPressure: '',

        tasteMetExpectations: true,
        notes: ''
      });
      setBags([]);
      setBagForm({ bagSizeGrams: 250 });
      
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

          {/* Bag selection for the chosen bean */}
          {formData.bean && (
            <div className="form-row">
              <div className="form-group">
                <label>Bag</label>
                <select name="bag" value={formData.bag || ''} onChange={handleChange}>
                  <option value="">Select bag (optional)</option>
                  {bags.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.bagSizeGrams}g bag • {Math.max(0, b.remainingGrams)}g left {b.isEmpty ? '(empty)' : ''}
                    </option>
                  ))}
                </select>
                {bagWarning && <div className="input-hint" style={{ color: '#c67c00' }}>{bagWarning}</div>}
              </div>
            </div>
          )}
          
          {/* Bean Characteristics (auto-populated) */}
          {(formData.roastLevel || formData.processMethod) && (
            <div className="form-row bean-characteristics">
              <div className="form-group">
                <label>Roast Level</label>
                <select name="roastLevel" value={formData.roastLevel} onChange={handleChange}>
                  <option value="">Select roast level</option>
                  <option value="light">Light</option>
                  <option value="light-medium">Light-Medium</option>
                  <option value="medium">Medium</option>
                  <option value="medium-dark">Medium-Dark</option>
                  <option value="dark">Dark</option>
                </select>
                <span className="input-hint">Auto-filled from bean selection</span>
              </div>

              <div className="form-group">
                <label>Process Method</label>
                <select name="processMethod" value={formData.processMethod} onChange={handleChange}>
                  <option value="">Select process method</option>
                  <option value="washed">Washed</option>
                  <option value="natural">Natural</option>
                  <option value="honey">Honey</option>
                  <option value="semi-washed">Semi-Washed</option>
                  <option value="other">Other</option>
                </select>
                <span className="input-hint">Auto-filled from bean selection</span>
              </div>
            </div>
          )}

          {/* CRITICAL AI Parameters - Bean Freshness & Usage */}
          {formData.bean && (
            <div className="form-row bean-characteristics">
              <div className="form-group">
                <label>Days Past Roast ⭐</label>
                <input
                  type="number"
                  name="daysPastRoast"
                  value={formData.daysPastRoast}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  step="1"
                />
                <span className="input-hint">
                  🎯 13.4% AI importance - Days since beans were roasted (optimal: 7-21 days)
                </span>
              </div>

              <div className="form-group">
                <label>Bean Usage Count ⭐</label>
                <input
                  type="number"
                  name="beanUsageCount"
                  value={formData.beanUsageCount}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  step="1"
                />
                <span className="input-hint">
                  🎯 6.9% AI importance - How many shots you've made with this bean (affects dialing-in)
                </span>
              </div>
            </div>
          )}
          
          {/* Preparation Technique */}
          <div className="form-section prep-technique">
            <h4 className="subsection-title">🔧 Preparation Technique</h4>
            
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    name="usedPuckScreen" 
                    checked={formData.usedPuckScreen} 
                    onChange={handleChange} 
                  />
                  <span>Used Puck Screen</span>
                </label>
                <span className="input-hint">Helps with even extraction</span>
              </div>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    name="usedWDT" 
                    checked={formData.usedWDT} 
                    onChange={handleChange} 
                  />
                  <span>Used WDT (Weiss Distribution Technique)</span>
                </label>
                <span className="input-hint">Distributes grounds for even extraction</span>
              </div>
            </div>
            
            <div className="form-group">
              <label>Distribution Technique</label>
              <select name="distributionTechnique" value={formData.distributionTechnique} onChange={handleChange}>
                <option value="none">None / Just Tamp</option>
                <option value="tap-only">Tap Only</option>
                <option value="distribution-tool">Distribution Tool</option>
                <option value="wdt">WDT Only</option>
                <option value="wdt-plus-distribution">WDT + Distribution Tool</option>
              </select>
              <span className="input-hint">How you prepared the puck</span>
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

        {/* Bag Management */}
        {formData.bean && (
          <div className="form-section">
            <h3 className="section-title">Bean Bag</h3>
            <div className="form-row">
              <div className="form-group">
                <label>New Bag Size (g)</label>
                <input
                  type="number"
                  min="100"
                  step="10"
                  value={bagForm.bagSizeGrams}
                  onChange={(e) => setBagForm({ bagSizeGrams: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const resp = await api.post('/beanbags', { bean: formData.bean, bagSizeGrams: bagForm.bagSizeGrams });
                      setBags([resp.data, ...bags]);
                      setFormData({ ...formData, bag: resp.data._id });
                    } catch (e) {
                      setError(e.response?.data?.msg || 'Failed to create bag');
                    }
                  }}
                >
                  ➕ Create New Bag
                </button>
              </div>
            </div>
            {formData.bag && (
              <div className="form-group">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.patch(`/beanbags/${formData.bag}/empty`, {});
                      const updated = bags.map(b => b._id === formData.bag ? { ...b, remainingGrams: 0, isEmpty: true } : b);
                      setBags(updated);
                    } catch (e) {
                      setError(e.response?.data?.msg || 'Failed to mark bag empty');
                    }
                  }}
                >
                  🗑️ Mark Bag Empty
                </button>
              </div>
            )}
          </div>
        )}

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
            
            {/* Pre-Infusion Section */}
            <div className="form-section pre-infusion">
              <h4 className="subsection-title">💧 Pre-Infusion</h4>
              <p className="section-description">Pre-infusion helps achieve even saturation before full extraction</p>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    name="usedPreInfusion" 
                    checked={formData.usedPreInfusion} 
                    onChange={handleChange} 
                  />
                  <span>Used Pre-Infusion</span>
                </label>
                <span className="input-hint">{formData.machine === 'Meraki' ? 'Recommended for optimal extraction' : 'If your machine supports it'}</span>
              </div>
              
              {formData.usedPreInfusion && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Pre-Infusion Time (seconds)</label>
                    <input 
                      type="number" 
                      name="preInfusionTime" 
                      value={formData.preInfusionTime} 
                      onChange={handleChange} 
                      min="0" 
                      max="15" 
                      step="0.5"
                      placeholder={formData.machine === 'Meraki' ? '3-5s recommended' : ''}
                    />
                    <span className="input-hint">
                      {formData.machine === 'Meraki' 
                        ? 'Meraki optimal: 3-5 seconds for most beans' 
                        : '0-15 seconds typical range'}
                    </span>
                  </div>
                  
                  <div className="form-group">
                    <label>Pre-Infusion Pressure (bars)</label>
                    <input 
                      type="number" 
                      name="preInfusionPressure" 
                      value={formData.preInfusionPressure} 
                      onChange={handleChange} 
                      min="1" 
                      max="5" 
                      step="0.1"
                      placeholder={formData.machine === 'Meraki' ? '3-4 bars' : ''}
                    />
                    <span className="input-hint">
                      {formData.machine === 'Meraki' 
                        ? 'Meraki optimal: 3-4 bars for gentle saturation' 
                        : '1-5 bars typical range'}
                    </span>
                  </div>
                </div>
              )}
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