import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const CATEGORIES = ['Beans', 'Milk', 'Syrup', 'Tea', 'Powder', 'Refresher', 'Topping'];
const UNITS = ['Bottles', 'Bags', 'Boxes', 'Carton'];

function InventoryManager({ token }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'Bags' });
  const [selectedCategory, setSelectedCategory] = useState('Beans');
  const [loading, setLoading] = useState(true);

  const headers = { 'x-auth-token': token };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const res = await axios.get(`${baseURL}/inventory`, { headers });
      setItems(res.data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleNewItemChange = (e) => {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemData = { 
        itemName: newItem.name,
        itemType: selectedCategory, 
        unit: newItem.unit,
        quantityInStock: parseInt(newItem.quantity) || 0,
        isAvailable: true
      };
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const res = await axios.post(`${baseURL}/api/inventory`, itemData, { headers });
      setItems([...items, res.data.data]); // API returns { success: true, data: item }
      setNewItem({ name: '', quantity: 0, unit: 'Bags' });
    } catch (err) {
      alert('Error adding item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdate = async (id, field, value) => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      await axios.put(`${baseURL}/api/inventory/${id}`, { [field]: value }, { headers });
      fetchItems();
    } catch (err) {
      alert('Error updating item: ' + (err.response?.data?.message || err.message));
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
        try {
            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            await axios.delete(`${baseURL}/api/inventory/${id}`, { headers });
            setItems(items.filter(item => item._id !== id));
        } catch (err) {
            alert('Error deleting item: ' + (err.response?.data?.message || err.message));
        }
    }
  };

  if (loading) return <p>Loading inventory...</p>;

  return (
    <div className="container">
      <h3>Inventory Management</h3>
      
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {CATEGORIES.map(category => (
          <button 
            key={category} 
            onClick={() => setSelectedCategory(category)}
            style={{ 
              width: 'auto', 
              backgroundColor: selectedCategory === category ? 'var(--secondary-color)' : 'var(--primary-color)'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <form onSubmit={handleAddItem} style={{ marginBottom: '20px' }}>
        <h4>Add New {selectedCategory}</h4>
        <input type="text" name="name" placeholder="Item Name" value={newItem.name} onChange={handleNewItemChange} required />
        <input type="number" name="quantity" placeholder="Quantity" value={newItem.quantity} onChange={handleNewItemChange} required />
        
        <select name="unit" value={newItem.unit} onChange={handleNewItemChange} required>
          {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
        
        <button type="submit">Add New Item</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <li key={item._id} className="order-item">
            <strong>{item.itemName || item.name}</strong> ({item.itemType || item.category} - {item.unit})
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <label>Qty:</label>
              <input 
                type="number" 
                defaultValue={item.quantityInStock || item.quantity || 0} 
                onBlur={(e) => handleUpdate(item._id, 'quantityInStock', parseInt(e.target.value) || 0)} 
                style={{ width: '80px', margin: 0 }}
              />
              <label>Available:</label>
              <input 
                type="checkbox" 
                checked={item.isAvailable} 
                onChange={(e) => handleUpdate(item._id, 'isAvailable', e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <button onClick={() => handleDelete(item._id)} style={{backgroundColor: '#dc3545', width: 'auto'}}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default InventoryManager;