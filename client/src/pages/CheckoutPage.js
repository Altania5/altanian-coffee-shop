import React, { useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? 
  loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) : 
  Promise.resolve(null);

function CheckoutPage({ user, cart, onSuccessfulCheckout }) {
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const initialTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError('');

    try {
      const stripe = await stripePromise;
      
      if (!stripe) {
        setError('Stripe is not configured. Please add your Stripe publishable key to the .env file.');
        setIsLoading(false);
        return;
      }
      const headers = { 'x-auth-token': user.token };
      
      const response = await axios.post('/payments/create-checkout-session', { cart, promoCode }, { headers });
      const session = response.data;

      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccessfulCheckout();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not proceed to checkout.');
    }
    
    setIsLoading(false);
  };
  
  return (
    <div className="container">
      <h2>Checkout</h2>
      <div className="order-summary">
        <h4>Order Summary</h4>
        <ul>
          {cart.map(item => (
            <li key={item._id}>{item.name} x {item.quantity} - ${(item.price * item.quantity).toFixed(2)}</li>
          ))}
        </ul>
        <p><strong>Subtotal: ${initialTotal.toFixed(2)}</strong></p>
        <p style={{color: '#666', fontSize: '0.9em'}}>Discounts, taxes, and shipping calculated at next step.</p>
      </div>

      <div className="promo-section">
        <input 
            type="text" 
            placeholder="Promo Code" 
            value={promoCode} 
            onChange={(e) => setPromoCode(e.target.value)} 
        />
      </div>

      {error && <p style={{color: 'red'}}>{error}</p>}
      
      <button onClick={handleCheckout} disabled={isLoading || cart.length === 0}>
        {isLoading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );
}

export default CheckoutPage;