import React, { useState } from 'react';
import axios from 'axios';

function AddBeanForm({ token, onBeanAdded }) {
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [origin, setOrigin] = useState('');
  const [roastDate, setRoastDate] = useState('');
  const [roastLevel, setRoastLevel] = useState('medium');
  const [processMethod, setProcessMethod] = useState('washed');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const headers = { 'x-auth-token': token };
      const newBean = { 
        name, 
        roaster, 
        origin, 
        roastDate,
        roastLevel,
        processMethod,
        notes
      };
      const response = await axios.post(`${baseURL}/beans/add`, newBean, { headers });
      onBeanAdded(response.data);
      // Clear form
      setName('');
      setRoaster('');
      setOrigin('');
      setRoastDate('');
      setRoastLevel('medium');
      setProcessMethod('washed');
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.msg || 'Error adding bean.');
    }
  };

  return (
    <div style={{ padding: '20px', margin: '20px 0', border: '1px solid #eee' }}>
      <h4>Add a New Bean</h4>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Bean Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
        />
        <input 
          type="text" 
          placeholder="Roaster (optional)" 
          value={roaster} 
          onChange={e => setRoaster(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Origin (optional)" 
          value={origin} 
          onChange={e => setOrigin(e.target.value)} 
        />
        <label htmlFor="roastDate">Roast Date *</label>
        <input 
          type="date" 
          id="roastDate"
          value={roastDate} 
          onChange={e => setRoastDate(e.target.value)} 
          required 
          style={{ width: '100%' }}
        />
        <label htmlFor="roastLevel">Roast Level</label>
        <select 
          id="roastLevel"
          value={roastLevel} 
          onChange={e => setRoastLevel(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="light">Light</option>
          <option value="light-medium">Light-Medium</option>
          <option value="medium">Medium</option>
          <option value="medium-dark">Medium-Dark</option>
          <option value="dark">Dark</option>
        </select>
        <label htmlFor="processMethod">Process Method</label>
        <select 
          id="processMethod"
          value={processMethod} 
          onChange={e => setProcessMethod(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="washed">Washed</option>
          <option value="natural">Natural</option>
          <option value="honey">Honey</option>
          <option value="semi-washed">Semi-Washed</option>
          <option value="other">Other</option>
        </select>
        <textarea 
          placeholder="Notes (optional)" 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          style={{ width: '100%', minHeight: '60px' }}
          maxLength={300}
        />
        <button type="submit">Save Bean</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

export default AddBeanForm;