import React, { useState, useEffect } from 'react';

const SYRUP_PRICE = 0.80;
const REFRESHER_PRICE = 1.00;
const SHOT_PRICE = 1.00;

function CustomizationModal({ product, inventory, onAddToCart, onCancel }) {
  const [customizations, setCustomizations] = useState({});
  const [extraSyrups, setExtraSyrups] = useState([]);
  const [extraRefreshers, setExtraRefreshers] = useState([]);
  
  const [baseShots, setBaseShots] = useState(0);
  const [extraShots, setExtraShots] = useState(0);

  const [temperature, setTemperature] = useState(150);
  const [totalPrice, setTotalPrice] = useState(product.price);

  useEffect(() => {
    const initialCustomizations = {};
    let initialShots = 2;
    product.recipe.forEach(ingredient => {
      if (ingredient.item) {
        initialCustomizations[ingredient.item.category] = {
          id: ingredient.item._id,
          name: ingredient.item.name
        };
        if (ingredient.item.category === 'Beans') {
          initialShots = ingredient.quantityRequired;
        }
      }
    });
    setCustomizations(initialCustomizations);
    setBaseShots(initialShots);
  }, [product]);


  useEffect(() => {
    let newPrice = product.price;
    newPrice += extraSyrups.length * SYRUP_PRICE;
    newPrice += extraRefreshers.length * REFRESHER_PRICE;
    newPrice += extraShots * SHOT_PRICE; // Add extra shot cost
    setTotalPrice(newPrice);
  }, [extraSyrups, extraRefreshers, extraShots, product.price]);

  // --- POINT 1: Fix customization change handler ---
  const handleCustomizationChange = (category, itemId) => {
    const item = inventory.find(i => i._id === itemId);
    setCustomizations({ 
        ...customizations, 
        [category]: { id: itemId, name: item ? item.name : '' }
    });
  };

  const addExtra = (type) => {
    if (type === 'Syrup') setExtraSyrups([...extraSyrups, { id: '', name: '' }]);
    if (type === 'Refresher') setExtraRefreshers([...extraRefreshers, { id: '', name: '' }]);
  };
  
  const handleExtraChange = (index, value, type) => {
    const item = inventory.find(i => i._id === value);
    const newItem = { id: value, name: item ? item.name : '' };

    if (type === 'Syrup') {
        const newSyrups = [...extraSyrups];
        newSyrups[index] = newItem;
        setExtraSyrups(newSyrups);
    }
    if (type === 'Refresher') {
        const newRefreshers = [...extraRefreshers];
        newRefreshers[index] = newItem;
        setExtraRefreshers(newRefreshers);
    }
  };


  const handleAddToCartClick = () => {
    // --- POINT 3: Build a more descriptive customization object ---
    const finalCustomizations = {};
    for (const category in customizations) {
        if (customizations[category]) {
            finalCustomizations[category] = customizations[category].name;
        }
    }

    const customizedProduct = {
      ...product,
      name: `${product.name} (Customized)`,
      price: totalPrice,
      customizations: {
        ...finalCustomizations,
        'Extra Shots': extraShots > 0 ? extraShots : undefined,
        Temperature: product.category === 'Hot Beverage' ? `${temperature}°F` : undefined,
        'Added Syrups': extraSyrups.filter(s => s.id).map(s => s.name),
        'Added Refreshers': extraRefreshers.filter(r => r.id).map(r => r.name),
      },
      _id: product._id + JSON.stringify(customizations) + Date.now()
    };
    onAddToCart(customizedProduct);
  };
  
const getInventoryByCategory = (category) => inventory.filter(item => item.category === category);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Customize {product.name}</h3>

        {['Iced Beverage', 'Hot Beverage', 'Shaken Beverage'].includes(product.category) && (
          <>
            <CustomizationOption label="Milk" items={getInventoryByCategory('Milk')} category="Milk" value={customizations.Milk?.id} onChange={handleCustomizationChange} />
            <CustomizationOption label="Syrup" items={getInventoryByCategory('Syrup')} category="Syrup" value={customizations.Syrup?.id} onChange={handleCustomizationChange} />
            <CustomizationOption label="Bean" items={getInventoryByCategory('Beans')} category="Beans" value={customizations.Beans?.id} onChange={handleCustomizationChange} />
            
            <div>
              {/* --- POINT 2: Update Label --- */}
              <label>Extra Shots of Espresso (base: {baseShots}):</label>
              <button onClick={() => setExtraShots(s => Math.max(0, s - 1))}>-</button>
              <span> {extraShots} </span>
              <button onClick={() => setExtraShots(s => s + 1)}>+</button>
            </div>
            
            {extraSyrups.map((_, index) => (
                <CustomizationOption key={index} label={`Extra Syrup ${index + 1}`} items={getInventoryByCategory('Syrup')} onChange={(cat, val) => handleExtraChange(index, val, 'Syrup')} />
            ))}
            <button onClick={() => addExtra('Syrup')}>Add Syrup (${SYRUP_PRICE.toFixed(2)})</button>
          </>
        )}

        {/* --- Hot Beverage Only --- */}
        {product.category === 'Hot Beverage' && (
          <div>
            <label>Temperature:</label>
            <input type="range" min="120" max="180" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            <span> {temperature}°F</span>
          </div>
        )}

        {/* --- Refresher Only --- */}
        {product.category === 'Refresher' && (
          <>
             {extraRefreshers.map((refresher, index) => (
                <CustomizationOption key={index} label={`Add Refresher ${index + 1}`} items={getInventoryByCategory('Refresher')} value={refresher} onChange={(val) => handleExtraChange(index, val, 'Refresher')} />
            ))}
            <button onClick={() => addExtra('Refresher')}>Add Refresher (${REFRESHER_PRICE.toFixed(2)})</button>
          </>
        )}

        <hr />
        <h4>Total: ${totalPrice.toFixed(2)}</h4>
        <button onClick={handleAddToCartClick}>Add to Cart</button>
        <button onClick={onCancel} style={{backgroundColor: '#6c757d'}}>Cancel</button>
      </div>
    </div>
  );
}

const CustomizationOption = ({ label, items, category, value, onChange }) => (
    <div>
      <label>{label}:</label>
      <select value={value || ''} onChange={(e) => onChange(category, e.target.value)}>
        <option value="">Select {label}</option>
        {items.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
      </select>
    </div>
  );

export default CustomizationModal;