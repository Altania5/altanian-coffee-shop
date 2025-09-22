import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from '../components/Footer';
import HomePage from '../pages/HomePage';
import OrderPage from '../pages/OrderPage';
import AdminPage from '../pages/AdminPage';
import CoffeeLogPage from '../pages/CoffeeLogPage';
import CustomerForm from '../components/CustomerForm';
import Checkout from '../components/Checkout';
import OrderSuccess from '../components/OrderSuccess';
import LoyaltyDashboard from '../components/LoyaltyDashboard';
import NotificationCenter from '../components/NotificationCenter';

function AppLayout({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'customer', 'payment', 'success'
  const [customerInfo, setCustomerInfo] = useState(null);
  const [orderResult, setOrderResult] = useState(null);

  // Handle adding items to cart with customizations
  const addToCart = (cartItem) => {
    setCart(currentCart => {
      // Generate unique ID for customized items
      const itemId = cartItem.id || `${cartItem.productId || cartItem._id}-${Date.now()}-${Math.random()}`;
      
      // Ensure the item has the proper structure
      const newItem = {
        ...cartItem,
        id: itemId,
        // If it's a direct product add (no customizations), ensure it has the right fields
        productId: cartItem.productId || cartItem._id,
        quantity: cartItem.quantity || 1,
        price: cartItem.price || 0, // Ensure price is set
        estimatedPrice: cartItem.estimatedPrice || cartItem.price || 0
      };
      
      return [...currentCart, newItem];
    });
  };

  // Handle updating cart item quantities
  const updateCartQuantity = (itemId, newQuantity) => {
    setCart(currentCart => {
      if (newQuantity <= 0) {
        return currentCart.filter(item => (item.id || item._id) !== itemId);
      }
      return currentCart.map(item =>
        (item.id || item._id) === itemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  // Handle removing items from cart
  const removeFromCart = (itemId) => {
    setCart(currentCart => 
      currentCart.filter(item => (item.id || item._id) !== itemId)
    );
  };

  // Start checkout process
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    setActiveTab('checkout');
    setCheckoutStep('customer');
  };

  // Handle customer form completion
  const handleCustomerFormNext = (customerData) => {
    setCustomerInfo(customerData);
    setCheckoutStep('payment');
  };

  // Handle successful payment
  const handlePaymentSuccess = (result) => {
    setOrderResult(result);
    setCheckoutStep('success');
    setCart([]); // Clear cart after successful order
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    // Stay on payment page, error will be shown in checkout component
  };

  // Handle starting a new order
  const handleNewOrder = () => {
    setActiveTab('order');
    setCheckoutStep('cart');
    setCustomerInfo(null);
    setOrderResult(null);
  };

  // Handle order tracking
  const handleViewOrder = (orderNumber, email) => {
    // In a real app, this would navigate to an order tracking page
    window.open(`/order/${orderNumber}?email=${encodeURIComponent(email)}`, '_blank');
  };

  // Go back to previous step
  const handleBackToPreviousStep = () => {
    switch (checkoutStep) {
      case 'customer':
        setActiveTab('order');
        setCheckoutStep('cart');
        break;
      case 'payment':
        setCheckoutStep('customer');
        break;
      default:
        setActiveTab('order');
        setCheckoutStep('cart');
    }
  };

  const handleLogout = () => {
    setCart([]);
    setCheckoutStep('cart');
    setCustomerInfo(null);
    setOrderResult(null);
    onLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'order':
        return (
          <OrderPage 
            user={user} 
            cart={cart} 
            setCart={setCart} 
            addToCart={addToCart} 
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            onCheckout={handleCheckout}
          />
        );
      case 'checkout':
        switch (checkoutStep) {
          case 'customer':
            return (
              <CustomerForm
                onNext={handleCustomerFormNext}
                onBack={handleBackToPreviousStep}
                user={user}
              />
            );
          case 'payment':
            return (
              <Checkout
                cart={cart}
                customerInfo={customerInfo}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onBack={handleBackToPreviousStep}
                token={user.token}
              />
            );
          case 'success':
            return (
              <OrderSuccess
                order={orderResult?.order}
                paymentMethod={orderResult?.paymentMethod || 'card'}
                paymentIntent={orderResult?.paymentIntent}
                lowStockAlert={orderResult?.lowStockAlert}
                onNewOrder={handleNewOrder}
                onViewOrder={handleViewOrder}
                token={user.token}
              />
            );
          default:
            return (
              <OrderPage 
                user={user} 
                cart={cart} 
                setCart={setCart} 
                addToCart={addToCart} 
                updateCartQuantity={updateCartQuantity}
                removeFromCart={removeFromCart}
                onCheckout={handleCheckout}
              />
            );
        }
      case 'admin':
        // Only allow users with 'owner' role to access admin page
        return user.role === 'owner' ? <AdminPage user={user} /> : <HomePage user={user} />;
      case 'log':
        return <CoffeeLogPage user={user} />;
      case 'loyalty':
        return <LoyaltyDashboard user={user} token={user.token} />;
      case 'home':
      default:
        return <HomePage user={user} />;
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        onLogout={handleLogout}
        setActiveTab={setActiveTab}
        cartItemCount={cart.reduce((count, item) => count + item.quantity, 0)}
      />
      <main className="main-content">
        {renderContent()}
      </main>
      <Footer />
      <NotificationCenter />
    </div>
  );
}

export default AppLayout;