import React, { useState, useEffect } from 'react';

function CustomerForm({ onNext, onBack, existingCustomer = null, user = null }) {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize with user data if logged in
  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    } else if (existingCustomer) {
      setCustomerInfo(existingCustomer);
    }
  }, [user, existingCustomer]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (customerInfo.phone && !/^[\d\s\-\(\)\+\.]+$/.test(customerInfo.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      
      // Clean up phone number format
      const cleanedInfo = {
        ...customerInfo,
        name: customerInfo.name.trim(),
        email: customerInfo.email.trim().toLowerCase(),
        phone: customerInfo.phone.trim()
      };
      
      setTimeout(() => {
        onNext(cleanedInfo);
        setLoading(false);
      }, 300); // Small delay for UX
    }
  };

  // Format phone number as user types
  const handlePhoneChange = (value) => {
    // Remove all non-numeric characters
    const numeric = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    let formatted = numeric;
    if (numeric.length >= 6) {
      formatted = `(${numeric.slice(0, 3)}) ${numeric.slice(3, 6)}-${numeric.slice(6, 10)}`;
    } else if (numeric.length >= 3) {
      formatted = `(${numeric.slice(0, 3)}) ${numeric.slice(3)}`;
    }
    
    handleInputChange('phone', formatted);
  };

  return (
    <div className="customer-form-container">
      <div className="customer-form-header">
        <button className="back-btn" onClick={onBack} disabled={loading}>
          ← Back to Cart
        </button>
        <h2 className="form-title">Customer Information</h2>
        <p className="form-subtitle">Please provide your information to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="customer-form">
        {/* Name Field */}
        <div className="form-group">
          <label htmlFor="customer-name" className="form-label">
            Full Name <span className="required">*</span>
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            maxLength={100}
            autoComplete="name"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="customer-email" className="form-label">
            Email Address <span className="required">*</span>
          </label>
          <input
            id="customer-email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
            className={`form-input ${errors.email ? 'error' : ''}`}
            maxLength={150}
            autoComplete="email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
          <small className="form-help">We'll send your order confirmation to this email</small>
        </div>

        {/* Phone Field */}
        <div className="form-group">
          <label htmlFor="customer-phone" className="form-label">
            Phone Number <span className="optional">(optional)</span>
          </label>
          <input
            id="customer-phone"
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
            className={`form-input ${errors.phone ? 'error' : ''}`}
            maxLength={14}
            autoComplete="tel"
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
          <small className="form-help">Optional - for order updates and pickup notifications</small>
        </div>

        {/* User Account Info */}
        {user && (
          <div className="account-info">
            <div className="info-card">
              <span className="info-icon">👤</span>
              <div className="info-content">
                <p className="info-title">Logged in as {user.username}</p>
                <p className="info-subtitle">This order will be saved to your account</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="privacy-notice">
          <p>
            <span className="privacy-icon">🔒</span>
            Your information is secure and will only be used for order processing and communication.
          </p>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="continue-btn"
            disabled={loading}
          >
            {loading ? (
              <span>
                <span className="loading-spinner"></span>
                Processing...
              </span>
            ) : (
              <span>
                Continue to Payment
                <span className="continue-icon">→</span>
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CustomerForm;
