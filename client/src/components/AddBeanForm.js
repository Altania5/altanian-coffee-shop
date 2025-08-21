import React, { useState } from 'react';
import axios from 'axios';

function AddBeanForm({ token, onBeanAdded }) {
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const headers = { 'x-auth-token': token };
      const newBean = { name, roaster, origin };
      const response = await axios.post('/beans/add', newBean, { headers });
      onBeanAdded(response.data);
      // Clear form
      setName('');
      setRoaster('');
      setOrigin('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error adding bean.');
    }
  };

  return (
    <div style={{ padding: '20px', margin: '20px 0', border: '1px solid #eee' }}>
      <h4>Add a New Bean</h4>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Bean Name" value={name} onChange={e => setName(e.target.value)} required />
        <input type="text" placeholder="Roaster (optional)" value={roaster} onChange={e => setRoaster(e.target.value)} />
        <input type="text" placeholder="Origin (optional)" value={origin} onChange={e => setOrigin(e.target.value)} />
        <button type="submit">Save Bean</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

export default AddBeanForm;