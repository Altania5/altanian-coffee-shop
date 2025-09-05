import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CustomizationModal from './CustomizationModal';
import images from '../assets/images';

function Products({ token, addToCart }) {
  const [products, setProducts] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [allInventory, setAllInventory] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      // Products endpoint doesn't require auth, but send headers anyway
      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const headers = token ? { 'x-auth-token': token } : {};
      const productsRes = await axios.get(`${baseURL}/products`, Object.keys(headers).length > 0 ? { headers } : {});
      setProducts(productsRes.data);
      
      // Only try to fetch inventory if we have a token
      if (token) {
        try {
          const inventoryRes = await axios.get(`${baseURL}/inventory`, { headers });
          setAllInventory(inventoryRes.data);
        } catch (inventoryError) {
          console.log('Could not fetch inventory (authentication required):', inventoryError.response?.status);
          setAllInventory([]); // Set empty inventory if auth fails
        }
      } else {
        setAllInventory([]); // No token, no inventory
      }
    } catch (error) {
      console.log('There was an error fetching the products!', error);
      if (error.response?.status === 401) {
        console.log('Authentication failed - user may need to log in');
      }
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const isProductInStock = (product) => {
    if (!product.isAvailable) {
      return false;
    }
    if (!product.recipe || product.recipe.length === 0) {
      return true;
    }
    return product.recipe.every(ingredient => {
      return ingredient.item && ingredient.item.isAvailable && ingredient.item.quantity >= ingredient.quantityRequired;
    });
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    setCustomizingProduct(null);
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h2 className="products-title">Our Menu ☕</h2>
        <p className="products-subtitle">Handcrafted with love, served with passion</p>
      </div>
      
      {customizingProduct && (
        <CustomizationModal 
          product={customizingProduct}
          inventory={allInventory}
          onAddToCart={handleAddToCart}
          onCancel={() => setCustomizingProduct(null)}
        />
      )}

      {products.length === 0 ? (
        <div className="empty-menu">
          <div className="empty-menu-icon">📋</div>
          <p>No products on the menu yet.</p>
          <p className="empty-subtitle">Check back soon for delicious offerings!</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product, index) => {
            const inStock = isProductInStock(product);
            return (
              <div 
                key={product._id} 
                className={`product-card ${!inStock ? 'out-of-stock' : ''}`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="product-image-container">
                  <img 
                    src={images[product.imageUrl?.split?.('.')?.[0]] || images.default} 
                    alt={product.name || 'Product'}
                    className="product-card-image" 
                    loading="lazy"
                    onError={(e) => { e.target.src = images.default; }}
                  />
                  {!inStock && (
                    <div className="stock-overlay">
                      <span className="stock-text">Out of Stock</span>
                    </div>
                  )}
                  <div className="product-category">
                    {product.category || 'General'}
                  </div>
                </div>
                
                <div className="product-card-content">
                  <div className="product-info">
                    <h3 className="product-name">{product.name || 'Unknown Product'}</h3>
                    <p className="product-description">{product.description || 'No description available'}</p>
                  </div>
                  
                  <div className="product-footer">
                    <div className="product-price">
                      ${Number(product.price || 0).toFixed(2)}
                    </div>
                    
                    <div className="product-actions">
                      {/* Always show both customize and add buttons for available items */}
                      {inStock ? (
                        <>
                          <button 
                            className="product-btn customize-btn"
                            onClick={() => setCustomizingProduct(product)}
                          >
                            <span>Customize</span>
                            <span className="btn-icon">🎨</span>
                          </button>
                          <button 
                            className="product-btn add-btn"
                            onClick={() => addToCart(product)}
                          >
                            <span>Add</span>
                            <span className="btn-icon">➕</span>
                          </button>
                        </>
                      ) : (
                        <button 
                          className="product-btn add-btn disabled"
                          disabled={true}
                        >
                          <span>Out of Stock</span>
                          <span className="btn-icon">❌</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {inStock && (
                  <div className="product-hover-effect">
                    <div className="hover-text">Click to add!</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Products;