const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  birthday: { type: Date, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  stripeCustomerId: { type: String },
  savedPaymentMethods: [{
    paymentMethodId: String,
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
    isDefault: { type: Boolean, default: false }
  }],
  role: {
    type: String,
    enum: ['customer', 'owner'],
    default: 'customer'
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;