import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import CustomizationModal from './CustomizationModal';
import images from '../assets/images';

function Products({ token, addToCart }) {
  const [products, setProducts] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [allInventory, setAllInventory] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch products (no auth required)
      const productsRes = await api.get('/products');
      const productsData = productsRes.data;
      
      console.log('📦 Products fetched for Order Page:', productsData);
      productsData.forEach(product => {
        console.log(`☕ ${product.name}: Available=${product.isAvailable} (${typeof product.isAvailable}), Recipe=${product.recipe?.length || 0} items`);
      });
      
      setProducts(productsData);
      
      // Only try to fetch inventory if we have a token
      if (token) {
        try {
          const inventoryRes = await api.get('/inventory');
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
    // Debug logging
    console.log(`🔍 Checking stock for ${product.name}:`, {
      isAvailable: product.isAvailable,
      recipeLength: product.recipe?.length || 0,
      recipe: product.recipe
    });
    
    // First check if product is marked as available
    const productAvailable = product.isAvailable === true || product.isAvailable === 'true' || product.isAvailable === 1;
    if (!productAvailable) {
      console.log(`❌ ${product.name} marked as unavailable`);
      return false;
    }
    
    // If no recipe, product is available
    if (!product.recipe || product.recipe.length === 0) {
      console.log(`✅ ${product.name} has no recipe requirements`);
      return true;
    }
    
    // Check each ingredient
    const allIngredientsAvailable = product.recipe.every(ingredient => {
      if (!ingredient.item) {
        console.log(`❌ ${product.name} missing ingredient reference`);
        return false;
      }
      
      const ingredientAvailable = ingredient.item.isAvailable === true || ingredient.item.isAvailable === 'true' || ingredient.item.isAvailable === 1;
      const stockQuantity = ingredient.item.quantityInStock || ingredient.item.quantity || 0;
      const requiredQuantity = ingredient.quantityRequired || 0;
      
      const hasEnoughStock = stockQuantity >= requiredQuantity;
      
      console.log(`  - ${ingredient.item.itemName || ingredient.item.name}: Need ${requiredQuantity}, Have ${stockQuantity}, Available: ${ingredientAvailable}, Has Stock: ${hasEnoughStock}`);
      
      return ingredientAvailable && hasEnoughStock;
    });
    
    console.log(`${allIngredientsAvailable ? '✅' : '❌'} ${product.name} stock check result: ${allIngredientsAvailable}`);
    return allIngredientsAvailable;
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
          token={token}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Products;