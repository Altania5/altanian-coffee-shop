import React, { useState } from 'react';
import Navbar from './Navbar';
import HomePage from '../pages/HomePage';
import OrderPage from '../pages/OrderPage';
import AdminPage from '../pages/AdminPage';
import CoffeeLogPage from '../pages/CoffeeLogPage';
import CheckoutPage from '../pages/CheckoutPage';

function AppLayout({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart(currentCart => {
      const existing = currentCart.find(item => item._id === product._id);
      if (existing) {
        return currentCart.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    setCart(currentCart => {
      // If the new quantity is 0 or less, remove the item
      if (newQuantity <= 0) {
        return currentCart.filter(item => item._id !== productId);
      }
      // Otherwise, update the quantity of the matching item
      return currentCart.map(item =>
        item._id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

    const handleSuccessfulCheckout = () => {
    setCart([]);
    setActiveTab('order'); // Go back to the order page
    alert('Order placed successfully!');
  };

  const handleLogout = () => {
    setCart([]);
    onLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'order':
        return <OrderPage user={user} cart={cart} setCart={setCart} addToCart={addToCart} updateCartQuantity={updateCartQuantity} onCheckout={() => setActiveTab('checkout')} />;
      case 'admin':
        return user.role === 'owner' ? <AdminPage user={user} /> : <HomePage user={user} />;
      case 'log':
        return <CoffeeLogPage user={user} />;
      case 'checkout':
        return <CheckoutPage user={user} cart={cart} onSuccessfulCheckout={handleSuccessfulCheckout} />;
      case 'home':
      default:
        return <HomePage user={user} />;
    }
  };

  return (
    <div>
      <Navbar
        user={user}
        onLogout={handleLogout}
        setActiveTab={setActiveTab}
        cartItemCount={cart.reduce((count, item) => count + item.quantity, 0)}
      />
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

export default AppLayout;