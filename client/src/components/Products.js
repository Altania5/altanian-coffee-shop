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
      const headers = { 'x-auth-token': token };
      const productsRes = await axios.get('/products', { headers });
      setProducts(productsRes.data);
      const inventoryRes = await axios.get('/inventory', { headers });
      setAllInventory(inventoryRes.data);
    } catch (error) {
      console.log('There was an error fetching the products!', error);
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
                    src={images[product.imageUrl.split('.')[0]] || images.default} 
                    alt={product.name}
                    className="product-card-image" 
                    loading="lazy"
                  />
                  {!inStock && (
                    <div className="stock-overlay">
                      <span className="stock-text">Out of Stock</span>
                    </div>
                  )}
                  <div className="product-category">
                    {product.category}
                  </div>
                </div>
                
                <div className="product-card-content">
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                  </div>
                  
                  <div className="product-footer">
                    <div className="product-price">
                      ${product.price.toFixed(2)}
                    </div>
                    
                    <div className="product-actions">
                      {product.canBeModified && inStock ? (
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
                          className={`product-btn add-btn ${!inStock ? 'disabled' : ''}`}
                          onClick={() => addToCart(product)} 
                          disabled={!inStock}
                        >
                          <span>{inStock ? 'Add to Cart' : 'Out of Stock'}</span>
                          <span className="btn-icon">{inStock ? '🛒' : '❌'}</span>
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