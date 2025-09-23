import React, { useState } from 'react';
import { useOrderTracking } from '../hooks/useOrderTracking';
import './OrderTracking.css';

const OrderTracking = ({ orderId, token, orderNumber }) => {
  const { 
    orderStatus, 
    estimatedTime, 
    isConnected, 
    connectionError, 
    orderUpdates,
    reconnect 
  } = useOrderTracking(orderId, token);

  const [showUpdates, setShowUpdates] = useState(false);

  const statusSteps = [
    { 
      key: 'pending', 
      label: 'Order Received', 
      icon: '📝',
      description: 'We\'ve received your order and are preparing it'
    },
    { 
      key: 'confirmed', 
      label: 'Confirmed', 
      icon: '✅',
      description: 'Your order has been confirmed and payment processed'
    },
    { 
      key: 'preparing', 
      label: 'Preparing', 
      icon: '☕',
      description: 'Our baristas are crafting your perfect drink'
    },
    { 
      key: 'ready', 
      label: 'Ready for Pickup', 
      icon: '🎉',
      description: 'Your order is ready! Please come to the counter'
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      icon: '✨',
      description: 'Thank you for choosing Altanian Coffee!'
    }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === orderStatus);
  };

  const formatEstimatedTime = (timeString) => {
    if (!timeString) return null;
    
    const time = new Date(timeString);
    const now = new Date();
    const diffMinutes = Math.ceil((time - now) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Ready now!';
    if (diffMinutes === 1) return '1 minute';
    return `${diffMinutes} minutes`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f39c12',
      'confirmed': '#3498db',
      'preparing': '#e67e22',
      'ready': '#27ae60',
      'completed': '#2ecc71',
      'cancelled': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = statusSteps[currentStepIndex];

  return (
    <div className="order-tracking">
      <div className="order-tracking-header">
        <h2>Order Tracking</h2>
        {orderNumber && (
          <div className="order-number">Order #{orderNumber}</div>
        )}
      </div>

      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-indicator">
          <div className={`status-dot ${isConnected ? 'green' : 'red'}`}></div>
          <span>{isConnected ? 'Live Updates' : 'Offline'}</span>
        </div>
        {connectionError && (
          <div className="connection-error">
            <span>{connectionError}</span>
            <button onClick={reconnect} className="reconnect-btn">
              Reconnect
            </button>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="current-status">
        <div 
          className="status-icon"
          style={{ backgroundColor: getStatusColor(orderStatus) }}
        >
          {currentStep?.icon || '☕'}
        </div>
        <div className="status-info">
          <h3>{currentStep?.label || 'Processing'}</h3>
          <p>{currentStep?.description || 'Your order is being processed'}</p>
          {estimatedTime && (
            <div className="estimated-time">
              <span className="time-label">Estimated ready time:</span>
              <span className="time-value">{formatEstimatedTime(estimatedTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="progress-timeline">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div 
              key={step.key} 
              className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-indicator">
                <div className="step-icon">{step.icon}</div>
                {index < statusSteps.length - 1 && (
                  <div className="step-connector"></div>
                )}
              </div>
              <div className="step-content">
                <div className="step-label">{step.label}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Updates History */}
      {orderUpdates.length > 0 && (
        <div className="updates-section">
          <button 
            className="toggle-updates"
            onClick={() => setShowUpdates(!showUpdates)}
          >
            {showUpdates ? 'Hide' : 'Show'} Update History ({orderUpdates.length})
          </button>
          
          {showUpdates && (
            <div className="updates-list">
              {orderUpdates.map((update, index) => (
                <div key={index} className="update-item">
                  <div className="update-icon">{statusSteps.find(s => s.key === update.status)?.icon}</div>
                  <div className="update-content">
                    <div className="update-status">{update.statusDisplay}</div>
                    <div className="update-time">
                      {new Date(update.timestamp).toLocaleTimeString()}
                      {update.updatedBy && ` • Updated by ${update.updatedBy}`}
                    </div>
                    {update.isNewOrder && (
                      <div className="new-order-badge">New Order</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <h4>Need Help?</h4>
        <p>If you have any questions about your order, please contact us:</p>
        <div className="contact-info">
          <span>📞 (555) 123-COFFEE</span>
          <span>✉️ orders@altaniancoffee.com</span>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;

