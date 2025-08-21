const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const coffeeLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bean: { type: Schema.Types.ObjectId, ref: 'Bean', required: true },
  machine: {
    type: String,
    enum: ['Meraki', 'Breville'],
    required: true
  },
  grindSize: { type: Number, required: true },
  extractionTime: { type: Number, required: true }, // in seconds
  temperature: { type: Number }, // in Celsius or Fahrenheit
  inWeight: { type: Number, required: true }, // in grams
  outWeight: { type: Number, required: true }, // in grams
  tasteMetExpectations: { type: Boolean, required: true },
  notes: { type: String, trim: true }
}, {
  timestamps: true, // This automatically adds createdAt and updatedAt
});

const CoffeeLog = mongoose.model('CoffeeLog', coffeeLogSchema);

module.exports = CoffeeLog;