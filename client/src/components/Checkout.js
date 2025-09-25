import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import api from '../utils/api';
import RewardRedemption from './RewardRedemption';
import PromoCodeInput from './PromoCodeInput';
import './Checkout.css';

// Initialize Stripe with error handling
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// Card styling
const cardStyle = {
  style: {
    base: {
      color: '#2C1810',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      lineHeight: '24px',
      backgroundColor: 'transparent',
      '::placeholder': {
        color: '#8B6F4D',
      },
    },
    invalid: {
      color: '#CD5C5C',
      iconColor: '#CD5C5C',
    },
    complete: {
      color: '#28a745',
    },
  },
  hidePostalCode: true,
};

function CheckoutForm({ cart, customerInfo, onPaymentSuccess, onPaymentError, onBack, token }) {
  const stripe = useStripe();
  const elements = useElements();
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardForm, setShowCardForm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'cash'
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [tip, setTip] = useState(0);
  const [tipOption, setTipOption] = useState('custom'); // 'none', '15', '18', '20', 'custom'
  const [selectedReward, setSelectedReward] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  useEffect(() => {
    if (token && paymentMethod === 'card') {
      api.get('/orders/payment-methods')
        .then(res => {
          const methods = res.data?.paymentMethods || [];
          setSavedCards(methods);
          if (methods.length > 0) {
            const defaultCard = methods.find(m => m.isDefault) || methods[0];
            setSelectedCard(defaultCard.paymentMethodId);
            setShowCardForm(false);
          } else {
            setShowCardForm(true);
          }
        })
        .catch(() => {
          setSavedCards([]);
          setShowCardForm(true);
        });
    }
  }, [token, paymentMethod]);

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => {
    const price = Number(item.estimatedPrice || item.price || 0);
    return acc + price * (item.quantity || 1);
  }, 0);
  
  // Calculate discount from reward
  const calculateDiscount = (reward, subtotal) => {
    switch (reward.discountType) {
      case 'percentage':
        return subtotal * (reward.discountValue / 100);
      case 'fixed':
        return Math.min(reward.discountValue, subtotal);
      case 'free_item':
        // For free items, we'll need to handle this differently in the order processing
        return 0;
      default:
        return 0;
    }
  };

  // Calculate discounts
  const rewardDiscount = selectedReward ? calculateDiscount(selectedReward, subtotal) : 0;
  const promoDiscount = appliedPromo ? (subtotal * appliedPromo.discountPercentage / 100) : 0;
  const totalDiscount = rewardDiscount + promoDiscount;
  
  const tax = Math.round((subtotal - totalDiscount) * 0.0875 * 100) / 100; // 8.75% tax
  const total = subtotal + tax + tip - totalDiscount;

  // Handle reward selection
  const handleRewardSelected = (reward) => {
    setSelectedReward(reward);
  };

  // Handle clearing reward
  const handleClearReward = () => {
    setSelectedReward(null);
  };

  // Handle promo code application
  const handlePromoApplied = (promoData) => {
    setAppliedPromo(promoData);
  };

  // Handle promo code removal
  const handlePromoRemoved = () => {
    setAppliedPromo(null);
  };

  // Handle tip selection
  const handleTipChange = (option) => {
    setTipOption(option);
    switch (option) {
      case 'none':
        setTip(0);
        break;
      case '15':
        setTip(Math.round(subtotal * 0.15 * 100) / 100);
        break;
      case '18':
        setTip(Math.round(subtotal * 0.18 * 100) / 100);
        break;
      case '20':
        setTip(Math.round(subtotal * 0.20 * 100) / 100);
        break;
      case 'custom':
        // Keep current tip value
        break;
      default:
        setTip(0);
    }
  };

  // Handle custom tip input
  const handleCustomTipChange = (value) => {
    const tipValue = Math.max(0, parseFloat(value) || 0);
    setTip(Math.round(tipValue * 100) / 100);
    setTipOption('custom');
  };

  const handleSavePaymentMethod = async () => {
    try {
      setLoading(true);
      const setupIntentRes = await api.post('/orders/payment-methods/setup-intent');
      const clientSecret = setupIntentRes.data?.clientSecret;
      if (!clientSecret) {
        throw new Error('Failed to initialize payment setup');
      }

      const cardElement = elements.getElement(CardElement);
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo?.name,
            email: customerInfo?.email
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to save payment method');
      }

      await api.post('/orders/payment-methods', {
        paymentMethodId: setupIntent.payment_method,
        setDefault: savedCards.length === 0
      });

      const cardRes = await api.get('/orders/payment-methods');
      const methods = cardRes.data?.paymentMethods || [];
      setSavedCards(methods);
      setSelectedCard(setupIntent.payment_method);
      setShowCardForm(false);
      setSuccessMessage('Card saved successfully!');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  const isUsingNewCard = showCardForm || savedCards.length === 0;

  // Submit payment
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      const orderData = {
        items: cart,
        customer: customerInfo,
        tip,
        discount: totalDiscount,
        rewardId: selectedReward ? selectedReward._id : undefined,
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        promoId: appliedPromo ? appliedPromo.promoId : undefined,
        notes: specialInstructions.trim() || undefined,
        source: 'website'
      };

      if (paymentMethod === 'card') {
        let paymentMethodId = selectedCard;

        if (isUsingNewCard) {
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            throw new Error('Please enter your card details.');
          }

          const { error, paymentMethod: stripePaymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          paymentMethodId = stripePaymentMethod.id;
        }

        if (!paymentMethodId) {
          throw new Error('Select or enter a payment method.');
        }

        const response = await api.post('/orders', {
          ...orderData,
          paymentMethodId
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Order creation failed');
        }

        onPaymentSuccess({
          order: response.data.order,
          paymentIntent: response.data.paymentIntent,
          lowStockAlert: response.data.lowStockAlert
        });

      } else {
        const response = await api.post('/orders', orderData);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Order creation failed');
        }

        onPaymentSuccess({
          order: response.data.order,
          lowStockAlert: response.data.lowStockAlert,
          paymentMethod: 'cash'
        });
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message);
      onPaymentError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <button className="back-btn" onClick={onBack} disabled={loading}>
          ← Back to Cart
        </button>
        <h2 className="checkout-title">Checkout</h2>
      </div>

      <form onSubmit={handleSubmit} className="checkout-form">
        {/* Order Summary */}
        <div className="checkout-section">
          <h3 className="section-title">📋 Order Summary</h3>
          <div className="order-summary">
            {cart.map((item, index) => {
              const itemPrice = item.estimatedPrice || item.price || 0;
              return (
                <div key={item.id || index} className="order-item">
                  <div className="order-item-info">
                    <span className="item-name">{item.name || `Item ${index + 1}`}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                  <span className="item-total">${(itemPrice * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Information */}
        <div className="checkout-section">
          <h3 className="section-title">👤 Customer Information</h3>
          <div className="customer-info">
            <p><strong>Name:</strong> {customerInfo.name}</p>
            <p><strong>Email:</strong> {customerInfo.email}</p>
            {customerInfo.phone && <p><strong>Phone:</strong> {customerInfo.phone}</p>}
          </div>
        </div>

        {/* Tip Selection */}
        <div className="checkout-section">
          <h3 className="section-title">💰 Add Tip</h3>
          <div className="tip-options">
            <label className={`tip-option ${tipOption === 'none' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="tip"
                value="none"
                checked={tipOption === 'none'}
                onChange={() => handleTipChange('none')}
              />
              <span>No Tip</span>
            </label>
            <label className={`tip-option ${tipOption === '15' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="tip"
                value="15"
                checked={tipOption === '15'}
                onChange={() => handleTipChange('15')}
              />
              <span>15% (${Math.round(subtotal * 0.15 * 100) / 100})</span>
            </label>
            <label className={`tip-option ${tipOption === '18' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="tip"
                value="18"
                checked={tipOption === '18'}
                onChange={() => handleTipChange('18')}
              />
              <span>18% (${Math.round(subtotal * 0.18 * 100) / 100})</span>
            </label>
            <label className={`tip-option ${tipOption === '20' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="tip"
                value="20"
                checked={tipOption === '20'}
                onChange={() => handleTipChange('20')}
              />
              <span>20% (${Math.round(subtotal * 0.20 * 100) / 100})</span>
            </label>
          </div>
          <div className="custom-tip">
            <label htmlFor="custom-tip-input">Custom Tip Amount:</label>
            <div className="tip-input-group">
              <span className="currency-symbol">$</span>
              <input
                id="custom-tip-input"
                type="number"
                min="0"
                step="0.01"
                value={tipOption === 'custom' ? tip : ''}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                placeholder="0.00"
                className="tip-input"
              />
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="checkout-section">
          <h3 className="section-title">📝 Special Instructions</h3>
          <textarea
            className="special-instructions-input"
            placeholder="Any special requests for your order? (e.g., pickup time, allergies, etc.)"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <div className="char-count">
            {specialInstructions.length}/300
          </div>
        </div>

        {/* Promo Code */}
        <PromoCodeInput
          onPromoApplied={handlePromoApplied}
          onPromoRemoved={handlePromoRemoved}
          appliedPromo={appliedPromo}
          token={token}
        />

        {/* Reward Redemption */}
        {token && (
          <RewardRedemption
            user={{ token }}
            onRewardSelected={handleRewardSelected}
            selectedReward={selectedReward}
            onClearReward={handleClearReward}
          />
        )}

        {/* Payment Method */}
        <div className="checkout-section">
          <h3 className="section-title">💳 Payment Method</h3>
          <div className="payment-method-selection">
            {savedCards.length > 0 && (
              <div className="saved-cards">
                <h4>Saved Cards</h4>
                <div className="saved-card-list">
                  {savedCards.map(card => (
                    <label key={card.paymentMethodId} className={`saved-card-option ${selectedCard === card.paymentMethodId ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="saved-card"
                        value={card.paymentMethodId}
                        checked={selectedCard === card.paymentMethodId}
                        onChange={() => {
                          setSelectedCard(card.paymentMethodId);
                          setShowCardForm(false);
                        }}
                      />
                      <span className="card-brand">{card.brand?.toUpperCase() || 'CARD'}</span>
                      <span className="card-last4">•••• {card.last4}</span>
                      <span className="card-exp">Exp {card.expMonth}/{card.expYear}</span>
                      {card.isDefault && <span className="card-default">Default</span>}
                    </label>
                  ))}
                </div>
                <button type="button" className="add-new-card-btn" onClick={() => setShowCardForm(true)}>
                  Use a different card
                </button>
              </div>
            )}

            {(showCardForm || savedCards.length === 0) && (
              <div className="card-element-container">
                <CardElement 
                  options={cardStyle}
                  className="stripe-card-element"
                />
                <button type="button" className="save-card-btn" onClick={handleSavePaymentMethod} disabled={loading}>
                  {loading ? 'Saving…' : 'Save card for future orders'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Error */}
        {paymentError && (
          <div className="payment-error">
            <span className="error-icon">⚠️</span>
            {paymentError}
          </div>
        )}

        {/* Total */}
        <div className="checkout-total">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>Tax (8.75%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {tip > 0 && (
            <div className="total-row">
              <span>Tip:</span>
              <span>${tip.toFixed(2)}</span>
            </div>
          )}
          {rewardDiscount > 0 && (
            <div className="total-row discount-row">
              <span>Reward Discount ({selectedReward?.name}):</span>
              <span>-${rewardDiscount.toFixed(2)}</span>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="total-row discount-row">
              <span>Promo Discount ({appliedPromo?.code}):</span>
              <span>-${promoDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="total-row final-total">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="place-order-btn"
          disabled={(paymentMethod === 'card' && ((!stripe) || (!isUsingNewCard && !selectedCard))) || loading}
        >
          {loading ? (
            <span className="loading-content">
              <span className="loading-spinner"></span>
              <span>Processing...</span>
            </span>
          ) : (
            <span className="button-content">
              <span className="button-text">
                {paymentMethod === 'card' 
                  ? `Pay $${total.toFixed(2)} 💳` 
                  : `Place Order - Pay $${total.toFixed(2)} in Store`}
              </span>
              <span className="submit-icon">🚀</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

// Main Checkout component with Stripe wrapper
function Checkout({ cart, customerInfo, onPaymentSuccess, onPaymentError, onBack, token }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        cart={cart}
        customerInfo={customerInfo}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        onBack={onBack}
        token={token}
      />
    </Elements>
  );
}

export default Checkout;
