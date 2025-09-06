import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function CustomizationModal({ product, inventory, onAddToCart, onCancel, token, initialCustomizations = null, initialQuantity = 1, isEditing = false }) {
  // Main customization state - initialize with existing values if editing
  const [customizations, setCustomizations] = useState(() => {
    if (initialCustomizations) {
      return {
        size: initialCustomizations.size || 'medium',
        milk: initialCustomizations.milk?.inventoryId || null,
        extraShots: initialCustomizations.extraShots?.quantity || 0,
        syrups: initialCustomizations.syrups?.map(s => s.inventoryId) || [],
        toppings: initialCustomizations.toppings?.map(t => t.inventoryId) || [],
        temperature: initialCustomizations.temperature || 'hot',
        coldFoam: initialCustomizations.coldFoam?.added || false,
        specialInstructions: initialCustomizations.specialInstructions || ''
      };
    }
    
    return {
      size: 'medium', // Default size
      milk: null,
      extraShots: 0,
      syrups: [],
      toppings: [],
      temperature: 'hot',
      coldFoam: false,
      specialInstructions: ''
    };
  });
  
  const [quantity, setQuantity] = useState(initialQuantity);
  const [totalPrice, setTotalPrice] = useState(product.price);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Available options from inventory
  const [availableOptions, setAvailableOptions] = useState({
    milks: [],
    syrups: [],
    toppings: [],
    sizes: [
      { id: 'small', name: 'Small (8oz)', price: -0.50 },
      { id: 'medium', name: 'Medium (12oz)', price: 0 },
      { id: 'large', name: 'Large (16oz)', price: 0.75 },
      { id: 'extra-large', name: 'Extra Large (20oz)', price: 1.25 }
    ]
  });

  // Pricing constants - could be moved to config
  const PRICING = {
    extraShot: 0.75,
    syrup: 0.60,
    premiumMilk: 0.65, // oat, almond, etc.
    topping: 0.50,
    coldFoam: 0.55
  };

  // Initialize available options from inventory
  useEffect(() => {
    if (inventory && inventory.length > 0) {
      const options = {
        milks: inventory.filter(item => 
          item.itemType === 'Milk' && 
          item.isAvailable && 
          item.quantityInStock > 0
        ).map(item => ({
          id: item._id,
          name: item.itemName,
          price: item.itemName.toLowerCase().includes('oat') || 
                 item.itemName.toLowerCase().includes('almond') ||
                 item.itemName.toLowerCase().includes('soy') ? PRICING.premiumMilk : 0
        })),
        
        syrups: inventory.filter(item => 
          item.itemType === 'Syrup' && 
          item.isAvailable && 
          item.quantityInStock > 0
        ).map(item => ({
          id: item._id,
          name: item.itemName,
          price: PRICING.syrup
        })),
        
        toppings: inventory.filter(item => 
          item.itemType === 'Topping' && 
          item.isAvailable && 
          item.quantityInStock > 0
        ).map(item => ({
          id: item._id,
          name: item.itemName,
          price: PRICING.topping
        })),
        
        sizes: availableOptions.sizes // Keep static sizes
      };
      
      setAvailableOptions(options);
    }
  }, [inventory]);


  // Calculate total price based on customizations
  const calculatePrice = useCallback(() => {
    let price = product.price;
    
    // Size adjustment
    const selectedSize = availableOptions.sizes.find(s => s.id === customizations.size);
    if (selectedSize) {
      price += selectedSize.price;
    }
    
    // Milk adjustment
    if (customizations.milk) {
      const selectedMilk = availableOptions.milks.find(m => m.id === customizations.milk);
      if (selectedMilk) {
        price += selectedMilk.price;
      }
    }
    
    // Extra shots
    price += customizations.extraShots * PRICING.extraShot;
    
    // Syrups
    price += customizations.syrups.length * PRICING.syrup;
    
    // Toppings
    price += customizations.toppings.length * PRICING.topping;
    
    // Cold foam
    if (customizations.coldFoam) {
      price += PRICING.coldFoam;
    }
    
    return price * quantity;
  }, [product.price, customizations, quantity, availableOptions]);
  
  // Update price when customizations change
  useEffect(() => {
    setTotalPrice(calculatePrice());
  }, [calculatePrice]);

  // Customization handlers
  const updateCustomization = (field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [field]: value
    }));
    setValidationErrors([]); // Clear errors when user makes changes
  };
  
  const addSyrup = (syrupId) => {
    if (customizations.syrups.length >= 4) {
      setValidationErrors(['Maximum 4 syrups allowed']);
      return;
    }
    if (!customizations.syrups.includes(syrupId)) {
      updateCustomization('syrups', [...customizations.syrups, syrupId]);
    }
  };
  
  const removeSyrup = (syrupId) => {
    updateCustomization('syrups', customizations.syrups.filter(id => id !== syrupId));
  };
  
  const addTopping = (toppingId) => {
    if (customizations.toppings.length >= 3) {
      setValidationErrors(['Maximum 3 toppings allowed']);
      return;
    }
    if (!customizations.toppings.includes(toppingId)) {
      updateCustomization('toppings', [...customizations.toppings, toppingId]);
    }
  };
  
  const removeTopping = (toppingId) => {
    updateCustomization('toppings', customizations.toppings.filter(id => id !== toppingId));
  };
  
  // Validate customizations
  const validateCustomizations = () => {
    const errors = [];
    
    if (customizations.extraShots > 4) {
      errors.push('Maximum 4 extra shots allowed');
    }
    
    if (customizations.syrups.length > 4) {
      errors.push('Maximum 4 syrups allowed');
    }
    
    if (customizations.toppings.length > 3) {
      errors.push('Maximum 3 toppings allowed');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };


  const handleAddToCart = async () => {
    if (!validateCustomizations()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Build customizations for API
      const processedCustomizations = {
        size: customizations.size,
        milk: customizations.milk ? {
          inventoryId: customizations.milk,
          name: availableOptions.milks.find(m => m.id === customizations.milk)?.name || 'Unknown',
          price: availableOptions.milks.find(m => m.id === customizations.milk)?.price || 0
        } : null,
        extraShots: customizations.extraShots > 0 ? {
          quantity: customizations.extraShots,
          pricePerShot: PRICING.extraShot
        } : null,
        syrups: customizations.syrups.map(syrupId => {
          const syrup = availableOptions.syrups.find(s => s.id === syrupId);
          return {
            inventoryId: syrupId,
            name: syrup?.name || 'Unknown Syrup',
            price: syrup?.price || PRICING.syrup
          };
        }),
        toppings: customizations.toppings.map(toppingId => {
          const topping = availableOptions.toppings.find(t => t.id === toppingId);
          return {
            inventoryId: toppingId,
            name: topping?.name || 'Unknown Topping',
            price: topping?.price || PRICING.topping
          };
        }),
        coldFoam: customizations.coldFoam ? {
          added: true,
          price: PRICING.coldFoam
        } : null,
        temperature: customizations.temperature,
        specialInstructions: customizations.specialInstructions.trim() || null
      };
      
      // Build the cart item
      const cartItem = {
        productId: product._id,
        quantity: quantity,
        customizations: processedCustomizations,
        estimatedPrice: totalPrice // This will be recalculated by the backend
      };
      
      // Add to cart with customizations
      onAddToCart(cartItem);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setValidationErrors(['Failed to add item to cart. Please try again.']);
    } finally {
      setLoading(false);
    }
  };
  
  // Get display names for selected items
  const getSelectedItemName = (itemId, itemArray) => {
    return itemArray.find(item => item.id === itemId)?.name || 'Unknown';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="customization-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit' : 'Customize Your'} {product.name}</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((error, index) => (
                <div key={index} className="error-message">⚠️ {error}</div>
              ))}
            </div>
          )}

          {/* Size Selection */}
          <div className="customization-section">
            <h3 className="section-title">🍵 Size</h3>
            <div className="options-grid">
              {availableOptions.sizes.map(size => (
                <label key={size.id} className={`option-card ${customizations.size === size.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="size"
                    value={size.id}
                    checked={customizations.size === size.id}
                    onChange={(e) => updateCustomization('size', e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-name">{size.name}</span>
                    {size.price !== 0 && (
                      <span className="option-price">
                        {size.price > 0 ? '+' : ''}${size.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Milk Selection */}
          {availableOptions.milks.length > 0 && (
            <div className="customization-section">
              <h3 className="section-title">🥛 Milk</h3>
              <div className="options-grid">
                <label className={`option-card ${!customizations.milk ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="milk"
                    value=""
                    checked={!customizations.milk}
                    onChange={() => updateCustomization('milk', null)}
                  />
                  <div className="option-content">
                    <span className="option-name">Default</span>
                  </div>
                </label>
                {availableOptions.milks.map(milk => (
                  <label key={milk.id} className={`option-card ${customizations.milk === milk.id ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="milk"
                      value={milk.id}
                      checked={customizations.milk === milk.id}
                      onChange={(e) => updateCustomization('milk', e.target.value)}
                    />
                    <div className="option-content">
                      <span className="option-name">{milk.name}</span>
                      {milk.price > 0 && (
                        <span className="option-price">+${milk.price.toFixed(2)}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Extra Shots */}
          <div className="customization-section">
            <h3 className="section-title">☕ Extra Shots</h3>
            <div className="quantity-control">
              <button 
                type="button"
                className="qty-btn"
                onClick={() => updateCustomization('extraShots', Math.max(0, customizations.extraShots - 1))}
                disabled={customizations.extraShots === 0}
              >
                -
              </button>
              <span className="qty-display">
                {customizations.extraShots} shots
                {customizations.extraShots > 0 && (
                  <span className="qty-price"> (+${(customizations.extraShots * PRICING.extraShot).toFixed(2)})</span>
                )}
              </span>
              <button 
                type="button"
                className="qty-btn"
                onClick={() => updateCustomization('extraShots', Math.min(4, customizations.extraShots + 1))}
                disabled={customizations.extraShots >= 4}
              >
                +
              </button>
            </div>
          </div>

          {/* Syrups */}
          {availableOptions.syrups.length > 0 && (
            <div className="customization-section">
              <h3 className="section-title">🍯 Syrups</h3>
              <div className="selected-items">
                {customizations.syrups.map(syrupId => {
                  const syrup = availableOptions.syrups.find(s => s.id === syrupId);
                  return (
                    <div key={syrupId} className="selected-item">
                      <span>{syrup?.name || 'Unknown'}</span>
                      <button 
                        type="button" 
                        className="remove-btn"
                        onClick={() => removeSyrup(syrupId)}
                        aria-label={`Remove ${syrup?.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="add-options">
                <select 
                  className="add-select"
                  value="" 
                  onChange={(e) => e.target.value && addSyrup(e.target.value)}
                  disabled={customizations.syrups.length >= 4}
                >
                  <option value="">Add syrup (+${PRICING.syrup.toFixed(2)})</option>
                  {availableOptions.syrups
                    .filter(syrup => !customizations.syrups.includes(syrup.id))
                    .map(syrup => (
                      <option key={syrup.id} value={syrup.id}>{syrup.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}

          {/* Toppings */}
          {availableOptions.toppings.length > 0 && (
            <div className="customization-section">
              <h3 className="section-title">🍰 Toppings</h3>
              <div className="selected-items">
                {customizations.toppings.map(toppingId => {
                  const topping = availableOptions.toppings.find(t => t.id === toppingId);
                  return (
                    <div key={toppingId} className="selected-item">
                      <span>{topping?.name || 'Unknown'}</span>
                      <button 
                        type="button" 
                        className="remove-btn"
                        onClick={() => removeTopping(toppingId)}
                        aria-label={`Remove ${topping?.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="add-options">
                <select 
                  className="add-select"
                  value="" 
                  onChange={(e) => e.target.value && addTopping(e.target.value)}
                  disabled={customizations.toppings.length >= 3}
                >
                  <option value="">Add topping (+${PRICING.topping.toFixed(2)})</option>
                  {availableOptions.toppings
                    .filter(topping => !customizations.toppings.includes(topping.id))
                    .map(topping => (
                      <option key={topping.id} value={topping.id}>{topping.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}

          {/* Temperature */}
          <div className="customization-section">
            <h3 className="section-title">🌡️ Temperature</h3>
            <div className="options-grid">
              <label className={`option-card ${customizations.temperature === 'hot' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="temperature"
                  value="hot"
                  checked={customizations.temperature === 'hot'}
                  onChange={(e) => updateCustomization('temperature', e.target.value)}
                />
                <div className="option-content">
                  <span className="option-name">Hot</span>
                </div>
              </label>
              <label className={`option-card ${customizations.temperature === 'iced' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="temperature"
                  value="iced"
                  checked={customizations.temperature === 'iced'}
                  onChange={(e) => updateCustomization('temperature', e.target.value)}
                />
                <div className="option-content">
                  <span className="option-name">Iced</span>
                </div>
              </label>
            </div>
          </div>

          {/* Cold Foam (for iced drinks) */}
          {customizations.temperature === 'iced' && (
            <div className="customization-section">
              <h3 className="section-title">☁️ Cold Foam</h3>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={customizations.coldFoam}
                  onChange={(e) => updateCustomization('coldFoam', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="option-content">
                  <span className="option-name">Add Cold Foam</span>
                  <span className="option-price">+${PRICING.coldFoam.toFixed(2)}</span>
                </span>
              </label>
            </div>
          )}

          {/* Special Instructions */}
          <div className="customization-section">
            <h3 className="section-title">📝 Special Instructions</h3>
            <textarea
              className="special-instructions"
              placeholder="Any special requests? (e.g., extra hot, light ice, etc.)"
              value={customizations.specialInstructions}
              onChange={(e) => updateCustomization('specialInstructions', e.target.value)}
              maxLength={200}
              rows={3}
            />
            <div className="char-count">
              {customizations.specialInstructions.length}/200
            </div>
          </div>

          {/* Quantity */}
          <div className="customization-section">
            <h3 className="section-title">🔢 Quantity</h3>
            <div className="quantity-control">
              <button 
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
              >
                -
              </button>
              <span className="qty-display">{quantity}</span>
              <button 
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="total-section">
            <div className="total-price">
              Total: ${totalPrice.toFixed(2)}
              {quantity > 1 && (
                <span className="quantity-note"> (${(totalPrice/quantity).toFixed(2)} each)</span>
              )}
            </div>
          </div>
          <div className="action-buttons">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={loading}
            >
              {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? `Update Item - $${totalPrice.toFixed(2)}` : `Add to Cart - $${totalPrice.toFixed(2)}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

}

export default CustomizationModal;
