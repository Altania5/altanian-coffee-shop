const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const beanSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  roaster: { type: String, trim: true },
  origin: { type: String, trim: true },
  roastDate: { type: Date, required: true },
  roastLevel: { 
    type: String, 
    enum: ['light', 'light-medium', 'medium', 'medium-dark', 'dark'],
    default: 'medium'
  },
  processMethod: {
    type: String,
    enum: ['washed', 'natural', 'honey', 'semi-washed', 'other'],
    default: 'washed'
  },
  notes: { type: String, trim: true, maxlength: 300 },
  isActive: { type: Boolean, default: true } // to track if bean is finished
}, {
  timestamps: true,
});

const Bean = mongoose.model('Bean', beanSchema);

module.exports = Bean;