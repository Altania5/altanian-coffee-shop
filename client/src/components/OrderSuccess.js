import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OrderTracking from './OrderTracking';

function OrderSuccess({ 
  order, 
  paymentMethod = 'card', 
  paymentIntent = null, 
  lowStockAlert = null,
  onNewOrder,
  onViewOrder,
  token 
}) {
  const [estimatedReadyTime, setEstimatedReadyTime] = useState(null);
  const [loading, setLoading] = useState(false);

  // Calculate estimated ready time (15-25 minutes from now)
  useEffect(() => {
    if (order) {
      const now = new Date();
      const baseMinutes = 15 + Math.floor(Math.random() * 10); // 15-25 minutes
      const readyTime = new Date(now.getTime() + baseMinutes * 60000);
      setEstimatedReadyTime(readyTime);
    }
  }, [order]);

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get order items summary
  const getOrderSummary = () => {
    if (!order || !order.items) return [];
    
    return order.items.map(item => {
      const product = item.product || {};
      let displayName = product.name || 'Unknown Item';
      
      // Add customizations to display name
      if (item.customizations) {
        const customParts = [];
        
        if (item.customizations.size && item.customizations.size !== 'medium') {
          const sizeNames = { small: 'Small', large: 'Large', 'extra-large': 'XL' };
          customParts.push(sizeNames[item.customizations.size] || item.customizations.size);
        }
        
        if (item.customizations.temperature === 'iced') {
          customParts.push('Iced');
        }
        
        if (item.customizations.extraShots && item.customizations.extraShots.quantity > 0) {
          customParts.push(`+${item.customizations.extraShots.quantity} Shot${item.customizations.extraShots.quantity > 1 ? 's' : ''}`);
        }
        
        if (customParts.length > 0) {
          displayName = `${customParts.join(' ')} ${displayName}`;
        }
      }
      
      return {
        name: displayName,
        quantity: item.quantity,
        price: item.priceSnapshot || item.estimatedPrice || 0
      };
    });
  };

  const orderItems = getOrderSummary();

  if (!order) {
    return (
      <div className="order-success-container">
        <div className="error-state">
          <span className="error-icon">❌</span>
          <h2>Order information not available</h2>
          <button onClick={onNewOrder} className="new-order-btn">
            Start New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-container">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="checkmark">✓</div>
          </div>
        </div>
        <h1 className="success-title">Order Placed Successfully!</h1>
        <p className="success-subtitle">
          {paymentMethod === 'cash' 
            ? 'Please pay when you pick up your order' 
            : 'Your payment has been processed'}
        </p>
      </div>

      {/* Order Information */}
      <div className="order-info-section">
        <div className="order-card">
          <div className="order-header">
            <h2 className="order-number">Order #{order.orderNumber}</h2>
            <div className="order-status">
              <span className={`status-badge ${order.status}`}>
                {order.status === 'pending' ? 'Pending' :
                 order.status === 'confirmed' ? 'Confirmed' :
                 order.status === 'preparing' ? 'Preparing' :
                 order.status === 'ready' ? 'Ready' :
                 order.status === 'completed' ? 'Completed' : 'Processing'}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="customer-section">
            <h3 className="section-title">👤 Customer</h3>
            <div className="customer-details">
              <p><strong>Name:</strong> {order.customer.name}</p>
              <p><strong>Email:</strong> {order.customer.email}</p>
              {order.customer.phone && (
                <p><strong>Phone:</strong> {order.customer.phone}</p>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="items-section">
            <h3 className="section-title">📋 Your Order</h3>
            <div className="order-items">
              {orderItems.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                  <span className="item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="total-section">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Tax:</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            {order.tip > 0 && (
              <div className="total-row">
                <span>Tip:</span>
                <span>${order.tip.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="total-row">
                <span>Discount:</span>
                <span>-${order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row final-total">
              <span>Total:</span>
              <span>${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="payment-section">
            <h3 className="section-title">💳 Payment</h3>
            <div className="payment-details">
              <p>
                <strong>Method:</strong> {paymentMethod === 'cash' ? 'Pay at Pickup' : 'Credit/Debit Card'}
              </p>
              {paymentIntent && (
                <p><strong>Transaction ID:</strong> {paymentIntent.id}</p>
              )}
              <p>
                <strong>Status:</strong> 
                <span className={`payment-status ${order.payment?.status || 'pending'}`}>
                  {paymentMethod === 'cash' ? 'Pay at Pickup' :
                   order.payment?.status === 'completed' ? 'Paid' :
                   order.payment?.status === 'processing' ? 'Processing' : 'Pending'}
                </span>
              </p>
            </div>
          </div>

          {/* Pickup Information */}
          {estimatedReadyTime && (
            <div className="pickup-section">
              <h3 className="section-title">🕐 Pickup Information</h3>
              <div className="pickup-details">
                <div className="pickup-time">
                  <span className="time-label">Estimated Ready Time:</span>
                  <span className="time-value">{formatTime(estimatedReadyTime)}</span>
                </div>
                <p className="pickup-note">
                  We'll send you an email when your order is ready for pickup!
                </p>
              </div>
            </div>
          )}

          {/* Real-Time Order Tracking */}
          {order && token && (
            <div className="tracking-section">
              <OrderTracking 
                orderId={order._id} 
                token={token}
                orderNumber={order.orderNumber}
              />
            </div>
          )}

          {/* Special Instructions */}
          {order.notes && (
            <div className="notes-section">
              <h3 className="section-title">📝 Special Instructions</h3>
              <div className="notes-content">
                <p>{order.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert (for staff) */}
      {lowStockAlert && lowStockAlert.length > 0 && (
        <div className="low-stock-alert">
          <h3 className="alert-title">⚠️ Low Stock Alert</h3>
          <p className="alert-message">
            {lowStockAlert.length} items are running low and need restocking.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="success-actions">
        {onViewOrder && (
          <button 
            onClick={() => onViewOrder(order.orderNumber, order.customer.email)} 
            className="track-order-btn"
          >
            <span>Track Order Status</span>
            <span className="btn-icon">👁️</span>
          </button>
        )}
        
        <button onClick={onNewOrder} className="new-order-btn">
          <span>Place Another Order</span>
          <span className="btn-icon">🛒</span>
        </button>
      </div>

      {/* Contact Information */}
      <div className="contact-section">
        <h3 className="contact-title">Questions about your order?</h3>
        <p className="contact-info">
          Contact us at <a href="mailto:support@altaniancoffee.com">support@altaniancoffee.com</a>
          {" or call "}
          <a href="tel:+1234567890">(123) 456-7890</a>
        </p>
      </div>
    </div>
  );
}

export default OrderSuccess;
