import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PRODUCT_CATEGORIES = ['Iced Beverage', 'Hot Beverage', 'Shaken Beverage', 'Refresher'];

function ProductManager({ token }) {
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    const headers = { 'x-auth-token': token };

    const fetchData = useCallback(async () => {
        try {
            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            const [productsRes, inventoryRes] = await Promise.all([
                axios.get(`${baseURL}/products`, { headers }),
                axios.get(`${baseURL}/inventory`, { headers })
            ]);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
            setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
        } catch (err) {
            console.error("Error fetching data:", err);
            // Ensure state remains arrays even on error
            setProducts([]);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSave = async (productToSave) => {
        const finalRecipe = Array.isArray(productToSave.recipe) 
            ? productToSave.recipe.filter(r => r.item && r.quantityRequired > 0)
            : [];
        const productData = { ...productToSave, recipe: finalRecipe };

        try {
            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            if (productData._id) {
                await axios.put(`${baseURL}/products/update/${productData._id}`, productData, { headers });
            } else {
                await axios.post(`${baseURL}/products/add`, productData, { headers });
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
                const baseURL = process.env.REACT_APP_API_BASE_URL || '';
                await axios.delete(`${baseURL}/products/delete/${id}`, { headers });
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

    return (
        <div className="container">
            <h3>Product Management</h3>
            <button onClick={startNewProduct} style={{marginBottom: '20px'}}>Add New Product</button>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {products.map(product => (
                    <li key={product._id} className="order-item">
                        <strong>{product.name}</strong> - ${product.price} ({product.isAvailable ? 'Available' : 'Unavailable'})
                        <div style={{ marginTop: '10px' }}>
                            <button onClick={() => setEditingProduct(product)} style={{width: 'auto', marginRight: '10px'}}>Edit</button>
                            <button onClick={() => handleDelete(product._id)} style={{backgroundColor: '#dc3545', width: 'auto'}}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ProductForm({ product, inventory, onSave, onCancel }) {
    const [formData, setFormData] = useState(product);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleRecipeChange = (index, field, value) => {
        if (!Array.isArray(formData.recipe)) return;
        const newRecipe = [...formData.recipe];
        if (newRecipe[index]) {
            newRecipe[index][field] = value;
            setFormData({ ...formData, recipe: newRecipe });
        }
    };
    
    const addRecipeItem = () => {
        const currentRecipe = Array.isArray(formData.recipe) ? formData.recipe : [];
        setFormData({ ...formData, recipe: [...currentRecipe, { item: '', quantityRequired: 1 }] });
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
                {Array.isArray(formData.recipe) ? formData.recipe.map((recipeItem, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <select value={recipeItem.item} onChange={(e) => handleRecipeChange(index, 'item', e.target.value)} required>
                            <option value="">Select Ingredient</option>
                            {inventory && Array.isArray(inventory) ? inventory.map(invItem => <option key={invItem._id} value={invItem._id}>{invItem.itemName || invItem.name} ({invItem.unit})</option>) : null}
                        </select>
                        <input type="number" value={recipeItem.quantityRequired} onChange={(e) => handleRecipeChange(index, 'quantityRequired', e.target.value)} style={{width: '80px'}}/>
                        <button type="button" onClick={() => removeRecipeItem(index)} style={{backgroundColor: '#dc3545', width: 'auto'}}>X</button>
                    </div>
                )) : null}
                <button type="button" onClick={addRecipeItem} style={{backgroundColor: '#28a745'}}>Add Ingredient</button>
                <hr />

                <button type="submit">Save Product</button>
                <button type="button" onClick={onCancel} style={{backgroundColor: '#6c757d'}}>Cancel</button>
            </form>
        </div>
    )
}

export default ProductManager;