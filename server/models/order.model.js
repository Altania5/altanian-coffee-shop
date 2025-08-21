const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  products: [{
      product: { type: Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 }
  }],
  total: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false }
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;