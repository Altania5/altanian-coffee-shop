import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AccountManager.css';

function AccountManager({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    birthday: user?.birthday || '',
    phone: user?.phone || ''
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Order summary
  const [orderSummary, setOrderSummary] = useState({
    activeOrders: [],
    pastOrders: [],
    counts: { active: 0, past: 0, total: 0 }
  });
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const pendingOrders = orderSummary.activeOrders;
  const pastOrders = orderSummary.pastOrders;

  const activeOrderStatuses = ['pending', 'confirmed', 'preparing', 'ready'];

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setOrderHistoryLoading(true);
      const [profileRes, favoritesRes, ordersRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/users/favorites'),
        api.get('/orders/user/summary')
      ]);

      if (profileRes.data?.user) {
        const profile = profileRes.data.user;
        setProfileData({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          birthday: profile.birthday || '',
          phone: profile.phone || ''
        });
        if (onUserUpdate) {
          onUserUpdate({ ...user, ...profile });
        }
      }

      setFavorites(favoritesRes.data?.favorites || []);
      const summary = ordersRes.data || {};
      setOrderSummary({
        activeOrders: summary.activeOrders || [],
        pastOrders: summary.pastOrders || [],
        counts: summary.counts || { active: 0, past: 0, total: 0 }
      });

      const productsRes = await api.get('/products');
      setAvailableProducts(productsRes.data?.products || []);

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
      setOrderHistoryLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        phone: profileData.phone?.trim() || ''
      };

      const response = await api.put('/users/profile', payload);
      if (response.data.success && response.data.user) {
        const updated = response.data.user;
        setProfileData(prev => ({
          ...prev,
          firstName: updated.firstName || prev.firstName,
          lastName: updated.lastName || prev.lastName,
          phone: updated.phone || ''
        }));
        if (onUserUpdate) {
          onUserUpdate({ ...user, ...updated });
        }
        setSuccess('Profile updated successfully!');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async (productId, customizations = {}) => {
    try {
      const response = await api.post('/users/favorites', {
        productId,
        customizations
      });
      
      if (response.data.success) {
        setSuccess('Added to favorites!');
        loadUserData(); // Reload favorites
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add favorite');
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      const response = await api.delete(`/users/favorites/${favoriteId}`);
      
      if (response.data.success) {
        setSuccess('Removed from favorites!');
        loadUserData(); // Reload favorites
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove favorite');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProductAvailability = (product) => {
    if (!product.isActive) return 'unavailable';
    if (product.outOfStock) return 'out-of-stock';
    return 'available';
  };

  const getAvailabilityText = (status) => {
    switch (status) {
      case 'unavailable': return 'Product removed';
      case 'out-of-stock': return 'Temporarily unavailable';
      default: return 'Available';
    }
  };

  const formatOrderStatus = (status) => {
    const labels = {
      pending: 'Order Received',
      confirmed: 'Confirmed',
      preparing: 'Being Prepared',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const summarizeOrderItems = (order) => {
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return 'No items';
    }
    return order.items
      .map(item => `${item.quantity}x ${item.productName || item.product?.name || 'Item'}`)
      .join(', ');
  };

  return (
    <div className="account-manager">
      <div className="account-header">
        <h1>Account Manager</h1>
        <p>Manage your account settings, preferences, and information</p>
      </div>

      {/* Navigation Tabs */}
      <div className="account-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">👤</span>
          Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <span className="tab-icon">🔒</span>
          Security
        </button>
        <button 
          className={`tab-button ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          <span className="tab-icon">💳</span>
          Payment
        </button>
        <button 
          className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <span className="tab-icon">❤️</span>
          Favorites
        </button>
        <button 
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="tab-icon">📋</span>
          Order History
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="status-message error">
          <span className="status-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {success && (
        <div className="status-message success">
          <span className="status-icon">✅</span>
          {success}
        </div>
      )}

      {/* Tab Content */}
      <div className="account-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="tab-section">
            <h2>Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  autoComplete="given-name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  autoComplete="family-name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={profileData.email}
                  readOnly
                  aria-readonly="true"
                  className="readonly-input"
                />
                <small>Email address cannot be changed. Contact support if you need assistance.</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
              
              <div className="form-group readonly">
                <label htmlFor="birthday">Birthday</label>
                <input
                  type="text"
                  id="birthday"
                  value={formatDate(profileData.birthday)}
                  readOnly
                  className="readonly-input"
                />
                <small>Birthday cannot be changed for security reasons</small>
              </div>
              
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-section">
            <h2>Change Password</h2>
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  required
                  minLength="6"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="tab-section">
            <h2>Payment Methods</h2>
            <div className="payment-methods">
              {paymentMethods.length === 0 ? (
                <div className="no-payment-methods">
                  <span className="no-payment-icon">💳</span>
                  <p>No payment methods saved</p>
                  <button 
                    className="add-payment-btn"
                    onClick={() => setShowAddPayment(true)}
                  >
                    Add Payment Method
                  </button>
                </div>
              ) : (
                <div className="payment-methods-list">
                  {paymentMethods.map((method, index) => (
                    <div key={index} className="payment-method-card">
                      <div className="payment-method-info">
                        <span className="payment-icon">💳</span>
                        <div className="payment-details">
                          <span className="payment-type">{method.type}</span>
                          <span className="payment-number">**** **** **** {method.last4}</span>
                        </div>
                      </div>
                      <button className="remove-payment-btn">Remove</button>
                    </div>
                  ))}
                  <button 
                    className="add-payment-btn secondary"
                    onClick={() => setShowAddPayment(true)}
                  >
                    Add Another Payment Method
                  </button>
                </div>
              )}
            </div>
            
            {showAddPayment && (
              <div className="add-payment-modal">
                <h3>Add Payment Method</h3>
                <p>Payment method management will be integrated with Stripe in a future update.</p>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowAddPayment(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="tab-section">
            <h2>Favorite Drinks</h2>
            <div className="favorites-section">
              <div className="favorites-list">
                {favorites.length === 0 ? (
                  <div className="no-favorites">
                    <span className="no-favorites-icon">❤️</span>
                    <p>No favorite drinks yet</p>
                    <p className="no-favorites-subtitle">Add drinks to your favorites from the Order page</p>
                  </div>
                ) : (
                  <div className="favorites-grid">
                    {favorites.map((favorite) => {
                      const product = availableProducts.find(p => p._id === favorite.productId);
                      const availability = product ? getProductAvailability(product) : 'unavailable';
                      
                      return (
                        <div key={favorite._id} className={`favorite-card ${availability}`}>
                          <div className="favorite-info">
                            <h4>{product?.name || 'Unknown Product'}</h4>
                            <p className="favorite-customizations">
                              {favorite.customizations && Object.keys(favorite.customizations).length > 0
                                ? Object.entries(favorite.customizations)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ')
                                : 'Default'
                              }
                            </p>
                            <span className={`availability-badge ${availability}`}>
                              {getAvailabilityText(availability)}
                            </span>
                          </div>
                          <div className="favorite-actions">
                            <button 
                              className="order-favorite-btn"
                              disabled={availability !== 'available'}
                            >
                              Order Now
                            </button>
                            <button 
                              className="remove-favorite-btn"
                              onClick={() => handleRemoveFavorite(favorite._id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order History Tab */}
        {activeTab === 'orders' && (
          <div className="tab-section">
            <h2>Order History</h2>
            <div className="order-history">
              {orderHistoryLoading ? (
                <div className="order-loading">Loading orders...</div>
              ) : (
                <>
                  <div className="orders-group">
                    <h3 className="orders-group-title">
                      Active Orders
                      <span className="badge">{orderSummary.counts.active}</span>
                    </h3>
                    {pendingOrders.length === 0 ? (
                      <div className="no-orders">
                        <span className="no-orders-icon">📡</span>
                        <p>No active orders right now</p>
                      </div>
                    ) : (
                      <div className="orders-list">
                        {pendingOrders.map((order) => (
                          <div key={order.id} className={`order-card ${order.status}`}>
                            <div className="order-header">
                              <span className="order-number">Order #{order.orderNumber}</span>
                              <span className={`order-status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                            </div>
                            <div className="order-details">
                              <div className="order-items">
                                {summarizeOrderItems(order)
                                  .split(', ')
                                  .map((item, index) => (
                                    <span key={index} className="order-item">{item}</span>
                                  ))}
                              </div>
                              <div className="order-total">
                                Total: ${Number(order.totalAmount ?? order.total ?? 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="order-date">
                              Placed on {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="orders-group">
                    <h3 className="orders-group-title">
                      Past Orders
                      <span className="badge">{orderSummary.counts.past}</span>
                    </h3>
                    {pastOrders.length === 0 ? (
                      <div className="no-orders">
                        <span className="no-orders-icon">📋</span>
                        <p>No past orders yet</p>
                        <p className="no-orders-subtitle">Your completed order history will appear here</p>
                      </div>
                    ) : (
                      <div className="orders-list">
                        {pastOrders.map((order) => (
                          <div key={order.id} className={`order-card ${order.status}`}>
                            <div className="order-header">
                              <span className="order-number">Order #{order.orderNumber}</span>
                              <span className={`order-status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                            </div>
                            <div className="order-details">
                              <div className="order-items">
                                {summarizeOrderItems(order)
                                  .split(', ')
                                  .map((item, index) => (
                                    <span key={index} className="order-item">{item}</span>
                                  ))}
                              </div>
                              <div className="order-total">
                                Total: ${Number(order.totalAmount ?? order.total ?? 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="order-date">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountManager;
