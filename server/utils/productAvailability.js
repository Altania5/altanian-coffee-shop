const Product = require('../models/product.model');
const InventoryItem = require('../models/inventory.model');

/**
 * Check if a product has sufficient ingredients in stock
 * @param {Object} product - Product object with populated recipe
 * @returns {Object} - { isAvailable: boolean, missingIngredients: Array }
 */
async function checkProductAvailability(product) {
  if (!product.recipe || product.recipe.length === 0) {
    return { isAvailable: true, missingIngredients: [] };
  }

  const missingIngredients = [];
  let isAvailable = true;

  for (const recipeItem of product.recipe) {
    const ingredient = recipeItem.item;
    const requiredQuantity = recipeItem.quantityRequired;

    if (!ingredient || !ingredient.isAvailable) {
      missingIngredients.push({
        name: ingredient?.itemName || 'Unknown ingredient',
        required: requiredQuantity,
        available: 0,
        reason: 'Ingredient not available'
      });
      isAvailable = false;
    } else if (ingredient.quantityInStock < requiredQuantity) {
      missingIngredients.push({
        name: ingredient.itemName,
        required: requiredQuantity,
        available: ingredient.quantityInStock,
        reason: 'Insufficient stock'
      });
      isAvailable = false;
    }
  }

  return { isAvailable, missingIngredients };
}

/**
 * Update product availability based on current inventory
 * @param {String} productId - Product ID to update
 * @param {Boolean} forceUpdate - Whether to override manually set availability
 * @returns {Object} - Updated product with availability status
 */
async function updateProductAvailability(productId, forceUpdate = false) {
  try {
    const product = await Product.findById(productId).populate('recipe.item');
    if (!product) {
      throw new Error('Product not found');
    }

    const { isAvailable, missingIngredients } = await checkProductAvailability(product);
    
    // Only update availability if it wasn't manually set or if force update is requested
    if (!product.availabilityManuallySet || forceUpdate) {
      product.isAvailable = isAvailable;
      await product.save();
    }

    return {
      product,
      isAvailable: product.isAvailable,
      calculatedAvailability: isAvailable,
      manuallySet: product.availabilityManuallySet,
      missingIngredients
    };
  } catch (error) {
    console.error('Error updating product availability:', error);
    throw error;
  }
}

/**
 * Update all products' availability based on current inventory
 * @returns {Object} - Summary of updates
 */
async function updateAllProductsAvailability() {
  try {
    const products = await Product.find().populate('recipe.item');
    const results = {
      totalProducts: products.length,
      updatedProducts: 0,
      nowAvailable: 0,
      nowUnavailable: 0,
      productsWithIssues: []
    };

    for (const product of products) {
      const { isAvailable, missingIngredients } = await checkProductAvailability(product);
      const wasAvailable = product.isAvailable;
      
      // Only update availability if it wasn't manually set
      if (!product.availabilityManuallySet && product.isAvailable !== isAvailable) {
        product.isAvailable = isAvailable;
        await product.save();
        results.updatedProducts++;
        
        if (isAvailable) {
          results.nowAvailable++;
        } else {
          results.nowUnavailable++;
        }
      }

      if (!isAvailable && missingIngredients.length > 0) {
        results.productsWithIssues.push({
          productId: product._id,
          productName: product.name,
          missingIngredients
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error updating all products availability:', error);
    throw error;
  }
}

/**
 * Get products that are unavailable due to missing ingredients
 * @returns {Array} - Array of products with availability issues
 */
async function getUnavailableProducts() {
  try {
    const products = await Product.find({ isAvailable: false }).populate('recipe.item');
    const unavailableProducts = [];

    for (const product of products) {
      const { missingIngredients } = await checkProductAvailability(product);
      if (missingIngredients.length > 0) {
        unavailableProducts.push({
          product,
          missingIngredients
        });
      }
    }

    return unavailableProducts;
  } catch (error) {
    console.error('Error getting unavailable products:', error);
    throw error;
  }
}

/**
 * Check if inventory item is used in any products
 * @param {String} inventoryItemId - Inventory item ID
 * @returns {Array} - Array of products that use this ingredient
 */
async function getProductsUsingIngredient(inventoryItemId) {
  try {
    const products = await Product.find({
      'recipe.item': inventoryItemId
    }).populate('recipe.item');

    return products;
  } catch (error) {
    console.error('Error getting products using ingredient:', error);
    throw error;
  }
}

module.exports = {
  checkProductAvailability,
  updateProductAvailability,
  updateAllProductsAvailability,
  getUnavailableProducts,
  getProductsUsingIngredient
};
