import React from 'react';
import InventoryManager from '../components/InventoryManager';
import ProductManager from '../components/ProductManager';
import SuggestedItemManager from '../components/SuggestedItemManager';
import PromoCodeManager from '../components/PromoCodeManager';

function AdminPage({ user }) {
  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user.firstName}. Here you can manage products and view statistics.</p>
      <hr />
      <PromoCodeManager token={user.token} />
      <SuggestedItemManager token={user.token} />
      <ProductManager token={user.token} />
      <InventoryManager token={user.token} />
    </div>
  );
}

export default AdminPage;