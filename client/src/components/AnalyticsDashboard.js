import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AnalyticsDashboard.css';

function AnalyticsDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    sales: null,
    customers: null,
    inventory: null,
    realTime: null
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (user && user.role === 'owner') {
      loadAnalyticsData();
      
      // Set up real-time updates
      const interval = setInterval(loadAnalyticsData, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [overviewResponse, salesResponse, customersResponse, inventoryResponse] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/sales'),
        api.get('/analytics/customers'),
        api.get('/analytics/inventory')
      ]);

      setAnalyticsData({
        overview: overviewResponse.data,
        sales: salesResponse.data,
        customers: customersResponse.data,
        inventory: inventoryResponse.data,
        realTime: {
          timestamp: new Date(),
          activeUsers: Math.floor(Math.random() * 50) + 10, // Mock real-time data
          currentOrders: Math.floor(Math.random() * 20) + 5
        }
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="analytics-dashboard">
        <div className="access-denied">
          <span className="denied-icon">🔒</span>
          <h3>Access Denied</h3>
          <p>This dashboard is only available to owners.</p>
        </div>
      </div>
    );
  }

  if (loading && !analyticsData.overview) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-spinner"></div>
        <p>Loading analytics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h3>📊 Analytics Dashboard</h3>
        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            💰 Sales
          </button>
          <button 
            className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 Customers
          </button>
          <button 
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Inventory
          </button>
        </div>
        
        <div className="dashboard-actions">
          <button className="refresh-btn" onClick={loadAnalyticsData}>
            🔄 Refresh
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            data={analyticsData.overview}
            realTime={analyticsData.realTime}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            getPercentageChange={getPercentageChange}
          />
        )}

        {activeTab === 'sales' && (
          <SalesTab 
            data={analyticsData.sales}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            getPercentageChange={getPercentageChange}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab 
            data={analyticsData.customers}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            getPercentageChange={getPercentageChange}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab 
            data={analyticsData.inventory}
            formatNumber={formatNumber}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, realTime, formatCurrency, formatNumber, getPercentageChange }) {
  if (!data) return <div>No data available</div>;

  return (
    <div className="overview-tab">
      <div className="real-time-section">
        <h4>🔄 Real-Time Activity</h4>
        <div className="real-time-cards">
          <div className="real-time-card">
            <span className="card-icon">👥</span>
            <div className="card-content">
              <span className="card-value">{realTime.activeUsers}</span>
              <span className="card-label">Active Users</span>
            </div>
          </div>
          <div className="real-time-card">
            <span className="card-icon">📦</span>
            <div className="card-content">
              <span className="card-value">{realTime.currentOrders}</span>
              <span className="card-label">Current Orders</span>
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-section">
        <h4>📊 Key Performance Indicators</h4>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-icon">💰</span>
              <span className="kpi-title">Today's Revenue</span>
            </div>
            <div className="kpi-value">{formatCurrency(data.todayRevenue)}</div>
            <div className="kpi-change positive">
              +{getPercentageChange(data.todayRevenue, data.yesterdayRevenue).toFixed(1)}%
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-icon">📦</span>
              <span className="kpi-title">Orders Today</span>
            </div>
            <div className="kpi-value">{formatNumber(data.todayOrders)}</div>
            <div className="kpi-change positive">
              +{getPercentageChange(data.todayOrders, data.yesterdayOrders).toFixed(1)}%
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-icon">👥</span>
              <span className="kpi-title">New Customers</span>
            </div>
            <div className="kpi-value">{formatNumber(data.newCustomers)}</div>
            <div className="kpi-change positive">
              +{getPercentageChange(data.newCustomers, data.previousNewCustomers).toFixed(1)}%
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-icon">⭐</span>
              <span className="kpi-title">Avg Order Value</span>
            </div>
            <div className="kpi-value">{formatCurrency(data.avgOrderValue)}</div>
            <div className="kpi-change positive">
              +{getPercentageChange(data.avgOrderValue, data.previousAvgOrderValue).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h4>📈 Revenue Trend (Last 7 Days)</h4>
          <div className="chart-placeholder">
            <div className="chart-bars">
              {data.revenueTrend?.map((day, index) => (
                <div key={index} className="chart-bar">
                  <div 
                    className="bar-fill"
                    style={{ height: `${(day.revenue / Math.max(...data.revenueTrend.map(d => d.revenue))) * 100}%` }}
                  ></div>
                  <span className="bar-label">{day.day}</span>
                  <span className="bar-value">{formatCurrency(day.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h4>☕ Popular Drinks</h4>
          <div className="popular-drinks">
            {data.popularDrinks?.map((drink, index) => (
              <div key={index} className="drink-item">
                <span className="drink-rank">#{index + 1}</span>
                <span className="drink-name">{drink.name}</span>
                <span className="drink-count">{formatNumber(drink.count)} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sales Tab Component
function SalesTab({ data, formatCurrency, formatNumber, getPercentageChange }) {
  if (!data) return <div>No data available</div>;

  return (
    <div className="sales-tab">
      <div className="sales-summary">
        <h4>💰 Sales Summary</h4>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Revenue</span>
            <span className="summary-value">{formatCurrency(data.totalRevenue)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.totalRevenue, data.previousTotalRevenue).toFixed(1)}%
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Orders</span>
            <span className="summary-value">{formatNumber(data.totalOrders)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.totalOrders, data.previousTotalOrders).toFixed(1)}%
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Average Order Value</span>
            <span className="summary-value">{formatCurrency(data.avgOrderValue)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.avgOrderValue, data.previousAvgOrderValue).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="sales-breakdown">
        <h4>📊 Sales Breakdown</h4>
        <div className="breakdown-charts">
          <div className="chart-container">
            <h5>Revenue by Hour</h5>
            <div className="hourly-chart">
              {data.hourlyRevenue?.map((hour, index) => (
                <div key={index} className="hour-bar">
                  <div 
                    className="hour-fill"
                    style={{ height: `${(hour.revenue / Math.max(...data.hourlyRevenue.map(h => h.revenue))) * 100}%` }}
                  ></div>
                  <span className="hour-label">{hour.hour}:00</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-container">
            <h5>Payment Methods</h5>
            <div className="payment-methods">
              {data.paymentMethods?.map((method, index) => (
                <div key={index} className="payment-item">
                  <span className="payment-name">{method.name}</span>
                  <span className="payment-percentage">{method.percentage}%</span>
                  <span className="payment-amount">{formatCurrency(method.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customers Tab Component
function CustomersTab({ data, formatCurrency, formatNumber, getPercentageChange }) {
  if (!data) return <div>No data available</div>;

  return (
    <div className="customers-tab">
      <div className="customer-summary">
        <h4>👥 Customer Analytics</h4>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Customers</span>
            <span className="summary-value">{formatNumber(data.totalCustomers)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.totalCustomers, data.previousTotalCustomers).toFixed(1)}%
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">New Customers</span>
            <span className="summary-value">{formatNumber(data.newCustomers)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.newCustomers, data.previousNewCustomers).toFixed(1)}%
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Returning Customers</span>
            <span className="summary-value">{formatNumber(data.returningCustomers)}</span>
            <span className="summary-change positive">
              +{getPercentageChange(data.returningCustomers, data.previousReturningCustomers).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="customer-insights">
        <h4>📈 Customer Insights</h4>
        <div className="insights-grid">
          <div className="insight-card">
            <h5>Customer Segments</h5>
            <div className="segment-list">
              {data.customerSegments?.map((segment, index) => (
                <div key={index} className="segment-item">
                  <span className="segment-name">{segment.name}</span>
                  <span className="segment-count">{formatNumber(segment.count)}</span>
                  <span className="segment-percentage">{segment.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-card">
            <h5>Top Customers</h5>
            <div className="top-customers">
              {data.topCustomers?.map((customer, index) => (
                <div key={index} className="customer-item">
                  <span className="customer-rank">#{index + 1}</span>
                  <span className="customer-name">{customer.name}</span>
                  <span className="customer-orders">{customer.orders} orders</span>
                  <span className="customer-revenue">{formatCurrency(customer.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inventory Tab Component
function InventoryTab({ data, formatNumber }) {
  if (!data) return <div>No data available</div>;

  return (
    <div className="inventory-tab">
      <div className="inventory-summary">
        <h4>📦 Inventory Analytics</h4>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Items</span>
            <span className="summary-value">{formatNumber(data.totalItems)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Low Stock Items</span>
            <span className="summary-value">{formatNumber(data.lowStockItems)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Out of Stock</span>
            <span className="summary-value">{formatNumber(data.outOfStockItems)}</span>
          </div>
        </div>
      </div>

      <div className="inventory-details">
        <h4>📊 Inventory Details</h4>
        <div className="inventory-table">
          <div className="table-header">
            <span>Item</span>
            <span>Current Stock</span>
            <span>Min Level</span>
            <span>Status</span>
            <span>Usage Rate</span>
          </div>
          {data.inventoryItems?.map((item, index) => (
            <div key={index} className="table-row">
              <span className="item-name">{item.name}</span>
              <span className="current-stock">{formatNumber(item.currentStock)}</span>
              <span className="min-level">{formatNumber(item.minLevel)}</span>
              <span className={`status ${item.status}`}>{item.status}</span>
              <span className="usage-rate">{item.usageRate}/day</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
