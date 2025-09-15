const router = require('express').Router();
const auth = require('../middleware/auth');
let CoffeeLog = require('../models/coffeeLog.model');
const BeanBag = require('../models/beanBag.model');

// @route   POST /coffeelogs/add
// @desc    Add a new coffee log
// @access  Private
router.post('/add', auth, async (req, res) => {
  try {
    const { bean, bag, machine, grindSize, extractionTime, temperature, inWeight, outWeight, tasteMetExpectations, notes } = req.body;

    // Basic validation
    if (!bean || !machine || !grindSize || !extractionTime || !inWeight || !outWeight) {
      return res.status(400).json({ msg: 'Please fill out all required fields.' });
    }

    const newLog = new CoffeeLog({
      user: req.user,
      bean,
      bag: bag || undefined,
      machine,
      grindSize,
      extractionTime,
      temperature,
      inWeight,
      outWeight,
      tasteMetExpectations,
      notes
    });

    // If a bag is provided, decrement remaining grams and flag empty if needed
    if (bag) {
      const bagDoc = await BeanBag.findOne({ _id: bag, user: req.user });
      if (!bagDoc) {
        return res.status(400).json({ msg: 'Selected bag not found.' });
      }
      if (String(bagDoc.bean) !== String(bean)) {
        return res.status(400).json({ msg: 'Selected bag does not match the chosen bean.' });
      }
      // Subtract inWeight from bag
      bagDoc.remainingGrams = Math.max(0, (bagDoc.remainingGrams || 0) - (inWeight || 0));
      if (bagDoc.remainingGrams === 0) {
        bagDoc.isEmpty = true;
        bagDoc.closedAt = new Date();
      }
      await bagDoc.save();
    }

    const savedLog = await newLog.save();
    // Populate the bean details before sending back
    const populatedLog = await savedLog
      .populate('bean', 'name roaster')
      .populate('bag', 'bagSizeGrams remainingGrams isEmpty');
    res.json(populatedLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /coffeelogs
// @desc    Get all coffee logs for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const logs = await CoffeeLog.find({ user: req.user })
      .populate('bean', 'name roaster')
      .populate('bag', 'bagSizeGrams remainingGrams isEmpty')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;