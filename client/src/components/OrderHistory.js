import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

function OrderHistory({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/myorders');
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching order history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) return <p>Loading order history...</p>;

  return (
    <div className="container">
      <h3>Your Order History</h3>
      {orders.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {orders.map(order => (
            <li key={order._id} className="order-item">
              <div>
                <strong>Order ID:</strong> {order._id}
              </div>
              <div>
                <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Total:</strong> ${order.totalAmount.toFixed(2)}
              </div>
              <div>
                <strong>Items:</strong>
                <ul>
                  {order.items.map(item => (
                    <li key={item._id}>
                      {item.productName} - {item.quantity} x ${item.productPrice.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no past orders.</p>
      )}
    </div>
  );
}

export default OrderHistory;