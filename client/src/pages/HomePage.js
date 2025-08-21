import React, { useState, useEffect } from 'react';
import axios from 'axios';
import images from '../assets/images';
import TipJar from '../components/TipJar';

function HomePage({ user }) {
  const [usualOrder, setUsualOrder] = useState(null);
  const [suggestedProduct, setSuggestedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'x-auth-token': user.token };
        const [usualResponse, suggestedResponse] = await Promise.all([
          axios.get('/orders/usual', { headers }),
          axios.get('/settings/suggested-product', { headers })
        ]);
        setUsualOrder(usualResponse.data);
        setSuggestedProduct(suggestedResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user.token) {
      fetchData();
    }
  }, [user.token]);

  return (
    <div className="home-grid">
      <div className="home-card">
        <h3>Your Usual</h3>
        {loading ? (
          <p>Loading your favorite order...</p>
        ) : usualOrder ? (
          <div className="card-content">
            <h4>{usualOrder.name}</h4>
            <p className="card-description">{usualOrder.description}</p>
            <p className="card-price">${usualOrder.price.toFixed(2)}</p>
            <button className="card-button">Order Again</button>
          </div>
        ) : (
          <p>You don't have a regular order yet. Place an order to see it here!</p>
        )}
      </div>

      <div className="home-card">
        <h3>Try Something New</h3>
        {loading ? (
          <p>Loading suggestion...</p>
        ) : suggestedProduct ? (
          <div className="card-content">
            <img 
              src={images[suggestedProduct.imageUrl.split('.')[0]] || images.default}
              alt={suggestedProduct.name} 
              className="suggestion-img"
            />
            <h4>{suggestedProduct.name}</h4>
            <p className="card-description">{suggestedProduct.description}</p>
          </div>
        ) : (
          <p>No suggestions at the moment.</p>
        )}
      </div>
      
      <TipJar user={user} />
    </div>
  );
}

export default HomePage;