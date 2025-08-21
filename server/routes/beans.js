const router = require('express').Router();
const auth = require('../middleware/auth');
let Bean = require('../models/bean.model');

// @route   POST /beans/add
// @desc    Add a new bean
// @access  Private
router.post('/add', auth, async (req, res) => {
  try {
    const { name, roaster, origin } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Please enter a name for the bean.' });
    }
    const newBean = new Bean({
      name,
      roaster,
      origin,
      user: req.user
    });
    const savedBean = await newBean.save();
    res.json(savedBean);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /beans
// @desc    Get all beans for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const beans = await Bean.find({ user: req.user });
    res.json(beans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;