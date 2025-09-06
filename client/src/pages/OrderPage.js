import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cart from '../components/Cart';
import OrderHistory from '../components/OrderHistory';
import Products from '../components/Products';

function OrderPage({ user, cart, setCart, addToCart, updateCartQuantity, removeFromCart, onCheckout }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Fetch products and inventory for cart functionality
  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL || '';
        const headers = user.token ? { 'x-auth-token': user.token } : {};
        
        // Fetch products
        const productsRes = await axios.get(`${baseURL}/products`, 
          Object.keys(headers).length > 0 ? { headers } : {});
        setProducts(productsRes.data);
        
        // Fetch inventory if user is authenticated
        if (user.token) {
          try {
            const inventoryRes = await axios.get(`${baseURL}/inventory`, { headers });
            setInventory(inventoryRes.data);
          } catch (inventoryError) {
            console.log('Could not fetch inventory:', inventoryError.response?.status);
            setInventory([]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, [user.token]);

  return (
    <div className="order-page-grid">
      <div>
        <Cart 
            cart={cart} 
            token={user.token} 
            setCart={setCart} 
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            onCheckout={onCheckout}
            inventory={inventory}
            products={products}
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