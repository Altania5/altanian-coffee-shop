import React, { useState } from 'react';
import axios from 'axios';
import AddBeanForm from './AddBeanForm';

// Pass down the full user object
function AddCoffeeLogForm({ token, beans, onLogAdded, onBeanAdded, user }) {
  const [showBeanForm, setShowBeanForm] = useState(false);
  const [formData, setFormData] = useState({
    bean: '',
    machine: 'Meraki',
    grindSize: '',
    extractionTime: '',
    temperature: '',
    inWeight: '',
    outWeight: '',
    tasteMetExpectations: true,
    notes: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const headers = { 'x-auth-token': token };
      const response = await axios.post('/coffeelogs/add', formData, { headers });
      onLogAdded(response.data);
      // Reset form
      setFormData({
        bean: '', machine: 'Meraki', grindSize: '', extractionTime: '',
        temperature: '', inWeight: '', outWeight: '',
        tasteMetExpectations: true, notes: ''
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred.');
    }
  };

  return (
    <div className="container">
      <h2>Add New Coffee Log</h2>
      
      {/* --- POINT 5: Conditional Button --- */}
      {user.role === 'owner' && (
        <button onClick={() => setShowBeanForm(!showBeanForm)} style={{width: 'auto', marginBottom: '15px'}}>
          {showBeanForm ? 'Hide Bean Form' : 'Create New Bean'}
        </button>
      )}

      {showBeanForm && <AddBeanForm token={token} onBeanAdded={(newBean) => {
        onBeanAdded(newBean);
        setShowBeanForm(false);
      }} />}

      <form onSubmit={handleSubmit}>
        <select name="bean" value={formData.bean} onChange={handleChange} required>
          <option value="">Select a Bean</option>
          {beans.map(bean => (
            <option key={bean._id} value={bean._id}>{bean.name} - {bean.roaster}</option>
          ))}
        </select>
        <select name="machine" value={formData.machine} onChange={handleChange} required>
          <option value="Meraki">Meraki</option>
          <option value="Breville">Breville</option>
        </select>
        <input type="number" name="grindSize" placeholder="Grind Size" value={formData.grindSize} onChange={handleChange} required />
        <input type="number" name="inWeight" placeholder="Weight (in)" value={formData.inWeight} onChange={handleChange} required />
        <input type="number" name="outWeight" placeholder="Weight (out)" value={formData.outWeight} onChange={handleChange} required />
        <input type="number" name="extractionTime" placeholder="Extraction Time (secs)" value={formData.extractionTime} onChange={handleChange} required />
        <input type="number" name="temperature" placeholder="Temp (°C) (optional)" value={formData.temperature} onChange={handleChange} />
        
        {/* --- POINT 2: Limit Notes Textarea --- */}
        <textarea 
          name="notes" 
          placeholder="Notes" 
          value={formData.notes} 
          onChange={handleChange} 
          style={{ resize: 'vertical', minHeight: '80px' }} 
        />
        
        <label>
          <input type="checkbox" name="tasteMetExpectations" checked={formData.tasteMetExpectations} onChange={handleChange} style={{width: 'auto', marginRight: '10px'}}/>
          Did it taste good?
        </label>
        
        {/* --- POINT 3: Reposition Button --- */}
        <button type="submit">Add Log</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

export default AddCoffeeLogForm;