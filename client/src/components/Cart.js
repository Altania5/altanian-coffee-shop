import React from 'react';
import axios from 'axios';


function Cart({ cart, token, setCart, updateCartQuantity, onCheckout }) {
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="container">
        <h2>Your Cart</h2>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Your Cart</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cart.map(item => (
          <li key={item._id} className="cart-item">
            <div className="cart-item-details">
              {item.name} - ${item.price.toFixed(2)}
            </div>
            <div className="cart-item-quantity">
              <button onClick={() => updateCartQuantity(item._id, item.quantity - 1)} className="quantity-btn">-</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateCartQuantity(item._id, item.quantity + 1)} className="quantity-btn">+</button>
            </div>
          </li>
        ))}
      </ul>
      <h3>Total: ${total.toFixed(2)}</h3>
      <button onClick={onCheckout}>Checkout</button>
    </div>
  );
}

export default Cart;