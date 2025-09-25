import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import './NotificationCenter.css';
import OrderTracking from './OrderTracking';
import { subscribeToPush } from '../utils/push';

const NotificationCenter = () => {
  const { notifications, removeNotification, clearNotifications, isConnected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [tracking, setTracking] = useState({ open: false, orderId: null, orderNumber: null, token: null });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order-status':
        return '📱';
      case 'low-stock':
        return '🚨';
      default:
        return '🔔';
    }
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'order-status':
        return 'notification-order';
      case 'low-stock':
        return 'notification-stock';
      default:
        return 'notification-default';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="notification-center">
      <button 
        className={`notification-toggle ${isConnected ? 'connected' : 'disconnected'}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isConnected ? 'Connected to real-time updates' : 'Disconnected from server'}
      >
        <span className="notification-icon">🔔</span>
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {notifications.length > 0 && (
                <button 
                  className="clear-btn"
                  onClick={clearNotifications}
                  title="Clear all notifications"
                >
                  Clear All
                </button>
              )}
              <button 
                className="close-btn"
                onClick={() => setIsOpen(false)}
                title="Close notifications"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
                <small>You'll receive real-time updates here</small>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={index}
                  className={`notification-item ${getNotificationClass(notification.type)}`}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-details">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <small>{formatTimestamp(notification.timestamp)}</small>
                      {notification.type === 'order-status' && notification.data?.orderId && (
                        <div style={{ marginTop: 8 }}>
                          <button 
                            className="track-btn"
                            onClick={() => {
                              const token = localStorage.getItem('token');
                              setTracking({ open: true, orderId: notification.data.orderId, orderNumber: notification.data.orderNumber, token });
                            }}
                          >
                            Track Order
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="remove-btn"
                    onClick={() => removeNotification(index)}
                    title="Remove notification"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="notification-footer">
            <button className="enable-push-btn" onClick={subscribeToPush}>
              Enable Push Notifications
            </button>
          </div>
        </div>
      )}

      {tracking.open && (
        <div className="tracking-modal">
          <div className="tracking-modal-content">
            <div className="tracking-modal-header">
              <h3>Track Order</h3>
              <button className="close-btn" onClick={() => setTracking({ open: false, orderId: null, orderNumber: null, token: null })}>✕</button>
            </div>
            <div className="tracking-modal-body">
              <OrderTracking orderId={tracking.orderId} orderNumber={tracking.orderNumber} token={tracking.token} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

