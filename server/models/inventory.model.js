const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventoryItemSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  isAvailable: { type: Boolean, default: true }
}, {
  timestamps: true,
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;