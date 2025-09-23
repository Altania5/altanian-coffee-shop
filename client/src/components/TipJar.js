import React, { useState } from 'react';
import api from '../utils/api';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? 
  loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) : 
  Promise.resolve(null);
const TIP_AMOUNTS = [1, 3, 5];

function TipJar({ user }) {
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTip = async (amount) => {
    setIsLoading(true);
    setMessage('');

    try {
      const stripe = await stripePromise;
      
      if (!stripe) {
        setMessage('Stripe is not configured. Please add your Stripe publishable key to the .env file.');
        setIsLoading(false);
        return;
      }
      
      const response = await api.post('/payments/create-tip-session', { amount });
      const session = response.data;

      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        setMessage(result.error.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Could not process tip.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomTip = (e) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (amount > 0) {
      handleTip(amount);
    }
  };

  return (
    <div className="home-card">
      <h3>Leave a Tip</h3>
      <div className="card-content">
        <p className="card-description">Enjoying my coffee? Consider leaving a tip to support my development and improve my business!</p>
        <div className="tip-amounts">
          {TIP_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => handleTip(amount)}
              className="tip-button"
              disabled={isLoading}
            >
              ${amount}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustomTip} className="tip-custom-form">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Or enter custom amount"
            className="tip-custom-input"
            step="0.01"
            min="0.01"
            disabled={isLoading}
          />
          <button type="submit" className="tip-custom-button" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Tip'}
          </button>
        </form>
        {message && <p className="tip-message">{message}</p>}
      </div>
    </div>
  );
}

export default TipJar;