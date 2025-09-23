const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Product = require('./models/product.model');
const InventoryItem = require('./models/inventory.model');
const { checkProductAvailability, updateAllProductsAvailability } = require('./utils/productAvailability');

async function checkAvailability() {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Get all products with populated recipes
    const products = await Product.find().populate('recipe.item');
    console.log(`\n📦 Found ${products.length} products:`);

    for (const product of products) {
      console.log(`\n☕ ${product.name}:`);
      console.log(`   Available: ${product.isAvailable}`);
      console.log(`   Recipe items: ${product.recipe.length}`);
      
      if (product.recipe.length > 0) {
        for (const recipeItem of product.recipe) {
          const ingredient = recipeItem.item;
          if (ingredient) {
            console.log(`   - ${ingredient.itemName || ingredient.name}: ${ingredient.quantityInStock} ${ingredient.unit} (Available: ${ingredient.isAvailable})`);
          } else {
            console.log(`   - Missing ingredient reference`);
          }
        }
        
        // Check actual availability
        const { isAvailable, missingIngredients } = await checkProductAvailability(product);
        console.log(`   Actual availability: ${isAvailable}`);
        if (missingIngredients.length > 0) {
          console.log(`   Missing ingredients:`);
          missingIngredients.forEach(missing => {
            console.log(`     - ${missing.name}: need ${missing.required}, have ${missing.available} (${missing.reason})`);
          });
        }
      }
    }

    // Update all product availability
    console.log('\n🔄 Updating all product availability...');
    const results = await updateAllProductsAvailability();
    console.log('Update results:', results);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAvailability();
