const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const promoCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  maxUsage: { type: Number, default: null },
  usageCount: { type: Number, default: 0 },
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
});

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode;