import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function SuggestedItemManager({ token }) {
  const [products, setProducts] = useState([]);
  const [suggestedProduct, setSuggestedProduct] = useState('');
  const [currentSuggested, setCurrentSuggested] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { 'x-auth-token': token };

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, suggestedRes] = await Promise.all([
        axios.get('/products', { headers }),
        axios.get('/settings/suggested-product', { headers })
      ]);
      setProducts(productsRes.data);
      if (suggestedRes.data) {
        setSuggestedProduct(suggestedRes.data._id);
        setCurrentSuggested(suggestedRes.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      const res = await axios.put('/settings/suggested-product', { productId: suggestedProduct }, { headers });
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