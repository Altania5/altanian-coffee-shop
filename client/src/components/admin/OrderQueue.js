import React, { useState, useEffect } from 'react';

function OrderQueue({ orders, onStatusUpdate, socket, loading, error }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);

  const statusOptions = [
    { value: 'all', label: 'All Orders', icon: '📋' },
    { value: 'pending', label: 'Pending', icon: '🕐' },
    { value: 'confirmed', label: 'Confirmed', icon: '✅' },
    { value: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
    { value: 'ready', label: 'Ready', icon: '☕' },
    { value: 'completed', label: 'Completed', icon: '✨' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'ready-time', label: 'Ready Time' },
    { value: 'total', label: 'Order Total' }
  ];

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'ready-time':
          return new Date(a.estimatedReadyTime) - new Date(b.estimatedReadyTime);
        case 'total':
          return b.total - a.total;
        default: // newest
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      preparing: '#8b5cf6',
      ready: '#10b981',
      completed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getOrderPriority = (order) => {
    const createdTime = new Date(order.createdAt);
    const now = new Date();
    const minutesAgo = (now - createdTime) / (1000 * 60);
    
    if (minutesAgo > 30) return 'high';
    if (minutesAgo > 15) return 'medium';
    return 'normal';
  };

  const handleStatusChange = (orderId, newStatus) => {
    onStatusUpdate(orderId, newStatus);
    
    // Remove from expanded if status changed
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    }
  };

  const handleBulkStatusUpdate = (newStatus) => {
    selectedOrders.forEach(orderId => {
      onStatusUpdate(orderId, newStatus);
    });
    setSelectedOrders([]);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllVisible = () => {
    const visibleOrderIds = filteredOrders.map(order => order._id);
    setSelectedOrders(visibleOrderIds);
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  if (loading) {
    return (
      <div className="order-queue-loading">
        <div className="loading-spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-queue-error">
        <div className="error-icon">❌</div>
        <h3>Failed to Load Orders</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="order-queue">
      {/* Queue Header */}
      <div className="queue-header">
        <div className="header-title">
          <h2>Order Queue</h2>
          <span className="order-count">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="queue-controls">
          {/* Status Filter */}
          <div className="filter-group">
            <label>Filter:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <label>Sort:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-filter"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            <span>{selectedOrders.length} selected</span>
            <button onClick={clearSelection} className="clear-selection">
              Clear
            </button>
          </div>
          <div className="bulk-buttons">
            <button 
              onClick={() => handleBulkStatusUpdate('confirmed')}
              className="bulk-btn confirm-btn"
            >
              ✅ Confirm All
            </button>
            <button 
              onClick={() => handleBulkStatusUpdate('preparing')}
              className="bulk-btn preparing-btn"
            >
              👨‍🍳 Start Preparing
            </button>
            <button 
              onClick={() => handleBulkStatusUpdate('ready')}
              className="bulk-btn ready-btn"
            >
              ☕ Mark Ready
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="orders-container">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📭</div>
            <h3>No orders found</h3>
            <p>
              {statusFilter === 'all' 
                ? 'No orders in the system yet.' 
                : `No ${statusFilter} orders.`}
            </p>
          </div>
        ) : (
          <>
            <div className="list-actions">
              <button onClick={selectAllVisible} className="select-all-btn">
                Select All Visible
              </button>
            </div>
            
            <div className="orders-list">
              {filteredOrders.map((order, index) => {
                const priority = getOrderPriority(order);
                const isExpanded = expandedOrder === order._id;
                const isSelected = selectedOrders.includes(order._id);
                
                return (
                  <div 
                    key={order._id}
                    className={`order-card ${priority}-priority ${isSelected ? 'selected' : ''}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Order Header */}
                    <div className="order-header">
                      <div className="order-basic-info">
                        <div className="order-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(order._id)}
                          />
                        </div>
                        
                        <div className="order-identity">
                          <div className="order-number">
                            Order #{order.orderNumber}
                          </div>
                          <div className="customer-name">
                            {order.customer?.name || 'Walk-in Customer'}
                          </div>
                        </div>
                        
                        <div className="order-timing">
                          <div className="order-time">
                            <span className="time-label">Placed:</span>
                            <span className="time-value">{formatTime(order.createdAt)}</span>
                          </div>
                          {order.estimatedReadyTime && (
                            <div className="ready-time">
                              <span className="time-label">ETA:</span>
                              <span className="time-value">{formatTime(order.estimatedReadyTime)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="order-amount">
                          <span className="amount-value">${order.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      
                      <div className="order-status-section">
                        <div 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {order.status}
                        </div>
                        
                        <button 
                          onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                          className="expand-btn"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Items Preview */}
                    {!isExpanded && order.items && (
                      <div className="items-preview">
                        <div className="items-summary">
                          {order.items.slice(0, 2).map((item, i) => (
                            <span key={i} className="item-preview">
                              {item.quantity}× {item.name}
                            </span>
                          ))}
                          {order.items.length > 2 && (
                            <span className="more-items">
                              +{order.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="order-details">
                        {/* Customer Info */}
                        <div className="detail-section">
                          <h4>Customer Information</h4>
                          <div className="customer-details">
                            <p><strong>Name:</strong> {order.customer?.name || 'N/A'}</p>
                            <p><strong>Email:</strong> {order.customer?.email || 'N/A'}</p>
                            {order.customer?.phone && (
                              <p><strong>Phone:</strong> {order.customer.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="detail-section">
                          <h4>Order Items</h4>
                          <div className="order-items-list">
                            {order.items?.map((item, i) => (
                              <div key={i} className="order-item-detail">
                                <div className="item-info">
                                  <span className="item-name">{item.name}</span>
                                  <span className="item-qty">×{item.quantity}</span>
                                </div>
                                <div className="item-price">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Special Instructions */}
                        {order.notes && (
                          <div className="detail-section">
                            <h4>Special Instructions</h4>
                            <div className="order-notes">
                              {order.notes}
                            </div>
                          </div>
                        )}

                        {/* Order Timeline */}
                        <div className="detail-section">
                          <h4>Order Timeline</h4>
                          <div className="order-timeline">
                            <div className="timeline-item completed">
                              <span className="timeline-time">{formatTime(order.createdAt)}</span>
                              <span className="timeline-event">Order Placed</span>
                            </div>
                            {order.status !== 'pending' && (
                              <div className="timeline-item completed">
                                <span className="timeline-time">-</span>
                                <span className="timeline-event">Confirmed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="order-actions">
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(order._id, 'confirmed')}
                            className="action-btn confirm-btn"
                          >
                            ✅ Confirm
                          </button>
                          <button 
                            onClick={() => handleStatusChange(order._id, 'preparing')}
                            className="action-btn preparing-btn"
                          >
                            👨‍🍳 Start Preparing
                          </button>
                        </>
                      )}
                      
                      {order.status === 'confirmed' && (
                        <button 
                          onClick={() => handleStatusChange(order._id, 'preparing')}
                          className="action-btn preparing-btn"
                        >
                          👨‍🍳 Start Preparing
                        </button>
                      )}
                      
                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => handleStatusChange(order._id, 'ready')}
                          className="action-btn ready-btn"
                        >
                          ☕ Mark Ready
                        </button>
                      )}
                      
                      {order.status === 'ready' && (
                        <button 
                          onClick={() => handleStatusChange(order._id, 'completed')}
                          className="action-btn completed-btn"
                        >
                          ✨ Complete Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrderQueue;
