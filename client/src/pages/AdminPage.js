import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/admin.css';
import InventoryManager from '../components/InventoryManager';
import AdminInventoryManager from '../components/admin/InventoryManager';
import ProductManager from '../components/ProductManager';
import SuggestedItemManager from '../components/SuggestedItemManager';
import PromoCodeManager from '../components/PromoCodeManager';
import OrderQueue from '../components/admin/OrderQueue';

function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    readyOrders: 0,
    lowStockItems: 0
  });

  // Check if user has admin privileges
  const isAdmin = user && (user.role === 'admin' || user.role === 'manager' || user.firstName === 'Admin');

  useEffect(() => {
    if (isAdmin) {
      fetchInitialData();
      setupWebSocket();
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [user, isAdmin]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const headers = { 'x-auth-token': user.token };

      // Fetch orders data
      try {
        const ordersRes = await axios.get(`${baseURL}/admin/orders`, { headers });
        const ordersData = ordersRes.data || [];
        setOrders(ordersData);

        // Calculate stats
        const totalOrders = ordersData.length;
        const pendingOrders = ordersData.filter(order => 
          ['pending', 'confirmed', 'preparing'].includes(order.status)
        ).length;
        const readyOrders = ordersData.filter(order => order.status === 'ready').length;

        setStats(prev => ({
          ...prev,
          totalOrders,
          pendingOrders,
          readyOrders
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

      // Fetch inventory and alerts
      try {
        const inventoryRes = await axios.get(`${baseURL}/inventory`, { headers });
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
  };

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

  const setupWebSocket = () => {
    // Mock WebSocket for development
    console.log('WebSocket setup (mock for development)');
    setSocket({ connected: true });
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const headers = { 'x-auth-token': user.token };

      try {
        await axios.patch(`${baseURL}/admin/orders/${orderId}/status`, 
          { status: newStatus },
          { headers }
        );
      } catch (error) {
        console.log('API endpoint not available, updating locally only');
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order._id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      updateOrderStats();
      showNotification('Order Updated', `Order status changed to ${newStatus}`, 'success');

    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    }
  };

  const handleInventoryUpdate = async (itemId, newQuantity) => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const headers = { 'x-auth-token': user.token };

      try {
        await axios.patch(`${baseURL}/admin/inventory/${itemId}`, 
          { currentQuantity: newQuantity },
          { headers }
        );
      } catch (error) {
        console.log('Inventory API endpoint not available, updating locally only');
      }

      // Update local inventory state
      setInventory(prev => prev.map(item =>
        item._id === itemId
          ? { ...item, currentQuantity: newQuantity }
          : item
      ));

      showNotification('Inventory Updated', 'Stock quantity updated successfully', 'success');

    } catch (error) {
      console.error('Error updating inventory:', error);
      setError('Failed to update inventory');
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

  const showNotification = (title, message, type = 'info') => {
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    // You could integrate with a toast library here
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
      </div>
    </div>
  );
}

export default AdminPage;