import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function PromoCodeManager({ token }) {
  const [codes, setCodes] = useState([]);
  const [newCode, setNewCode] = useState({ code: '', discountPercentage: '', expiresAt: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = { 'x-auth-token': token };

  const fetchCodes = useCallback(async () => {
    try {
      const res = await axios.get('/promocodes', { headers });
      setCodes(res.data);
    } catch (err) {
      console.error("Error fetching promo codes:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleChange = (e) => {
    setNewCode({ ...newCode, [e.target.name]: e.target.value });
  };

  const handleAddCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/promocodes/add', newCode, { headers });
      setCodes([res.data, ...codes]);
      setNewCode({ code: '', discountPercentage: '', expiresAt: '' }); // Reset form
      alert('Promo code created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.msg || 'Error adding code.');
    }
  };

  if (loading) return <p>Loading promo codes...</p>;

  return (
    <div className="container">
      <h3>Promo Code Management</h3>
      <form onSubmit={handleAddCode} style={{ marginBottom: '20px' }}>
        <h4>Create New Promo Code</h4>
        <input type="text" name="code" placeholder="Code (e.g., SAVE10)" value={newCode.code} onChange={handleChange} required />
        <input type="number" name="discountPercentage" placeholder="Discount %" value={newCode.discountPercentage} onChange={handleChange} required min="1" max="100" />
        <label htmlFor="expiresAt">Expiration Date (Optional)</label>
        <input type="date" id="expiresAt" name="expiresAt" value={newCode.expiresAt} onChange={handleChange} style={{ width: 'calc(100% - 24px)' }}/>
        <button type="submit">Create Code</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
      
      <h4>Existing Codes</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {codes.map(code => (
          <li key={code._id} className="order-item">
            <strong>{code.code}</strong> - {code.discountPercentage}% Off
            <p style={{margin: '5px 0', color: '#666'}}>
              Status: {code.isActive ? 'Active' : 'Inactive'}
              {code.expiresAt && ` | Expires: ${new Date(code.expiresAt).toLocaleDateString()}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PromoCodeManager;