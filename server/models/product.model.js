const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
  recipe: [{
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantityRequired: { type: Number, required: true }
  }],
  isAvailable: { type: Boolean, default: true },
  availabilityManuallySet: { type: Boolean, default: false },
  category: {
    type: String,
    required: true,
    enum: ['Iced Beverage', 'Hot Beverage', 'Shaken Beverage', 'Refresher']
  },
  canBeModified: { type: Boolean, default: false }
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;