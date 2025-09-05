import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function SuggestedItemManager({ token }) {
  const [products, setProducts] = useState([]);
  const [suggestedProduct, setSuggestedProduct] = useState('');
  const [currentSuggested, setCurrentSuggested] = useState(null);
  const [loading, setLoading] = useState(true);


  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const authHeaders = { 'x-auth-token': token };
      const [productsRes, suggestedRes] = await Promise.all([
        axios.get(`${baseURL}/products`),
        axios.get(`${baseURL}/settings/suggested-product`, { headers: authHeaders })
      ]);
      setProducts(productsRes.data);
      if (suggestedRes.data) {
        setSuggestedProduct(suggestedRes.data._id);
        setCurrentSuggested(suggestedRes.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!token) {
      alert('Authentication required');
      return;
    }
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const res = await axios.put(`${baseURL}/settings/suggested-product`, { productId: suggestedProduct }, { headers: { 'x-auth-token': token } });
      setCurrentSuggested(res.data);
      alert('Suggested item updated successfully!');
    } catch (err) {
      alert('Error updating suggested item: ' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) return <p>Loading suggestion manager...</p>;

  return (
    <div className="container">
      <h3>Manage Suggested Item</h3>
      <p>
        Current Suggestion: <strong>{currentSuggested ? currentSuggested.name : 'None'}</strong>
      </p>
      <select value={suggestedProduct} onChange={(e) => setSuggestedProduct(e.target.value)}>
        <option value="">-- Select a Product --</option>
        {products.map(p => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>
      <button onClick={handleSave} style={{marginTop: '10px'}}>Save Suggested Item</button>
    </div>
  );
}

export default SuggestedItemManager;