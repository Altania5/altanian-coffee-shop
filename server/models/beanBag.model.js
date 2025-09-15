const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const beanBagSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	bean: { type: Schema.Types.ObjectId, ref: 'Bean', required: true },
	bagSizeGrams: { type: Number, required: true, min: 1 },
	remainingGrams: { type: Number, required: true, min: 0 },
	isEmpty: { type: Boolean, default: false },
	openedAt: { type: Date, default: Date.now },
	closedAt: { type: Date }
}, {
	timestamps: true,
});

// Keep remainingGrams within [0, bagSizeGrams]
beanBagSchema.pre('save', function(next) {
	if (this.remainingGrams < 0) {
		this.remainingGrams = 0;
	}
	if (this.remainingGrams > this.bagSizeGrams) {
		this.remainingGrams = this.bagSizeGrams;
	}
	this.isEmpty = this.remainingGrams <= 0 || this.isEmpty;
	if (this.isEmpty && !this.closedAt) {
		this.closedAt = new Date();
	}
	next();
});

const BeanBag = mongoose.model('BeanBag', beanBagSchema);

module.exports = BeanBag;

