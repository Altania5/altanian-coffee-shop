const router = require('express').Router();
const auth = require('../middleware/auth');
const BeanBag = require('../models/beanBag.model');

// @route   POST /beanbags
// @desc    Create a new bag for a bean
// @access  Private
router.post('/', auth, async (req, res) => {
	try {
		const { bean, bagSizeGrams } = req.body;
		if (!bean || !bagSizeGrams) {
			return res.status(400).json({ msg: 'bean and bagSizeGrams are required.' });
		}
		const bag = new BeanBag({
			user: req.user.id,
			bean,
			bagSizeGrams,
			remainingGrams: bagSizeGrams
		});
		const saved = await bag.save();
		res.json(saved);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// @route   GET /beanbags?bean=<id>&includeEmpty=false
// @desc    List user's bags optionally filtered by bean and empty state
// @access  Private
router.get('/', auth, async (req, res) => {
	try {
		const { bean, includeEmpty } = req.query;
		const filter = { user: req.user.id };
		if (bean) filter.bean = bean;
		if (!includeEmpty || includeEmpty === 'false') filter.isEmpty = { $ne: true };
		const bags = await BeanBag.find(filter).sort({ createdAt: -1 });
		res.json(bags);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// @route   PATCH /beanbags/:id/empty
// @desc    Mark a bag as empty
// @access  Private
router.patch('/:id/empty', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const bag = await BeanBag.findOne({ _id: id, user: req.user.id });
		if (!bag) return res.status(404).json({ msg: 'Bag not found' });
		bag.remainingGrams = 0;
		bag.isEmpty = true;
		bag.closedAt = new Date();
		const saved = await bag.save();
		res.json(saved);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// @route   PATCH /beanbags/:id/grams
// @desc    Adjust remaining grams (positive or negative)
// @access  Private
router.patch('/:id/grams', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const { delta } = req.body;
		if (typeof delta !== 'number') {
			return res.status(400).json({ msg: 'delta must be a number.' });
		}
		const bag = await BeanBag.findOne({ _id: id, user: req.user.id });
		if (!bag) return res.status(404).json({ msg: 'Bag not found' });
		bag.remainingGrams = (bag.remainingGrams || 0) + delta;
		if (bag.remainingGrams <= 0) {
			bag.remainingGrams = 0;
			bag.isEmpty = true;
			bag.closedAt = new Date();
		}
		const saved = await bag.save();
		res.json(saved);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;

