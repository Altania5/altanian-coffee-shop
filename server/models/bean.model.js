const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const beanSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  roaster: { type: String, trim: true },
  origin: { type: String, trim: true },
}, {
  timestamps: true,
});

const Bean = mongoose.model('Bean', beanSchema);

module.exports = Bean;