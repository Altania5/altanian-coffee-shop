import React, { useState, useEffect } from 'react';
import CustomizationModal from './CustomizationModal';

function Cart({ cart, token, setCart, updateCartQuantity, removeFromCart, onCheckout, inventory, products }) {
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Calculate cart totals
  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => {
      return acc + (item.estimatedPrice || item.price) * item.quantity;
    }, 0);
    const tax = Math.round(subtotal * 0.0875 * 100) / 100; // 8.75% tax
    const total = subtotal + tax;
    const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    return { subtotal, tax, total, itemCount };
  };
  
  const { subtotal, tax, total, itemCount } = calculateTotals();

  // Handle editing an item
  const handleEditItem = (cartItem) => {
    const product = products.find(p => p._id === cartItem.productId);
    if (product) {
      setEditingItem({ cartItem, product });
    }
  };
  
  // Handle updating an item from customization modal
  const handleUpdateItem = (updatedItem) => {
    if (editingItem) {
      // Replace the original item with the updated one
      const updatedCart = cart.map(item => {
        if (item.id === editingItem.cartItem.id) {
          return { ...updatedItem, id: item.id }; // Keep the same ID
        }
        return item;
      });
      setCart(updatedCart);
      setEditingItem(null);
    }
  };
  
  // Get display name for customized item
  const getItemDisplayName = (item) => {
    const product = products.find(p => p._id === item.productId);
    if (!product) return item.name || 'Unknown Item';
    
    let displayName = product.name;
    
    if (item.customizations) {
      const customizations = item.customizations;
      const customParts = [];
      
      if (customizations.size && customizations.size !== 'medium') {
        const sizeNames = { small: 'Sm', large: 'Lg', 'extra-large': 'XL' };
        customParts.push(sizeNames[customizations.size] || customizations.size);
      }
      
      if (customizations.temperature === 'iced') {
        customParts.push('Iced');
      }
      
      if (customizations.milk) {
        const milk = inventory.find(i => i._id === customizations.milk.inventoryId);
        if (milk) {
          customParts.push(milk.itemName.split(' ')[0]); // e.g., "Oat" from "Oat Milk"
        }
      }
      
      if (customizations.extraShots && customizations.extraShots.quantity > 0) {
        customParts.push(`+${customizations.extraShots.quantity} Shot${customizations.extraShots.quantity > 1 ? 's' : ''}`);
      }
      
      if (customParts.length > 0) {
        displayName = `${customParts.join(' ')} ${displayName}`;
      }
    }
    
    return displayName;
  };
  
  // Get customization summary for display
  const getCustomizationSummary = (item) => {
    if (!item.customizations) return null;
    
    const customizations = item.customizations;
    const summary = [];
    
    if (customizations.syrups && customizations.syrups.length > 0) {
      const syrupNames = customizations.syrups.map(syrup => {
        const syrupItem = inventory.find(i => i._id === syrup.inventoryId);
        return syrupItem ? syrupItem.itemName : syrup.name;
      });
      summary.push(`Syrups: ${syrupNames.join(', ')}`);
    }
    
    if (customizations.toppings && customizations.toppings.length > 0) {
      const toppingNames = customizations.toppings.map(topping => {
        const toppingItem = inventory.find(i => i._id === topping.inventoryId);
        return toppingItem ? toppingItem.itemName : topping.name;
      });
      summary.push(`Toppings: ${toppingNames.join(', ')}`);
    }
    
    if (customizations.coldFoam && customizations.coldFoam.added) {
      summary.push('Cold Foam');
    }
    
    if (customizations.specialInstructions) {
      summary.push(`Note: ${customizations.specialInstructions}`);
    }
    
    return summary.length > 0 ? summary.join(' • ') : null;
  };

  if (cart.length === 0) {
    return (
      <div className="cart-container empty-cart">
        <div className="cart-header">
          <h2 className="cart-title">Your Cart 🛍️</h2>
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
      {editingItem && (
        <CustomizationModal 
          product={editingItem.product}
          inventory={inventory}
          onAddToCart={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          token={token}
          initialCustomizations={editingItem.cartItem.customizations}
          initialQuantity={editingItem.cartItem.quantity}
          isEditing={true}
        />
      )}
      
      <div className="cart-header">
        <h2 className="cart-title">Your Cart 🛍️</h2>
        <div className="cart-badge">
          <span className="item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      <div className="cart-items">
        {cart.map((item, index) => {
          const displayName = getItemDisplayName(item);
          const customizationSummary = getCustomizationSummary(item);
          const itemPrice = item.estimatedPrice || item.price || 0;
          
          return (
            <div 
              key={item.id || item._id} 
              className="cart-item-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="cart-item-content">
                <div className="cart-item-info">
                  <h4 className="cart-item-name">{displayName}</h4>
                  {customizationSummary && (
                    <p className="cart-item-customizations">{customizationSummary}</p>
                  )}
                  <p className="cart-item-price">${itemPrice.toFixed(2)} each</p>
                </div>
                
                <div className="cart-item-controls">
                  <div className="cart-item-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditItem(item)}
                      aria-label="Edit item"
                      title="Edit customizations"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id || item._id)}
                      aria-label="Remove item"
                      title="Remove from cart"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <div className="quantity-controls">
                    <button 
                      onClick={() => updateCartQuantity(item.id || item._id, item.quantity - 1)} 
                      className="quantity-btn minus-btn"
                      aria-label="Decrease quantity"
                      disabled={loading}
                    >
                      −
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.id || item._id, item.quantity + 1)} 
                      className="quantity-btn plus-btn"
                      aria-label="Increase quantity"
                      disabled={loading}
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="item-total">
                    ${(itemPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="cart-summary">
        <div className="summary-row">
          <span className="summary-label">Subtotal ({itemCount} items):</span>
          <span className="summary-value">${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Tax (8.75%):</span>
          <span className="summary-value">${tax.toFixed(2)}</span>
        </div>
        <div className="summary-row total-row">
          <span className="summary-label">Total:</span>
          <span className="summary-total">${total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="cart-actions">
        <button 
          onClick={() => setCart([])} 
          className="clear-cart-btn"
          disabled={cart.length === 0 || loading}
        >
          Clear Cart
        </button>
        <button 
          onClick={onCheckout} 
          className="checkout-btn"
          disabled={cart.length === 0 || loading}
        >
          <span>{loading ? 'Processing...' : 'Proceed to Checkout'}</span>
          <span className="checkout-icon">🚀</span>
        </button>
      </div>
    </div>
  );
}

export default Cart;