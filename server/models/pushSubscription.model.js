const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pushSubscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now },
  userAgent: { type: String }
});

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
module.exports = PushSubscription;


