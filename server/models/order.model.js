const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Order Item Schema - represents each item in an order
const orderItemSchema = new Schema({
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  productName: { type: String, required: true }, // Snapshot for order history
  productPrice: { type: Number, required: true }, // Base price snapshot
  quantity: { type: Number, required: true, min: 1 },
  
  // Detailed customizations with ingredient tracking
  customizations: {
    size: {
      name: String,
      priceModifier: { type: Number, default: 0 }
    },
    extraShots: {
      quantity: { type: Number, default: 0 },
      pricePerShot: { type: Number, default: 0 },
      ingredientUsed: { type: Schema.Types.ObjectId, ref: 'InventoryItem' }
    },
    syrup: {
      inventoryId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      price: { type: Number, default: 0 }
    },
    milk: {
      inventoryId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      price: { type: Number, default: 0 }
    },
    toppings: [{
      inventoryId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      price: { type: Number, default: 0 }
    }],
    coldFoam: {
      added: { type: Boolean, default: false },
      price: { type: Number, default: 0 }
    },
    temperature: String, // Hot, Iced, etc.
    specialInstructions: String
  },
  
  // Calculated values
  itemTotalPrice: { type: Number, required: true }, // Total for this line item (quantity * configured price)
  
  // Inventory tracking for this specific item
  inventoryDeductions: [{
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantityDeducted: Number,
    reason: String // 'base_recipe', 'customization', etc.
  }]
});

// Main Order Schema
const orderSchema = new Schema({
  // Order identification
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => 'AC' + Date.now().toString().slice(-8) // AC12345678
  },
  
  // Customer information
  customer: {
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // null for guest orders
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String
  },
  
  // Order items
  items: [orderItemSchema],
  
  // Pricing
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  tip: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Promo code tracking
  promoCode: {
    code: String,
    discountPercentage: Number,
    appliedAt: Date
  },

  loyaltyAwarded: { type: Boolean, default: false },

  // Order status and tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment information
  payment: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    method: String, // 'stripe', 'cash', etc.
    stripePaymentIntentId: String,
    stripeChargeId: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number
  },
  
  // Fulfillment
  fulfillment: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    estimatedReadyTime: Date,
    actualReadyTime: Date,
    pickedUpAt: Date,
    // For delivery (future feature)
    address: String,
    deliveryInstructions: String,
    deliveredAt: Date
  },
  
  // Special notes and instructions
  notes: String,
  specialInstructions: String,
  
  // Admin fields
  assignedBarista: { type: Schema.Types.ObjectId, ref: 'User' },
  prepStartedAt: Date,
  
  // Analytics and tracking
  source: {
    type: String,
    enum: ['website', 'mobile', 'phone', 'walk-in'],
    default: 'website'
  },
  
  // Inventory snapshot - what was deducted for this order
  inventorySnapshot: [{
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantityBefore: Number,
    quantityDeducted: Number,
    quantityAfter: Number
  }]
}, {
  timestamps: true,
});

// Indexes for performance
// orderNumber index is already created by unique: true
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual for estimated pickup time (15-20 minutes from now)
orderSchema.virtual('estimatedPickupTime').get(function() {
  if (this.fulfillment.estimatedReadyTime) {
    return this.fulfillment.estimatedReadyTime;
  }
  const now = new Date();
  return new Date(now.getTime() + (17 * 60 * 1000)); // 17 minutes average
});

// Pre-save middleware to calculate totals and generate order number
orderSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.itemTotalPrice, 0);
  
  // Calculate total amount
  this.totalAmount = this.subtotal + this.tax + this.tip - this.discount;
  
  // Set estimated ready time if not set
  if (!this.fulfillment.estimatedReadyTime && this.status === 'confirmed') {
    const baseTime = 15; // 15 minutes base
    const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const additionalTime = Math.floor(itemCount / 3) * 2; // +2 min per 3 items
    const totalMinutes = Math.min(baseTime + additionalTime, 30); // Max 30 minutes
    
    this.fulfillment.estimatedReadyTime = new Date(Date.now() + (totalMinutes * 60 * 1000));
  }
  
  next();
});

// Instance methods
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

orderSchema.methods.canBeRefunded = function() {
  return this.payment.status === 'completed' && 
         ['completed', 'cancelled'].includes(this.status);
};

orderSchema.methods.getStatusDisplay = function() {
  const statusMap = {
    'pending': 'Order Received',
    'confirmed': 'Order Confirmed',
    'preparing': 'Being Prepared',
    'ready': 'Ready for Pickup',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return statusMap[this.status] || this.status;
};

// Static methods
orderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ status })
    .populate('customer.user', 'firstName lastName')
    .populate('items.product')
    .sort({ createdAt: -1 });
};

orderSchema.statics.getTodaysOrders = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate('customer.user', 'firstName lastName')
    .populate('items.product')
    .sort({ createdAt: -1 });
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
