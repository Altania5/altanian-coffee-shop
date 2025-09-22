import React, { useState } from 'react';
import api from '../utils/api';
import './PromoCodeInput.css';

function PromoCodeInput({ onPromoApplied, onPromoRemoved, appliedPromo, token }) {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    
    if (!promoCode.trim()) {
      setError('Please enter a promo code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/promocodes/verify', {
        code: promoCode.trim().toUpperCase()
      });

      if (response.data.discountPercentage) {
        const promoData = {
          code: promoCode.trim().toUpperCase(),
          discountPercentage: response.data.discountPercentage,
          promoId: response.data.promoId,
          appliedAt: new Date()
        };
        
        onPromoApplied(promoData);
        setSuccess(`Promo code applied! ${response.data.discountPercentage}% discount`);
        setPromoCode('');
      } else {
        setError('Invalid promo code');
      }
    } catch (error) {
      console.error('Promo code error:', error);
      setError(error.response?.data?.msg || 'Invalid or expired promo code');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromo = () => {
    onPromoRemoved();
    setError('');
    setSuccess('');
  };

  return (
    <div className="promo-code-section">
      <h3 className="section-title">🎟️ Promo Code</h3>
      
      {!appliedPromo ? (
        <form onSubmit={handleApplyPromo} className="promo-form">
          <div className="promo-input-group">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="promo-input"
              maxLength={20}
              disabled={loading}
            />
            <button
              type="submit"
              className="apply-promo-btn"
              disabled={loading || !promoCode.trim()}
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                'Apply'
              )}
            </button>
          </div>
          
          {error && (
            <div className="promo-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {success && (
            <div className="promo-success">
              <span className="success-icon">✅</span>
              {success}
            </div>
          )}
        </form>
      ) : (
        <div className="applied-promo">
          <div className="promo-info">
            <span className="promo-code">{appliedPromo.code}</span>
            <span className="promo-discount">{appliedPromo.discountPercentage}% OFF</span>
          </div>
          <button
            onClick={handleRemovePromo}
            className="remove-promo-btn"
            title="Remove promo code"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default PromoCodeInput;
