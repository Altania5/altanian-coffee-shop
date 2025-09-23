import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './SeasonalManager.css';

function SeasonalManager({ user }) {
  const [activeTab, setActiveTab] = useState('themes');
  const [themes, setThemes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [editingHoliday, setEditingHoliday] = useState(null);
  
  // Form states
  const [themeForm, setThemeForm] = useState({
    name: '',
    season: 'spring',
    startDate: '',
    endDate: '',
    backgroundColors: ['#98FB98', '#90EE90', '#32CD32'],
    animations: ['blooming'],
    description: ''
  });
  
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    backgroundColors: ['#FF8C00', '#FF4500', '#8B0000'],
    animations: ['spooky'],
    description: '',
    isActive: true
  });

  useEffect(() => {
    loadSeasonalData();
  }, []);

  const loadSeasonalData = async () => {
    try {
      setLoading(true);
      // Mock data for now - in a real app, this would fetch from your API
      const mockThemes = [
        {
          id: 1,
          name: 'Spring Bloom',
          season: 'spring',
          startDate: '2024-03-20',
          endDate: '2024-06-20',
          backgroundColors: ['#98FB98', '#90EE90', '#32CD32'],
          animations: ['blooming'],
          description: 'Beautiful spring flowers and blooming effects',
          isActive: true
        },
        {
          id: 2,
          name: 'Summer Sunshine',
          season: 'summer',
          startDate: '2024-06-21',
          endDate: '2024-09-21',
          backgroundColors: ['#FFD700', '#FFA500', '#FF6347'],
          animations: ['sunshine'],
          description: 'Warm summer sunshine and golden effects',
          isActive: true
        },
        {
          id: 3,
          name: 'Autumn Leaves',
          season: 'fall',
          startDate: '2024-09-22',
          endDate: '2024-12-20',
          backgroundColors: ['#CD853F', '#D2691E', '#8B4513'],
          animations: ['falling-leaves'],
          description: 'Falling leaves and warm autumn colors',
          isActive: true
        },
        {
          id: 4,
          name: 'Winter Wonderland',
          season: 'winter',
          startDate: '2024-12-21',
          endDate: '2024-03-19',
          backgroundColors: ['#F0F8FF', '#E6E6FA', '#B0C4DE'],
          animations: ['snowflakes'],
          description: 'Snowflakes and winter magic',
          isActive: true
        }
      ];
      
      const mockHolidays = [
        {
          id: 1,
          name: 'Halloween',
          date: '2024-10-31',
          backgroundColors: ['#FF8C00', '#FF4500', '#8B0000'],
          animations: ['spooky'],
          description: 'Spooky Halloween theme with pumpkins and ghosts',
          isActive: true
        },
        {
          id: 2,
          name: 'Christmas',
          date: '2024-12-25',
          backgroundColors: ['#228B22', '#DC143C', '#FFD700'],
          animations: ['christmas'],
          description: 'Festive Christmas theme with red, green, and gold',
          isActive: true
        },
        {
          id: 3,
          name: 'Valentine\'s Day',
          date: '2024-02-14',
          backgroundColors: ['#FFB6C1', '#FF69B4', '#DC143C'],
          animations: ['hearts'],
          description: 'Romantic Valentine\'s Day theme',
          isActive: true
        },
        {
          id: 4,
          name: 'Independence Day',
          date: '2024-07-04',
          backgroundColors: ['#0000FF', '#FFFFFF', '#FF0000'],
          animations: ['fireworks'],
          description: 'Patriotic Independence Day theme',
          isActive: true
        }
      ];
      
      setThemes(mockThemes);
      setHolidays(mockHolidays);
    } catch (error) {
      console.error('Failed to load seasonal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // In a real app, this would make an API call
      console.log('Saving theme:', themeForm);
      alert('Theme saved successfully!');
      resetThemeForm();
    } catch (error) {
      console.error('Failed to save theme:', error);
      alert('Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // In a real app, this would make an API call
      console.log('Saving holiday:', holidayForm);
      alert('Holiday saved successfully!');
      resetHolidayForm();
    } catch (error) {
      console.error('Failed to save holiday:', error);
      alert('Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const resetThemeForm = () => {
    setThemeForm({
      name: '',
      season: 'spring',
      startDate: '',
      endDate: '',
      backgroundColors: ['#98FB98', '#90EE90', '#32CD32'],
      animations: ['blooming'],
      description: ''
    });
    setEditingTheme(null);
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      name: '',
      date: '',
      backgroundColors: ['#FF8C00', '#FF4500', '#8B0000'],
      animations: ['spooky'],
      description: '',
      isActive: true
    });
    setEditingHoliday(null);
  };

  const editTheme = (theme) => {
    setThemeForm(theme);
    setEditingTheme(theme.id);
  };

  const editHoliday = (holiday) => {
    setHolidayForm(holiday);
    setEditingHoliday(holiday.id);
  };

  const toggleThemeStatus = async (themeId) => {
    try {
      setLoading(true);
      // In a real app, this would make an API call
      setThemes(prev => prev.map(theme => 
        theme.id === themeId ? { ...theme, isActive: !theme.isActive } : theme
      ));
    } catch (error) {
      console.error('Failed to toggle theme status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHolidayStatus = async (holidayId) => {
    try {
      setLoading(true);
      // In a real app, this would make an API call
      setHolidays(prev => prev.map(holiday => 
        holiday.id === holidayId ? { ...holiday, isActive: !holiday.isActive } : holiday
      ));
    } catch (error) {
      console.error('Failed to toggle holiday status:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableAnimations = [
    { id: 'blooming', name: 'Blooming Flowers', description: 'Gentle flower blooming animation' },
    { id: 'sunshine', name: 'Sunshine', description: 'Warm sunshine rays' },
    { id: 'falling-leaves', name: 'Falling Leaves', description: 'Autumn leaves falling' },
    { id: 'snowflakes', name: 'Snowflakes', description: 'Gentle snow falling' },
    { id: 'spooky', name: 'Spooky', description: 'Halloween spooky effects' },
    { id: 'christmas', name: 'Christmas', description: 'Festive Christmas animations' },
    { id: 'hearts', name: 'Hearts', description: 'Floating hearts animation' },
    { id: 'fireworks', name: 'Fireworks', description: 'Celebratory fireworks' }
  ];

  if (loading && themes.length === 0) {
    return (
      <div className="seasonal-manager">
        <div className="loading-spinner"></div>
        <p>Loading seasonal manager...</p>
      </div>
    );
  }

  return (
    <div className="seasonal-manager">
      <div className="manager-header">
        <h2>🎨 Seasonal & Holiday Manager</h2>
        <p>Manage seasonal themes and holiday decorations for the welcome widget</p>
      </div>

      <div className="manager-tabs">
        <button 
          className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          🌸 Seasonal Themes
        </button>
        <button 
          className={`tab ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          🎉 Holidays
        </button>
        <button 
          className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👀 Preview
        </button>
      </div>

      <div className="manager-content">
        {activeTab === 'themes' && (
          <div className="themes-section">
            <div className="section-header">
              <h3>Seasonal Themes</h3>
              <button 
                className="add-btn"
                onClick={resetThemeForm}
              >
                + Add New Theme
              </button>
            </div>

            <form onSubmit={handleThemeSubmit} className="theme-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="themeName">Theme Name</label>
                  <input
                    type="text"
                    id="themeName"
                    value={themeForm.name}
                    onChange={(e) => setThemeForm(prev => ({ ...prev, name: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="season">Season</label>
                  <select
                    id="season"
                    value={themeForm.season}
                    onChange={(e) => setThemeForm(prev => ({ ...prev, season: e.target.value }))}
                    required
                  >
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    value={themeForm.startDate}
                    onChange={(e) => setThemeForm(prev => ({ ...prev, startDate: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    value={themeForm.endDate}
                    onChange={(e) => setThemeForm(prev => ({ ...prev, endDate: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Background Colors</label>
                <div className="color-inputs">
                  {themeForm.backgroundColors.map((color, index) => (
                    <input
                      key={index}
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...themeForm.backgroundColors];
                        newColors[index] = e.target.value;
                        setThemeForm(prev => ({ ...prev, backgroundColors: newColors }));
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Animations</label>
                <div className="animation-selector">
                  {availableAnimations.map(animation => (
                    <label key={animation.id} className="animation-option">
                      <input
                        type="checkbox"
                        checked={themeForm.animations.includes(animation.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setThemeForm(prev => ({ 
                              ...prev, 
                              animations: [...prev.animations, animation.id] 
                            }));
                          } else {
                            setThemeForm(prev => ({ 
                              ...prev, 
                              animations: prev.animations.filter(a => a !== animation.id) 
                            }));
                          }
                        }}
                      />
                      <span className="animation-name">{animation.name}</span>
                      <span className="animation-desc">{animation.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="themeDescription">Description</label>
                <textarea
                  id="themeDescription"
                  value={themeForm.description}
                  onChange={(e) => setThemeForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : editingTheme ? 'Update Theme' : 'Create Theme'}
                </button>
                <button type="button" className="cancel-btn" onClick={resetThemeForm}>
                  Cancel
                </button>
              </div>
            </form>

            <div className="themes-list">
              <h4>Current Themes</h4>
              <div className="themes-grid">
                {themes.map(theme => (
                  <div key={theme.id} className={`theme-card ${theme.isActive ? 'active' : 'inactive'}`}>
                    <div className="theme-preview" style={{
                      background: `linear-gradient(135deg, ${theme.backgroundColors.join(', ')})`
                    }}>
                      <span className="theme-season">{theme.season}</span>
                    </div>
                    <div className="theme-info">
                      <h5>{theme.name}</h5>
                      <p>{theme.description}</p>
                      <div className="theme-dates">
                        {theme.startDate} - {theme.endDate}
                      </div>
                      <div className="theme-actions">
                        <button 
                          className={`status-btn ${theme.isActive ? 'active' : 'inactive'}`}
                          onClick={() => toggleThemeStatus(theme.id)}
                        >
                          {theme.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button 
                          className="edit-btn"
                          onClick={() => editTheme(theme)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="holidays-section">
            <div className="section-header">
              <h3>Holiday Themes</h3>
              <button 
                className="add-btn"
                onClick={resetHolidayForm}
              >
                + Add New Holiday
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="holiday-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="holidayName">Holiday Name</label>
                  <input
                    type="text"
                    id="holidayName"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="holidayDate">Date</label>
                  <input
                    type="date"
                    id="holidayDate"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Background Colors</label>
                <div className="color-inputs">
                  {holidayForm.backgroundColors.map((color, index) => (
                    <input
                      key={index}
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...holidayForm.backgroundColors];
                        newColors[index] = e.target.value;
                        setHolidayForm(prev => ({ ...prev, backgroundColors: newColors }));
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Animations</label>
                <div className="animation-selector">
                  {availableAnimations.map(animation => (
                    <label key={animation.id} className="animation-option">
                      <input
                        type="checkbox"
                        checked={holidayForm.animations.includes(animation.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHolidayForm(prev => ({ 
                              ...prev, 
                              animations: [...prev.animations, animation.id] 
                            }));
                          } else {
                            setHolidayForm(prev => ({ 
                              ...prev, 
                              animations: prev.animations.filter(a => a !== animation.id) 
                            }));
                          }
                        }}
                      />
                      <span className="animation-name">{animation.name}</span>
                      <span className="animation-desc">{animation.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="holidayDescription">Description</label>
                <textarea
                  id="holidayDescription"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={holidayForm.isActive}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
                </button>
                <button type="button" className="cancel-btn" onClick={resetHolidayForm}>
                  Cancel
                </button>
              </div>
            </form>

            <div className="holidays-list">
              <h4>Current Holidays</h4>
              <div className="holidays-grid">
                {holidays.map(holiday => (
                  <div key={holiday.id} className={`holiday-card ${holiday.isActive ? 'active' : 'inactive'}`}>
                    <div className="holiday-preview" style={{
                      background: `linear-gradient(135deg, ${holiday.backgroundColors.join(', ')})`
                    }}>
                      <span className="holiday-date">{holiday.date}</span>
                    </div>
                    <div className="holiday-info">
                      <h5>{holiday.name}</h5>
                      <p>{holiday.description}</p>
                      <div className="holiday-actions">
                        <button 
                          className={`status-btn ${holiday.isActive ? 'active' : 'inactive'}`}
                          onClick={() => toggleHolidayStatus(holiday.id)}
                        >
                          {holiday.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button 
                          className="edit-btn"
                          onClick={() => editHoliday(holiday)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="preview-section">
            <h3>Theme Preview</h3>
            <p>Preview how the themes will look on the welcome widget</p>
            
            <div className="preview-container">
              <div className="preview-widget">
                <div className="preview-header">
                  <h4>Welcome Widget Preview</h4>
                </div>
                <div className="preview-content">
                  <div className="preview-greeting">
                    <h2>Good Morning, Alexander!</h2>
                    <p>Start your day with our morning specials</p>
                  </div>
                  <div className="preview-time">
                    <div className="time-display">09:13 AM</div>
                    <div className="date-display">Monday, September 22</div>
                  </div>
                </div>
              </div>
              
              <div className="preview-controls">
                <h4>Test Themes</h4>
                <div className="theme-buttons">
                  {themes.map(theme => (
                    <button 
                      key={theme.id}
                      className="preview-theme-btn"
                      style={{
                        background: `linear-gradient(135deg, ${theme.backgroundColors.join(', ')})`
                      }}
                      onClick={() => {
                        document.querySelector('.preview-widget').style.background = 
                          `linear-gradient(135deg, ${theme.backgroundColors.join(', ')})`;
                      }}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
                
                <h4>Test Holidays</h4>
                <div className="holiday-buttons">
                  {holidays.map(holiday => (
                    <button 
                      key={holiday.id}
                      className="preview-holiday-btn"
                      style={{
                        background: `linear-gradient(135deg, ${holiday.backgroundColors.join(', ')})`
                      }}
                      onClick={() => {
                        document.querySelector('.preview-widget').style.background = 
                          `linear-gradient(135deg, ${holiday.backgroundColors.join(', ')})`;
                      }}
                    >
                      {holiday.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeasonalManager;
