import React, { useState, useEffect, useCallback } from 'react';
import dynamicPricingService from '../services/DynamicPricingService';
import './DynamicPricing.css';

function DynamicPricing({ product, inventoryData, showExplanation = false }) {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const loadPricingInfo = useCallback(async () => {
    try {
      setLoading(true);
      
      // Update weather data
      await dynamicPricingService.updateWeatherData();
      
      // Set base price if not already set
      if (!dynamicPricingService.getBasePrice(product._id)) {
        dynamicPricingService.setBasePrice(product._id, product.price);
      }
      
      // Calculate dynamic pricing
      const pricing = dynamicPricingService.calculateDynamicPrice(product._id, inventoryData);
      const explanation = dynamicPricingService.getPricingExplanation(product._id, inventoryData);
      
      setPricingInfo({
        pricing,
        explanation,
        currentInfo: dynamicPricingService.getCurrentPricingInfo()
      });
    } catch (error) {
      console.error('Failed to load pricing info:', error);
    } finally {
      setLoading(false);
    }
  }, [product, inventoryData]);

  useEffect(() => {
    if (product) {
      loadPricingInfo();
    }
  }, [product, inventoryData, loadPricingInfo]);

  const getPriceChangeIcon = (change) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➡️';
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return '#DAA520';
    if (change < 0) return '#8FBC8F';
    return '#6B4226';
  };

  if (loading) {
    return (
      <div className="dynamic-pricing">
        <div className="loading-spinner"></div>
        <span>Calculating price...</span>
      </div>
    );
  }

  if (!pricingInfo) {
    return null;
  }

  const { pricing, explanation, currentInfo } = pricingInfo;

  return (
    <div className="dynamic-pricing">
      <div className="pricing-display">
        <div className="current-price">
          <span className="price-label">Current Price</span>
          <span className="price-value">${pricing.finalPrice.toFixed(2)}</span>
        </div>
        
        {pricing.priceChange !== 0 && (
          <div 
            className="price-change"
            style={{ color: getPriceChangeColor(pricing.priceChange) }}
          >
            <span className="change-icon">{getPriceChangeIcon(pricing.priceChange)}</span>
            <span className="change-text">
              {pricing.priceChange > 0 ? '+' : ''}${pricing.priceChange.toFixed(2)}
              ({pricing.priceChangePercent > 0 ? '+' : ''}{pricing.priceChangePercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {showExplanation && (
        <div className="pricing-explanation">
          <button 
            className="explanation-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span className="toggle-icon">{showDetails ? '▼' : '▶'}</span>
            <span>Why this price?</span>
          </button>
          
          {showDetails && (
            <div className="explanation-details">
              <div className="base-price-info">
                <span className="base-label">Base Price:</span>
                <span className="base-value">${pricing.basePrice.toFixed(2)}</span>
              </div>
              
              {explanation.factors.length > 0 && (
                <div className="pricing-factors">
                  <h4>Price Factors:</h4>
                  <div className="factors-list">
                    {explanation.factors.map((factor, index) => (
                      <div key={index} className="factor-item">
                        <span 
                          className="factor-impact"
                          style={{ color: factor.color }}
                        >
                          {factor.impact}
                        </span>
                        <span className="factor-description">{factor.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="current-conditions">
                <h4>Current Conditions:</h4>
                <div className="conditions-grid">
                  <div className="condition-item">
                    <span className="condition-label">Time:</span>
                    <span className="condition-value">
                      {currentInfo.currentTime.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="condition-item">
                    <span className="condition-label">Day:</span>
                    <span className="condition-value">
                      {currentInfo.currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                  </div>
                  {currentInfo.weatherData && (
                    <div className="condition-item">
                      <span className="condition-label">Weather:</span>
                      <span className="condition-value">
                        {Math.round(currentInfo.weatherData.temperature)}°C, {currentInfo.weatherData.condition}
                      </span>
                    </div>
                  )}
                  {inventoryData && (
                    <div className="condition-item">
                      <span className="condition-label">Stock:</span>
                      <span className="condition-value">
                        {inventoryData.stockLevel} units
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pricing Trends Component
export function PricingTrends({ productId, hours = 24 }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, [productId, hours]);

  const loadTrends = () => {
    try {
      setLoading(true);
      const pricingTrends = dynamicPricingService.getPricingTrends(productId, hours);
      setTrends(pricingTrends);
    } catch (error) {
      console.error('Failed to load pricing trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pricing-trends">
        <div className="loading-spinner"></div>
        <span>Loading trends...</span>
      </div>
    );
  }

  const maxPrice = Math.max(...trends.map(t => t.price));
  const minPrice = Math.min(...trends.map(t => t.price));

  return (
    <div className="pricing-trends">
      <h4>Price Trends (Last {hours} Hours)</h4>
      <div className="trends-chart">
        <div className="chart-bars">
          {trends.map((trend, index) => (
            <div key={index} className="trend-bar">
              <div 
                className="bar-fill"
                style={{ 
                  height: `${((trend.price - minPrice) / (maxPrice - minPrice)) * 100}%`,
                  backgroundColor: trend.multiplier > 1 ? '#DAA520' : '#8FBC8F'
                }}
              ></div>
              <span className="bar-label">{trend.hour}:00</span>
              <span className="bar-value">${trend.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="trends-summary">
        <div className="summary-item">
          <span className="summary-label">Highest:</span>
          <span className="summary-value">${maxPrice.toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Lowest:</span>
          <span className="summary-value">${minPrice.toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average:</span>
          <span className="summary-value">
            ${(trends.reduce((sum, t) => sum + t.price, 0) / trends.length).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Pricing Admin Component (for owners)
export function PricingAdmin({ user }) {
  const [demandFactors, setDemandFactors] = useState({
    timeOfDay: 1.0,
    dayOfWeek: 1.0,
    weather: 1.0,
    inventory: 1.0,
    events: 1.0
  });
  const [currentInfo, setCurrentInfo] = useState(null);

  useEffect(() => {
    if (user && user.role === 'owner') {
      loadCurrentInfo();
    }
  }, [user]);

  const loadCurrentInfo = async () => {
    try {
      await dynamicPricingService.updateWeatherData();
      const info = dynamicPricingService.getCurrentPricingInfo();
      setCurrentInfo(info);
      setDemandFactors(info.demandFactors);
    } catch (error) {
      console.error('Failed to load pricing info:', error);
    }
  };

  const updateDemandFactor = (factor, value) => {
    const newFactors = { ...demandFactors, [factor]: value };
    setDemandFactors(newFactors);
    dynamicPricingService.updateDemandFactor(factor, value);
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="pricing-admin">
        <div className="access-denied">
          <span className="denied-icon">🔒</span>
          <p>Access denied. Owner privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-admin">
      <h3>🎯 Dynamic Pricing Control</h3>
      
      <div className="demand-factors">
        <h4>Demand Factors</h4>
        <div className="factors-grid">
          {Object.entries(demandFactors).map(([factor, value]) => (
            <div key={factor} className="factor-control">
              <label htmlFor={factor}>{factor.replace(/([A-Z])/g, ' $1').toLowerCase()}</label>
              <input
                id={factor}
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={value}
                onChange={(e) => updateDemandFactor(factor, parseFloat(e.target.value))}
              />
              <span className="factor-value">{value.toFixed(1)}x</span>
            </div>
          ))}
        </div>
      </div>

      {currentInfo && (
        <div className="current-conditions">
          <h4>Current Conditions</h4>
          <div className="conditions-info">
            <div className="condition-item">
              <span className="condition-label">Time:</span>
              <span className="condition-value">
                {currentInfo.currentTime.toLocaleString()}
              </span>
            </div>
            {currentInfo.weatherData && (
              <div className="condition-item">
                <span className="condition-label">Weather:</span>
                <span className="condition-value">
                  {Math.round(currentInfo.weatherData.temperature)}°C, {currentInfo.weatherData.condition}
                </span>
              </div>
            )}
            <div className="condition-item">
              <span className="condition-label">Active Rules:</span>
              <span className="condition-value">
                {currentInfo.activeRules.length} rules applied
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicPricing;
