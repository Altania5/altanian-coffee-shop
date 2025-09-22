import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import '../styles/admin.css';
// import InventoryManager from '../components/InventoryManager';
import AdminInventoryManager from '../components/admin/InventoryManager';
import ProductManager from '../components/ProductManager';
import SuggestedItemManager from '../components/SuggestedItemManager';
import PromoCodeManager from '../components/PromoCodeManager';
import OrderQueue from '../components/admin/OrderQueue';
import LoyaltyManager from '../components/admin/LoyaltyManager';
import AITrainingDashboard from '../components/AITrainingDashboard';
import AIModelManagement from '../components/AIModelManagement';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import DynamicPricing from '../components/DynamicPricing';
import DynamicPricingAdmin from '../components/DynamicPricingAdmin';
import CoffeeArtGallery from '../components/CoffeeArtGallery';
import SocialFeatures from '../components/SocialFeatures';
import HealthInsights from '../components/HealthInsights';

function AdminPage({ user }) {
  const { addNotification, socket } = useSocket();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    readyOrders: 0,
    lowStockItems: 0
  });

  // Check if user has admin privileges - only 'owner' role has admin access
  const isAdmin = user && user.role === 'owner';
  
  // Debug logging to help troubleshoot access issues (only log once)
  useEffect(() => {
    if (user) {
      console.log('AdminPage - User role:', user.role, 'Is admin?', isAdmin);
    }
  }, [user, isAdmin]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch dashboard data first
      try {
        const dashboardRes = await api.get('/orders/admin/dashboard');
        const dashboardData = dashboardRes.data.dashboard;
        
        // Set stats from dashboard data
        setStats(prev => ({
          ...prev,
          totalOrders: dashboardData.todaysOrders.total,
          pendingOrders: dashboardData.todaysOrders.byStatus.pending + 
                       dashboardData.todaysOrders.byStatus.confirmed + 
                       dashboardData.todaysOrders.byStatus.preparing,
          readyOrders: dashboardData.todaysOrders.byStatus.ready,
          lowStockItems: dashboardData.lowStockItems.length
        }));
        
        // Set active orders from dashboard
        setOrders(dashboardData.activeOrders || []);
        
      } catch (dashboardError) {
        console.log('Dashboard endpoint not available, trying orders endpoint');
        
        // Fallback to regular orders endpoint
        try {
          const ordersRes = await api.get('/orders');
          const ordersData = ordersRes.data.orders || [];
          setOrders(ordersData);
          
          // Calculate stats from orders data
          const totalOrders = ordersData.length;
          const pendingOrders = ordersData.filter(order => 
            ['pending', 'confirmed', 'preparing'].includes(order.status)
          ).length;
          const readyOrders = ordersData.filter(order => order.status === 'ready').length;
          
          setStats(prev => ({
            ...prev,
            totalOrders,
            pendingOrders,
            readyOrders,
            lowStockItems: 0 // We don't have this data from regular orders endpoint
          }));
          
        } catch (ordersError) {
          console.log('Orders endpoint not available, using mock data');
          // Use mock data for development
          const mockOrders = generateMockOrders();
          setOrders(mockOrders);
          setStats({
            totalOrders: mockOrders.length,
            pendingOrders: mockOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
            readyOrders: mockOrders.filter(o => o.status === 'ready').length,
            lowStockItems: 2
          });
        }
      }

      // Fetch inventory and alerts
      try {
        const inventoryRes = await api.get('/inventory');
        setInventory(inventoryRes.data || []);
      } catch (invError) {
        console.log('Using existing inventory data');
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError(error.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateMockOrders = () => {
    return [
      {
        _id: '1',
        orderNumber: '001',
        status: 'pending',
        customer: { name: 'John Doe', email: 'john@example.com' },
        items: [
          { name: 'Large Cappuccino', quantity: 1, price: 5.50 },
          { name: 'Blueberry Muffin', quantity: 1, price: 3.25 }
        ],
        total: 8.75,
        createdAt: new Date().toISOString(),
        estimatedReadyTime: new Date(Date.now() + 15 * 60000).toISOString()
      },
      {
        _id: '2',
        orderNumber: '002',
        status: 'preparing',
        customer: { name: 'Jane Smith', email: 'jane@example.com' },
        items: [
          { name: 'Medium Latte', quantity: 2, price: 4.75 }
        ],
        total: 9.50,
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        estimatedReadyTime: new Date(Date.now() + 10 * 60000).toISOString()
      },
      {
        _id: '3',
        orderNumber: '003',
        status: 'ready',
        customer: { name: 'Bob Johnson', email: 'bob@example.com' },
        items: [
          { name: 'Small Americano', quantity: 1, price: 3.50 }
        ],
        total: 3.50,
        createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
        estimatedReadyTime: new Date(Date.now() - 5 * 60000).toISOString()
      }
    ];
  };

  const showNotification = useCallback((title, message, type = 'info') => {
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    addNotification({
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date()
    });
  }, [addNotification]);

  // Setup WebSocket event listeners when socket is available
  useEffect(() => {
    if (!socket) return;

    socket.on('low-stock-alert', (data) => {
      console.log('🚨 Received low stock alert:', data);
      setLowStockAlerts(prev => [data, ...prev.slice(0, 9)]);
      showNotification('Low Stock Alert', data.message, 'warning');
    });

    return () => {
      socket.off('low-stock-alert');
    };
  }, [socket, showNotification]);

  useEffect(() => {
    if (isAdmin) {
      fetchInitialData();
    }
  }, [user, isAdmin, fetchInitialData]);

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      // Find the order to get user info
      const order = orders.find(o => o._id === orderId);
      const oldStatus = order ? order.status : 'unknown';

      try {
        await api.put(`/orders/${orderId}/status`, { status: newStatus });
      } catch (error) {
        console.log('API endpoint not available, updating locally only');
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order._id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      // Emit WebSocket notification to customer
      if (socket && socket.connected && order && order.user) {
        socket.emit('order-status-update', {
          orderId: orderId,
          userId: order.user,
          status: newStatus,
          oldStatus: oldStatus
        });
      }

      updateOrderStats();
      showNotification('Order Updated', `Order status changed to ${newStatus}`, 'success');

    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    }
  };

  const handleInventoryUpdate = async (itemId, newQuantity) => {
    try {
      // Find the current item to preserve all its properties
      const currentItem = inventory.find(item => item._id === itemId);
      if (!currentItem) {
        console.error('Item not found in inventory:', itemId);
        return;
      }

      console.log('🔄 Updating inventory item:', {
        itemId,
        itemName: currentItem.itemName,
        currentQuantity: currentItem.quantityInStock,
        newQuantity
      });

      // Create updated item with all original properties plus new quantity
      const updatedItem = {
        ...currentItem,
        quantityInStock: newQuantity,
        currentQuantity: newQuantity
      };

      try {
        await api.patch(`/inventory/${itemId}`, { currentQuantity: newQuantity });
      } catch (error) {
        console.log('⚠️ Inventory API endpoint not available, updating locally only:', error.message);
      }

      // Update local inventory state
      setInventory(prev => prev.map(item =>
        item._id === itemId ? updatedItem : item
      ));

      showNotification('Inventory Updated', 'Stock quantity updated successfully', 'success');

    } catch (error) {
      console.error('❌ Error updating inventory:', error);
      showNotification('Error', `Failed to update inventory for ${itemId}`, 'error');
    }
  };

  const updateOrderStats = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      ['pending', 'confirmed', 'preparing'].includes(order.status)
    ).length;
    const readyOrders = orders.filter(order => order.status === 'ready').length;

    setStats(prev => ({
      ...prev,
      totalOrders,
      pendingOrders,
      readyOrders
    }));
  };


  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="access-denied">
          <div className="error-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p>Welcome, {user.firstName}. Manage your coffee shop operations.</p>
        <div className="connection-status">
          <span className={`status-indicator ${socket ? 'connected' : 'disconnected'}`}>
            {socket ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pendingOrders}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.readyOrders}</div>
            <div className="stat-label">Ready</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.lowStockItems}</div>
            <div className="stat-label">Low Stock</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="tab-icon">📋</span>
          Order Queue
        </button>
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="tab-icon">📦</span>
          Inventory
        </button>
        <button 
          className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <span className="tab-icon">☕</span>
          Products
        </button>
        <button 
          className={`tab-button ${activeTab === 'promos' ? 'active' : ''}`}
          onClick={() => setActiveTab('promos')}
        >
          <span className="tab-icon">🎟️</span>
          Promos
        </button>
        <button 
          className={`tab-button ${activeTab === 'loyalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('loyalty')}
        >
          <span className="tab-icon">🎯</span>
          Loyalty
        </button>
        <button 
          className={`tab-button ${activeTab === 'ai-training' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-training')}
        >
          <span className="tab-icon">🤖</span>
          AI Training
        </button>
        <button 
          className={`tab-button ${activeTab === 'ai-models' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-models')}
        >
          <span className="tab-icon">🧠</span>
          AI Models
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="tab-icon">📊</span>
          Analytics
        </button>
        <button 
          className={`tab-button ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          <span className="tab-icon">💰</span>
          Dynamic Pricing
        </button>
        <button 
          className={`tab-button ${activeTab === 'art-gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('art-gallery')}
        >
          <span className="tab-icon">🎨</span>
          Art Gallery
        </button>
        <button 
          className={`tab-button ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          <span className="tab-icon">👥</span>
          Social Features
        </button>
        <button 
          className={`tab-button ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          <span className="tab-icon">💚</span>
          Health Insights
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'orders' && (
          <OrderQueue 
            orders={orders}
            onStatusUpdate={handleOrderStatusUpdate}
            socket={socket}
            loading={loading}
            error={error}
          />
        )}
        {activeTab === 'inventory' && (
          <AdminInventoryManager 
            inventory={inventory}
            lowStockAlerts={lowStockAlerts}
            onInventoryUpdate={handleInventoryUpdate}
            socket={socket}
          />
        )}
        {activeTab === 'products' && (
          <div className="products-section">
            <ProductManager token={user.token} />
            <hr />
            <SuggestedItemManager token={user.token} />
          </div>
        )}
        {activeTab === 'promos' && (
          <PromoCodeManager token={user.token} />
        )}
        {activeTab === 'loyalty' && (
          <LoyaltyManager token={user.token} />
        )}
        {activeTab === 'ai-training' && (
          <AITrainingDashboard />
        )}
        {activeTab === 'ai-models' && (
          <AIModelManagement />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard user={user} />
        )}
        {activeTab === 'pricing' && (
          <DynamicPricingAdmin />
        )}
        {activeTab === 'art-gallery' && (
          <CoffeeArtGallery />
        )}
        {activeTab === 'social' && (
          <SocialFeatures user={user} />
        )}
        {activeTab === 'health' && (
          <HealthInsights user={user} />
        )}
      </div>
    </div>
  );
}

export default AdminPage;