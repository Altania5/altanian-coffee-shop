const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Product = require('./models/product.model');
const InventoryItem = require('./models/inventory.model');
const { checkProductAvailability } = require('./utils/productAvailability');

async function debugLatte() {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Find the latte product
    const latte = await Product.findOne({ name: /latte/i }).populate('recipe.item');
    
    if (!latte) {
      console.log('❌ No latte product found');
      return;
    }

    console.log('\n☕ LATTE PRODUCT DEBUG:');
    console.log('==================');
    console.log(`Name: ${latte.name}`);
    console.log(`ID: ${latte._id}`);
    console.log(`Current Availability: ${latte.isAvailable}`);
    console.log(`Manually Set: ${latte.availabilityManuallySet}`);
    console.log(`Recipe Items: ${latte.recipe.length}`);

    if (latte.recipe.length > 0) {
      console.log('\n📋 RECIPE INGREDIENTS:');
      for (let i = 0; i < latte.recipe.length; i++) {
        const recipeItem = latte.recipe[i];
        const ingredient = recipeItem.item;
        
        console.log(`\n${i + 1}. Recipe Item:`);
        console.log(`   Required Quantity: ${recipeItem.quantityRequired}`);
        
        if (ingredient) {
          console.log(`   Ingredient: ${ingredient.itemName || ingredient.name}`);
          console.log(`   ID: ${ingredient._id}`);
          console.log(`   Stock: ${ingredient.quantityInStock} ${ingredient.unit}`);
          console.log(`   Available: ${ingredient.isAvailable}`);
          console.log(`   Low Stock: ${ingredient.isLowStock}`);
        } else {
          console.log(`   ❌ INGREDIENT NOT FOUND (ID: ${recipeItem.item})`);
        }
      }
    }

    // Check availability calculation
    console.log('\n🔍 AVAILABILITY CALCULATION:');
    const { isAvailable, missingIngredients } = await checkProductAvailability(latte);
    console.log(`Calculated Availability: ${isAvailable}`);
    
    if (missingIngredients.length > 0) {
      console.log('\n❌ MISSING INGREDIENTS:');
      missingIngredients.forEach((missing, index) => {
        console.log(`${index + 1}. ${missing.name}`);
        console.log(`   Required: ${missing.required}`);
        console.log(`   Available: ${missing.available}`);
        console.log(`   Reason: ${missing.reason}`);
      });
    } else {
      console.log('✅ All ingredients are available');
    }

    // Check if ingredients exist in inventory
    console.log('\n📦 INVENTORY CHECK:');
    const allInventory = await InventoryItem.find();
    console.log(`Total inventory items: ${allInventory.length}`);
    
    const milkItems = allInventory.filter(item => 
      item.itemName && item.itemName.toLowerCase().includes('milk')
    );
    const espressoItems = allInventory.filter(item => 
      item.itemName && item.itemName.toLowerCase().includes('espresso')
    );
    
    console.log('\n🥛 MILK ITEMS:');
    milkItems.forEach(item => {
      console.log(`- ${item.itemName}: ${item.quantityInStock} ${item.unit} (Available: ${item.isAvailable})`);
    });
    
    console.log('\n☕ ESPRESSO ITEMS:');
    espressoItems.forEach(item => {
      console.log(`- ${item.itemName}: ${item.quantityInStock} ${item.unit} (Available: ${item.isAvailable})`);
    });

    // Try to fix the latte
    console.log('\n🔧 ATTEMPTING TO FIX LATTE:');
    
    // Update availability manually
    latte.isAvailable = true;
    latte.availabilityManuallySet = true;
    await latte.save();
    
    console.log('✅ Set latte as available and marked as manually set');
    
    // Verify the fix
    const updatedLatte = await Product.findById(latte._id);
    console.log(`Updated Availability: ${updatedLatte.isAvailable}`);
    console.log(`Manually Set: ${updatedLatte.availabilityManuallySet}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugLatte();
