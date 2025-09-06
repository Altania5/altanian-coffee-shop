const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventoryItemSchema = new Schema({
  // Basic item information
  itemName: { type: String, required: true, trim: true },
  name: { type: String, trim: true }, // Alias for backward compatibility
  itemType: { type: String, required: true, trim: true }, // Syrup, Milk, Coffee Beans, etc.
  category: { type: String, trim: true }, // Alias for backward compatibility
  
  // Quantity and availability
  quantityInStock: { type: Number, required: true, default: 0 },
  quantity: { type: Number }, // Alias for backward compatibility
  unit: { type: String, required: true, trim: true }, // ml, grams, pieces, etc.
  
  // Pricing
  costPerUnit: { type: Number, default: 0 },
  pricePerUnitCharge: { type: Number, default: 0 }, // For add-on pricing
  
  // Stock management
  lowStockThreshold: { type: Number, default: 10 },
  isAvailable: { type: Boolean, default: true },
  
  // Additional fields
  supplierInfo: { type: String, trim: true },
  notes: { type: String, trim: true },
  
  // Auto-calculated fields
  isLowStock: { type: Boolean, default: false }
}, {
  timestamps: true,
});

// Pre-save middleware to maintain backward compatibility and calculate low stock
inventoryItemSchema.pre('save', function(next) {
  // Maintain backward compatibility
  if (!this.name && this.itemName) {
    this.name = this.itemName;
  }
  if (!this.itemName && this.name) {
    this.itemName = this.name;
  }
  if (!this.category && this.itemType) {
    this.category = this.itemType;
  }
  if (!this.itemType && this.category) {
    this.itemType = this.category;
  }
  if (!this.quantity && this.quantityInStock !== undefined) {
    this.quantity = this.quantityInStock;
  }
  if (!this.quantityInStock && this.quantity !== undefined) {
    this.quantityInStock = this.quantity;
  }
  
  // Calculate low stock status
  this.isLowStock = this.quantityInStock <= this.lowStockThreshold;
  
  next();
});

// Instance methods
inventoryItemSchema.methods.deductQuantity = function(amount, reason = 'order') {
  if (this.quantityInStock < amount) {
    throw new Error(`Insufficient stock. Available: ${this.quantityInStock}, Requested: ${amount}`);
  }
  
  const previousQuantity = this.quantityInStock;
  this.quantityInStock -= amount;
  this.quantity = this.quantityInStock; // Maintain compatibility
  this.isLowStock = this.quantityInStock <= this.lowStockThreshold;
  
  return {
    previousQuantity,
    newQuantity: this.quantityInStock,
    deducted: amount,
    reason
  };
};

inventoryItemSchema.methods.addQuantity = function(amount, reason = 'restock') {
  const previousQuantity = this.quantityInStock;
  this.quantityInStock += amount;
  this.quantity = this.quantityInStock; // Maintain compatibility
  this.isLowStock = this.quantityInStock <= this.lowStockThreshold;
  
  return {
    previousQuantity,
    newQuantity: this.quantityInStock,
    added: amount,
    reason
  };
};

// Static methods
inventoryItemSchema.statics.getLowStockItems = function() {
  return this.find({ isLowStock: true, isAvailable: true });
};

inventoryItemSchema.statics.getByType = function(itemType) {
  return this.find({ 
    $or: [
      { itemType: itemType },
      { category: itemType }
    ],
    isAvailable: true 
  });
};

// Create compound index for efficient queries
inventoryItemSchema.index({ itemType: 1, isAvailable: 1 });
inventoryItemSchema.index({ isLowStock: 1 });
inventoryItemSchema.index({ itemName: 1 });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;
