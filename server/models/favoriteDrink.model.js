const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favoriteDrinkSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  productImage: String,
  basePrice: { type: Number, default: 0 },
  customizations: { type: Schema.Types.Mixed, default: {} },
  customizationHash: { type: String, required: true },
  notes: String,
  lastOrderedAt: Date,
  timesOrdered: { type: Number, default: 0 }
}, {
  timestamps: true
});

favoriteDrinkSchema.index({ user: 1, product: 1, customizationHash: 1 }, { unique: true });

favoriteDrinkSchema.methods.toClient = function() {
  return {
    id: this._id,
    product: this.product,
    productName: this.productName,
    productImage: this.productImage,
    basePrice: this.basePrice,
    customizations: this.customizations || {},
    lastOrderedAt: this.lastOrderedAt,
    timesOrdered: this.timesOrdered,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('FavoriteDrink', favoriteDrinkSchema);
