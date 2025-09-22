import React, { useState, useEffect } from 'react';
import dynamicPricingService from '../services/DynamicPricingService';
import api from '../utils/api';
import './DynamicPricing.css';

function DynamicPricingAdmin() {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadData();
    
    // Update pricing every 5 minutes
    const interval = setInterval(loadPricingInfo, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load products and inventory data
      const [productsResponse, inventoryResponse] = await Promise.all([
        api.get('/products'),
        api.get('/inventory')
      ]);
      
      setProducts(productsResponse.data || []);
      setInventoryData(inventoryResponse.data || []);
      
      // Load pricing info
      await loadPricingInfo();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricingInfo = async () => {
    try {
      // Update weather data
      await dynamicPricingService.updateWeatherData();
      
      // Calculate pricing for all products
      const pricingData = products.map(product => {
        // Set base price if not already set
        if (!dynamicPricingService.getBasePrice(product._id)) {
          dynamicPricingService.setBasePrice(product._id, product.price);
        }
        
        const pricing = dynamicPricingService.calculateDynamicPrice(product._id, inventoryData);
        const explanation = dynamicPricingService.getPricingExplanation(product._id, inventoryData);
        
        return {
          product,
          pricing,
          explanation
        };
      });
      
      setPricingInfo({
        pricingData,
        currentInfo: dynamicPricingService.getCurrentPricingInfo()
      });
    } catch (error) {
      console.error('Failed to load pricing info:', error);
    }
  };

  const getPriceChangeIcon = (change) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➡️';
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return '#dc3545';
    if (change < 0) return '#28a745';
    return '#6c757d';
  };

  if (loading) {
    return (
      <div className="dynamic-pricing-admin">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dynamic pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dynamic-pricing-admin">
      <div className="pricing-header">
        <h2>💰 Dynamic Pricing Management</h2>
        <p>Real-time pricing adjustments based on demand, time, and inventory levels</p>
      </div>

      {/* Current Pricing Factors */}
      {pricingInfo?.currentInfo && (
        <div className="pricing-factors">
          <h3>Current Pricing Factors</h3>
          <div className="factors-grid">
            <div className="factor-card">
              <span className="factor-icon">🌡️</span>
              <div className="factor-info">
                <span className="factor-label">Weather</span>
                <span className="factor-value">{pricingInfo.currentInfo.weather?.condition || 'Clear'}</span>
              </div>
            </div>
            <div className="factor-card">
              <span className="factor-icon">⏰</span>
              <div className="factor-info">
                <span className="factor-label">Time of Day</span>
                <span className="factor-value">{pricingInfo.currentInfo.timeOfDay || 'Afternoon'}</span>
              </div>
            </div>
            <div className="factor-card">
              <span className="factor-icon">📊</span>
              <div className="factor-info">
                <span className="factor-label">Demand Level</span>
                <span className="factor-value">{pricingInfo.currentInfo.demandLevel || 'Normal'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Pricing Table */}
      <div className="pricing-table-container">
        <h3>Product Pricing Overview</h3>
        <div className="pricing-table">
          <div className="table-header">
            <div className="col-product">Product</div>
            <div className="col-base">Base Price</div>
            <div className="col-current">Current Price</div>
            <div className="col-change">Change</div>
            <div className="col-factors">Factors</div>
          </div>
          
          {pricingInfo?.pricingData?.map((item, index) => {
            const change = item.pricing.currentPrice - item.product.price;
            const changePercent = ((change / item.product.price) * 100).toFixed(1);
            
            return (
              <div key={index} className="table-row">
                <div className="col-product">
                  <span className="product-name">{item.product.name}</span>
                </div>
                <div className="col-base">
                  <span className="base-price">${item.product.price.toFixed(2)}</span>
                </div>
                <div className="col-current">
                  <span className="current-price">${item.pricing.currentPrice.toFixed(2)}</span>
                </div>
                <div className="col-change">
                  <span 
                    className="price-change"
                    style={{ color: getPriceChangeColor(change) }}
                  >
                    {getPriceChangeIcon(change)} {changePercent}%
                  </span>
                </div>
                <div className="col-factors">
                  <div className="factors-list">
                    {item.explanation.factors.map((factor, idx) => (
                      <span key={idx} className="factor-tag">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Explanation */}
      <div className="pricing-explanation">
        <h3>How Dynamic Pricing Works</h3>
        <div className="explanation-content">
          <div className="explanation-section">
            <h4>🌡️ Weather Impact</h4>
            <p>Cold weather increases demand for hot beverages, while hot weather increases demand for cold drinks.</p>
          </div>
          <div className="explanation-section">
            <h4>⏰ Time-Based Pricing</h4>
            <p>Peak hours (7-9 AM, 12-2 PM) see higher prices due to increased demand.</p>
          </div>
          <div className="explanation-section">
            <h4>📦 Inventory Levels</h4>
            <p>Low stock items may see price increases to manage demand and encourage alternatives.</p>
          </div>
          <div className="explanation-section">
            <h4>📊 Demand Patterns</h4>
            <p>Historical data helps predict demand spikes and adjust pricing accordingly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicPricingAdmin;
