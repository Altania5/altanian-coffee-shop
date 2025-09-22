import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

function InventoryManager({ inventory, lowStockAlerts, onInventoryUpdate, socket }) {
  const [items, setItems] = useState(inventory || []);
  const [alerts, setAlerts] = useState(lowStockAlerts || []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('stock-level');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemType: 'Beans',
    quantityInStock: 0,
    lowStockThreshold: 10,
    unit: 'lbs',
    isAvailable: true
  });

  const categories = ['all', 'Beans', 'Milk', 'Syrup', 'Tea', 'Powder', 'Refresher', 'Topping'];
  const units = ['lbs', 'oz', 'bottles', 'bags', 'boxes', 'cartons', 'gallons', 'pieces'];
  
  const sortOptions = [
    { value: 'stock-level', label: 'Stock Level (Low to High)' },
    { value: 'stock-high', label: 'Stock Level (High to Low)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'category', label: 'Category' },
    { value: 'threshold', label: 'Low Stock Threshold' }
  ];

  useEffect(() => {
    setItems(inventory || []);
  }, [inventory]);

  useEffect(() => {
    setAlerts(lowStockAlerts || []);
  }, [lowStockAlerts]);

  // Filter and sort items
  const getFilteredItems = () => {
    let filtered = items;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.itemType === selectedCategory);
    }

    // Low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter(item => 
        (item.quantityInStock || item.currentQuantity || 0) <= (item.lowStockThreshold || 10)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aQuantity = a.quantityInStock || a.currentQuantity || 0;
      const bQuantity = b.quantityInStock || b.currentQuantity || 0;
      
      switch (sortBy) {
        case 'stock-high':
          return bQuantity - aQuantity;
        case 'name':
          return (a.itemName || '').localeCompare(b.itemName || '');
        case 'category':
          return (a.itemType || '').localeCompare(b.itemType || '');
        case 'threshold':
          return (a.lowStockThreshold || 0) - (b.lowStockThreshold || 0);
        default: // stock-level
          return aQuantity - bQuantity;
      }
    });

    return filtered;
  };

  const getStockStatus = (item) => {
    const current = item.quantityInStock || item.currentQuantity || 0;
    const threshold = item.lowStockThreshold || 10;
    
    if (current <= 0) return { status: 'out', color: '#dc3545', label: 'Out of Stock' };
    if (current <= threshold * 0.5) return { status: 'critical', color: '#fd7e14', label: 'Critical' };
    if (current <= threshold) return { status: 'low', color: '#ffc107', label: 'Low Stock' };
    return { status: 'good', color: '#28a745', label: 'In Stock' };
  };

  const handleQuickAdjustment = (itemId, adjustment) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return;
    
    const currentQuantity = item.quantityInStock || item.currentQuantity || 0;
    const newQuantity = Math.max(0, currentQuantity + adjustment);
    handleInventoryUpdate(itemId, newQuantity);
  };

  const handleInventoryUpdate = async (itemId, newQuantity) => {
    try {
      // Update local state immediately for responsive UI
      setItems(prev => prev.map(item =>
        item._id === itemId
          ? { ...item, quantityInStock: newQuantity, currentQuantity: newQuantity }
          : item
      ));
      
      // Make API call to persist changes
      await api.put(`/inventory/update/${itemId}`, { 
        quantityInStock: newQuantity,
        currentQuantity: newQuantity 
      });
      
      // Notify parent component
      if (onInventoryUpdate) {
        onInventoryUpdate(itemId, newQuantity);
      }
      
      console.log(`✅ Inventory updated: Item ${itemId} quantity set to ${newQuantity}`);
    } catch (error) {
      console.error('❌ Failed to update inventory:', error);
      
      // Revert local state on error
      setItems(prev => prev.map(item =>
        item._id === itemId
          ? { ...item, quantityInStock: item.quantityInStock, currentQuantity: item.currentQuantity }
          : item
      ));
      
      alert('Failed to update inventory. Please try again.');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const token = localStorage.getItem('token'); // Get from storage or context
      const headers = { 'x-auth-token': token };

      await api.put(`/inventory/update/${editingItem._id}`, editingItem);
      
      // Update local state
      setItems(prev => prev.map(item =>
        item._id === editingItem._id ? editingItem : item
      ));
      
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleAddNewItem = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      console.log('➕ Adding new inventory item:', newItem);

      const response = await api.post('/inventory/add', newItem);
      
      console.log('✅ Item added successfully:', response.data);
      
      setItems(prev => [...prev, response.data]);
      setNewItem({
        itemName: '',
        itemType: 'Beans',
        quantityInStock: 0,
        lowStockThreshold: 10,
        unit: 'lbs',
        isAvailable: true
      });
    } catch (error) {
      console.error('❌ Error adding item:', error);
      alert('Failed to add item: ' + (error.response?.data?.msg || error.message));
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      await api.delete(`/inventory/delete/${itemId}`);
      
      setItems(prev => prev.filter(item => item._id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const filteredItems = getFilteredItems();
  const totalItems = items.length;
  const lowStockCount = items.filter(item => 
    (item.quantityInStock || item.currentQuantity || 0) <= (item.lowStockThreshold || 10)
  ).length;
  const outOfStockCount = items.filter(item => (item.quantityInStock || item.currentQuantity || 0) <= 0).length;

  return (
    <div className="admin-inventory">
      {/* Header Stats */}
      <div className="inventory-header">
        <h2>Inventory Management</h2>
        <div className="inventory-stats">
          <div className="inventory-stat">
            <span className="stat-number">{totalItems}</span>
            <span className="stat-label">Total Items</span>
          </div>
          <div className="inventory-stat warning">
            <span className="stat-number">{lowStockCount}</span>
            <span className="stat-label">Low Stock</span>
          </div>
          <div className="inventory-stat danger">
            <span className="stat-number">{outOfStockCount}</span>
            <span className="stat-label">Out of Stock</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {alerts.length > 0 && (
        <div className="low-stock-alerts">
          <h3>🚨 Low Stock Alerts</h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <div className="alert-content">
                  <strong>{alert.itemName}</strong>
                  <span className="alert-level">
                    {alert.currentQuantity} {alert.unit} remaining
                  </span>
                </div>
                <div className="alert-actions">
                  <button 
                    onClick={() => handleQuickAdjustment(alert._id, 50)}
                    className="restock-btn"
                  >
                    + Quick Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="inventory-controls">
        <div className="control-group">
          <label>Category:</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
            />
            Show low stock only
          </label>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="add-item-form">
        <h3>Add New Item</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="Item name"
            value={newItem.itemName}
            onChange={(e) => setNewItem({...newItem, itemName: e.target.value})}
          />
          <select
            value={newItem.itemType}
            onChange={(e) => setNewItem({...newItem, itemType: e.target.value})}
          >
            {categories.filter(cat => cat !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Current quantity"
            value={newItem.quantityInStock || ''}
            onChange={(e) => setNewItem({...newItem, quantityInStock: parseInt(e.target.value) || 0})}
          />
          <input
            type="number"
            placeholder="Low stock threshold"
            value={newItem.lowStockThreshold || ''}
            onChange={(e) => setNewItem({...newItem, lowStockThreshold: parseInt(e.target.value) || 10})}
          />
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
          >
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <button onClick={handleAddNewItem} className="add-btn">
            Add Item
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="inventory-list">
        <div className="list-header">
          <h3>
            Inventory Items ({filteredItems.length})
          </h3>
        </div>

        {filteredItems.length === 0 ? (
          <div className="no-items">
            <div className="no-items-icon">📦</div>
            <h4>No items found</h4>
            <p>
              {showLowStockOnly 
                ? 'No items are currently low on stock.'
                : 'No inventory items match your current filters.'
              }
            </p>
          </div>
        ) : (
          <div className="items-grid">
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item);
              const isEditing = editingItem && editingItem._id === item._id;
              
              return (
                <div key={item._id} className={`inventory-item ${stockStatus.status}`}>
                  <div className="item-header">
                    <div className="item-name">
                      {isEditing ? (
                        <input
                          value={editingItem.itemName}
                          onChange={(e) => setEditingItem({...editingItem, itemName: e.target.value})}
                        />
                      ) : (
                        <h4>{item.itemName}</h4>
                      )}
                    </div>
                    <div className="item-category">
                      {isEditing ? (
                        <select
                          value={editingItem.itemType}
                          onChange={(e) => setEditingItem({...editingItem, itemType: e.target.value})}
                        >
                          {categories.filter(cat => cat !== 'all').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{item.itemType}</span>
                      )}
                    </div>
                  </div>

                  <div className="item-stock">
                    <div className="stock-level">
                      <span className="stock-number">
                        {item.quantityInStock || item.currentQuantity || 0}
                      </span>
                      <span className="stock-unit">{item.unit}</span>
                    </div>
                    <div 
                      className="stock-status"
                      style={{ color: stockStatus.color }}
                    >
                      {stockStatus.label}
                    </div>
                  </div>

                  <div className="item-threshold">
                    <span className="threshold-label">Low stock threshold:</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingItem.lowStockThreshold}
                        onChange={(e) => setEditingItem({...editingItem, lowStockThreshold: parseInt(e.target.value)})}
                        className="threshold-input"
                      />
                    ) : (
                      <span className="threshold-value">
                        {item.lowStockThreshold || 10} {item.unit}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="item-adjustments">
                      <div className="quick-adjustments">
                        <button 
                          onClick={() => handleQuickAdjustment(item._id, -1)}
                          className="adjust-btn minus"
                          disabled={(item.quantityInStock || item.currentQuantity || 0) <= 0}
                        >
                          -1
                        </button>
                        <button 
                          onClick={() => handleQuickAdjustment(item._id, -10)}
                          className="adjust-btn minus"
                          disabled={(item.quantityInStock || item.currentQuantity || 0) <= 0}
                        >
                          -10
                        </button>
                        <button 
                          onClick={() => handleQuickAdjustment(item._id, 10)}
                          className="adjust-btn plus"
                        >
                          +10
                        </button>
                        <button 
                          onClick={() => handleQuickAdjustment(item._id, 50)}
                          className="adjust-btn plus"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="item-actions">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={handleSaveEdit}
                          className="save-btn"
                        >
                          💾 Save
                        </button>
                        <button 
                          onClick={() => setEditingItem(null)}
                          className="cancel-btn"
                        >
                          ❌ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditItem(item)}
                          className="edit-btn"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item._id)}
                          className="delete-btn"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>

                  <div className="item-availability">
                    <label className="availability-toggle">
                      <input
                        type="checkbox"
                        checked={item.isAvailable}
                        onChange={(e) => {
                          const updatedItem = {...item, isAvailable: e.target.checked};
                          setItems(prev => prev.map(i => i._id === item._id ? updatedItem : i));
                        }}
                      />
                      Available for orders
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryManager;
