const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const settingSchema = new Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    enum: ['suggestedProduct']
  },
  value: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  }
}, {
  timestamps: true,
});

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;