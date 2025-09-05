import React from 'react';
import axios from 'axios';


function Cart({ cart, token, setCart, updateCartQuantity, onCheckout }) {
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="cart-container empty-cart">
        <div className="cart-header">
          <h2 className="cart-title">Your Cart 🛒</h2>
        </div>
        <div className="empty-cart-content">
          <div className="empty-cart-icon">📋</div>
          <p className="empty-cart-text">Your cart is empty</p>
          <p className="empty-cart-subtitle">Add some delicious items to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h2 className="cart-title">Your Cart 🛒</h2>
        <div className="cart-badge">
          <span className="item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      <div className="cart-items">
        {cart.map((item, index) => (
          <div 
            key={item._id} 
            className="cart-item-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="cart-item-info">
              <h4 className="cart-item-name">{item.name}</h4>
              <p className="cart-item-price">${item.price.toFixed(2)} each</p>
            </div>
            
            <div className="cart-item-controls">
              <div className="quantity-controls">
                <button 
                  onClick={() => updateCartQuantity(item._id, item.quantity - 1)} 
                  className="quantity-btn minus-btn"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="quantity-display">{item.quantity}</span>
                <button 
                  onClick={() => updateCartQuantity(item._id, item.quantity + 1)} 
                  className="quantity-btn plus-btn"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              
              <div className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="cart-summary">
        <div className="summary-row">
          <span className="summary-label">Subtotal ({itemCount} items):</span>
          <span className="summary-value">${total.toFixed(2)}</span>
        </div>
        <div className="summary-row total-row">
          <span className="summary-label">Total:</span>
          <span className="summary-total">${total.toFixed(2)}</span>
        </div>
      </div>
      
      <button 
        onClick={onCheckout} 
        className="checkout-btn"
        disabled={cart.length === 0}
      >
        <span>Proceed to Checkout</span>
        <span className="checkout-icon">🚀</span>
      </button>
    </div>
  );
}

export default Cart;