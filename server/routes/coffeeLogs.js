const router = require('express').Router();
const auth = require('../middleware/auth');
let CoffeeLog = require('../models/coffeeLog.model');

// @route   POST /coffeelogs/add
// @desc    Add a new coffee log
// @access  Private
router.post('/add', auth, async (req, res) => {
  try {
    const { bean, machine, grindSize, extractionTime, temperature, inWeight, outWeight, tasteMetExpectations, notes } = req.body;

    // Basic validation
    if (!bean || !machine || !grindSize || !extractionTime || !inWeight || !outWeight) {
      return res.status(400).json({ msg: 'Please fill out all required fields.' });
    }

    const newLog = new CoffeeLog({
      user: req.user,
      bean,
      machine,
      grindSize,
      extractionTime,
      temperature,
      inWeight,
      outWeight,
      tasteMetExpectations,
      notes
    });

    const savedLog = await newLog.save();
    // Populate the bean details before sending back
    const populatedLog = await savedLog.populate('bean', 'name roaster');
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
      .populate('bean', 'name roaster') // This replaces the bean ID with the bean's name and roaster
      .sort({ createdAt: -1 }); // Show the most recent logs first
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;