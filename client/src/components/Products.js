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
    <div className="container">
      <h2>Menu</h2>
      {customizingProduct && (
        <CustomizationModal 
          product={customizingProduct}
          inventory={allInventory}
          onAddToCart={handleAddToCart}
          onCancel={() => setCustomizingProduct(null)}
        />
      )}

      {products.length === 0 ? (
        <p>No products on the menu yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {products.map(product => {
            const inStock = isProductInStock(product);
            return (
              <li key={product._id} className="product-item">
                <img 
                  src={images[product.imageUrl.split('.')[0]] || images.default} 
                  alt={product.name}
                  className="product-image" 
                />
                <div>
                  <strong>{product.name}</strong> - ${product.price.toFixed(2)}
                  <p style={{color: '#666', margin: '5px 0'}}>{product.description}</p>
                </div>
                {product.canBeModified && inStock ? (
                  <button onClick={() => setCustomizingProduct(product)} style={{ width: 'auto', marginRight: '10px' }}>
                    Customize
                  </button>
                ) : (
                  <button 
                    onClick={() => addToCart(product)} 
                    disabled={!inStock}
                    style={{ 
                      width: 'auto', 
                      cursor: inStock ? 'pointer' : 'not-allowed',
                      backgroundColor: inStock ? 'var(--primary-color)' : '#ccc'
                    }}
                  >
                    {inStock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Products;