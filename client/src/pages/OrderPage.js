import React from 'react';
import Cart from '../components/Cart';
import OrderHistory from '../components/OrderHistory';
import Products from '../components/Products';

function OrderPage({ user, cart, setCart, addToCart, updateCartQuantity, onCheckout }) {
  return (
    <div className="order-page-grid">
      <div>
        <Cart 
            cart={cart} 
            token={user.token} 
            setCart={setCart} 
            updateCartQuantity={updateCartQuantity}
            onCheckout={onCheckout}
        />
        <OrderHistory token={user.token} />
      </div>
      <div>
        <Products token={user.token} addToCart={addToCart} />
      </div>
    </div>
  );
}

export default OrderPage;