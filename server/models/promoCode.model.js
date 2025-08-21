const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const promoCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
}, {
  timestamps: true,
});

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode;