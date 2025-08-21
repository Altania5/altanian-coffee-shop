import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OrderHistory({ token }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false); // --- POINT 4: Add state for expansion ---

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const headers = { 'x-auth-token': token };
                const response = await axios.get('/orders/myorders', { headers });
                setOrders(response.data);
            } catch (err) {
                console.error("Error fetching order history:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchOrders();
        }
    }, [token]);

    if (loading) {
        return <p>Loading order history...</p>;
    }

    // --- POINT 4: Logic to show all or just the last 5 orders ---
    const displayedOrders = isExpanded ? orders : orders.slice(0, 5);

    return (
        <div className="container">
            <h2>Your Order History</h2>
            {orders.length === 0 ? (
                <p>You haven't placed any orders yet.</p>
            ) : (
                <>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {displayedOrders.map(order => (
                            <li key={order._id} className="order-item">
                                <p><strong>Order ID:</strong> {order._id}</p>
                                <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                                <ul>
                                    {order.products.map(item => (
                                        <li key={item._id || item.product?._id}>
                                            {item.product ? (
                                                `${item.product.name} - $${item.product.price.toFixed(2)} x ${item.quantity}`
                                            ) : (
                                                '[Product no longer available]'
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <p><strong>Total: ${order.total.toFixed(2)}</strong></p>
                            </li>
                        ))}
                    </ul>
                    {/* --- POINT 4: Show toggle button if there are more than 5 orders --- */}
                    {orders.length > 5 && (
                        <button onClick={() => setIsExpanded(!isExpanded)} style={{width: 'auto'}}>
                            {isExpanded ? 'Show Less' : `Show ${orders.length - 5} More`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

export default OrderHistory;