import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const PRODUCT_CATEGORIES = ['Iced Beverage', 'Hot Beverage', 'Shaken Beverage', 'Refresher'];

function ProductManager({ token }) {
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const [productsRes, inventoryRes] = await Promise.all([
                api.get('/products'),
                api.get('/inventory')
            ]);
            const productsData = Array.isArray(productsRes.data) ? productsRes.data : [];
            const inventoryData = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
            
            // Debug logging
            console.log('📦 Products fetched:', productsData);
            productsData.forEach(product => {
                console.log(`☕ ${product.name}: Available=${product.isAvailable}, ManuallySet=${product.availabilityManuallySet}`);
            });
            
            setProducts(productsData);
            setInventory(inventoryData);
        } catch (err) {
            console.error("Error fetching data:", err);
            // Ensure state remains arrays even on error
            setProducts([]);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSave = async (productToSave) => {
        const finalRecipe = Array.isArray(productToSave.recipe) 
            ? productToSave.recipe.filter(r => r.item && r.quantityRequired > 0)
            : [];
        const productData = { ...productToSave, recipe: finalRecipe };

        try {
            if (productData._id) {
                await api.put(`/products/update/${productData._id}`, productData);
            } else {
                await api.post('/products/add', productData);
            }
            setEditingProduct(null);
            fetchData();
        } catch (err) {
            alert('Error saving product: ' + (err.response?.data?.msg || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/delete/${id}`);
                fetchData();
            } catch (err) {
                alert('Error deleting product: ' + (err.response?.data?.msg || err.message));
            }
        }
    };

    const startNewProduct = () => {
        setEditingProduct({ 
            name: '', 
            description: '', 
            price: 0, 
            isAvailable: true, 
            recipe: [],
            category: 'Hot Beverage',
            canBeModified: false 
        });
    };

    if (loading) return <p>Loading products...</p>;

    if (editingProduct) {
        return <ProductForm product={editingProduct} inventory={inventory} onSave={handleSave} onCancel={() => setEditingProduct(null)} />;
    }

    const handleForceRefresh = () => {
        console.log('🔄 Force refreshing products...');
        fetchData();
    };

    return (
        <div className="container">
            <h3>Product Management</h3>
            <div style={{ marginBottom: '20px' }}>
                <button onClick={startNewProduct} style={{marginRight: '10px'}}>Add New Product</button>
                <button onClick={handleForceRefresh} style={{backgroundColor: '#17a2b8'}}>🔄 Refresh Data</button>
            </div>
            
            {/* Debug Panel */}
            <details style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔍 Debug Info</summary>
                <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                    <p><strong>Products Count:</strong> {products.length}</p>
                    {products.map(product => (
                        <div key={product._id} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f8f9fa' }}>
                            <strong>{product.name}:</strong><br/>
                            Raw isAvailable: <code>{JSON.stringify(product.isAvailable)}</code> ({typeof product.isAvailable})<br/>
                            Manually Set: <code>{JSON.stringify(product.availabilityManuallySet)}</code><br/>
                            Recipe Items: {product.recipe?.length || 0}
                        </div>
                    ))}
                </div>
            </details>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {products.map(product => {
                    // Robust availability check
                    const isAvailable = product.isAvailable === true || product.isAvailable === 'true' || product.isAvailable === 1;
                    const availabilityText = isAvailable ? 'Available' : 'Unavailable';
                    const availabilityColor = isAvailable ? '#28a745' : '#dc3545';
                    
                    console.log(`🎯 Rendering ${product.name}: Raw=${product.isAvailable}, Processed=${isAvailable}, Text=${availabilityText}`);
                    
                    return (
                        <li key={product._id} className="order-item">
                            <strong>{product.name}</strong> - ${product.price} 
                            <span style={{ color: availabilityColor, fontWeight: 'bold' }}>({availabilityText})</span>
                            <div style={{ marginTop: '10px' }}>
                                <button onClick={() => setEditingProduct(product)} style={{width: 'auto', marginRight: '10px'}}>Edit</button>
                                <button onClick={() => handleDelete(product._id)} style={{backgroundColor: '#dc3545', width: 'auto'}}>Delete</button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function ProductForm({ product, inventory, onSave, onCancel }) {
    // Transform the product data to handle populated recipe items
    const transformProductData = (productData) => {
        const transformed = { ...productData };
        
        // Convert populated recipe items to the format expected by the form
        if (Array.isArray(productData.recipe)) {
            transformed.recipe = productData.recipe.map(recipeItem => ({
                item: typeof recipeItem.item === 'object' ? recipeItem.item._id : recipeItem.item,
                quantityRequired: recipeItem.quantityRequired || 1
            }));
        } else {
            // Ensure recipe is always an array
            transformed.recipe = [];
        }
        
        return transformed;
    };
    
    const [formData, setFormData] = useState(transformProductData(product));
    
    // Debug logging
    useEffect(() => {
        console.log('ProductForm - Original product:', product);
        console.log('ProductForm - Transformed formData:', formData);
        console.log('ProductForm - Inventory:', inventory);
    }, [product, formData, inventory]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleRecipeChange = (index, field, value) => {
        if (!Array.isArray(formData.recipe)) {
            console.warn('Recipe is not an array:', formData.recipe);
            return;
        }
        const newRecipe = [...formData.recipe];
        if (newRecipe[index]) {
            newRecipe[index][field] = value;
            setFormData({ ...formData, recipe: newRecipe });
            console.log('Updated recipe:', newRecipe);
        } else {
            console.warn('Recipe index not found:', index, 'in recipe:', newRecipe);
        }
    };
    
    const addRecipeItem = () => {
        const currentRecipe = Array.isArray(formData.recipe) ? formData.recipe : [];
        const newRecipeItem = { item: '', quantityRequired: 1 };
        const newRecipe = [...currentRecipe, newRecipeItem];
        setFormData({ ...formData, recipe: newRecipe });
        console.log('Added recipe item:', newRecipeItem, 'New recipe:', newRecipe);
    };

    const removeRecipeItem = (index) => {
        if (!Array.isArray(formData.recipe)) return;
        const newRecipe = formData.recipe.filter((_, i) => i !== index);
        setFormData({ ...formData, recipe: newRecipe });
    };

    return (
        <div className="container">
            <h4>{formData._id ? 'Edit Product' : 'Add New Product'}</h4>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} required />
                <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required />
                <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} required step="0.01" />
                <input type="text" name="imageUrl" placeholder="Image Filename (e.g., latte.jpg)" value={formData.imageUrl} onChange={handleChange} />
                <label htmlFor="category">Category</label>
                <select id="category" name="category" value={formData.category} onChange={handleChange}>
                    {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <label>
                    <input type="checkbox" name="isAvailable" checked={formData.isAvailable} onChange={handleChange} style={{width: 'auto', marginRight: '10px'}} />
                    Available on Menu
                </label>
                <label>
                    <input type="checkbox" name="canBeModified" checked={formData.canBeModified} onChange={handleChange} style={{width: 'auto', marginRight: '10px'}} />
                    Can Be Modified
                </label>
                
                <hr />
                <h5>Recipe</h5>
                {Array.isArray(formData.recipe) && formData.recipe.length > 0 ? (
                    formData.recipe.map((recipeItem, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                            <select value={recipeItem.item || ''} onChange={(e) => handleRecipeChange(index, 'item', e.target.value)} required>
                                <option value="">Select Ingredient</option>
                                {inventory && Array.isArray(inventory) ? inventory.map(invItem => (
                                    <option key={invItem._id} value={invItem._id}>
                                        {invItem.itemName || invItem.name} ({invItem.unit})
                                    </option>
                                )) : null}
                            </select>
                            <input 
                                type="number" 
                                value={recipeItem.quantityRequired || 1} 
                                onChange={(e) => handleRecipeChange(index, 'quantityRequired', parseFloat(e.target.value) || 1)} 
                                style={{width: '80px'}}
                                min="0.1"
                                step="0.1"
                            />
                            <button type="button" onClick={() => removeRecipeItem(index)} style={{backgroundColor: '#dc3545', width: 'auto'}}>X</button>
                        </div>
                    ))
                ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No ingredients added yet. Click "Add Ingredient" to get started.</p>
                )}
                <button type="button" onClick={addRecipeItem} style={{backgroundColor: '#28a745'}}>Add Ingredient</button>
                <hr />

                <button type="submit">Save Product</button>
                <button type="button" onClick={onCancel} style={{backgroundColor: '#6c757d'}}>Cancel</button>
            </form>
        </div>
    )
}

export default ProductManager;