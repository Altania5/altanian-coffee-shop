const router = require('express').Router();
const ownerAuth = require('../middleware/ownerAuth');
let Setting = require('../models/setting.model');

router.get('/suggested-product', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'suggestedProduct' }).populate('value');
    if (setting) {
      res.json(setting.value);
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/suggested-product', ownerAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ msg: 'Product ID is required.' });
    }
    
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: 'suggestedProduct' },
      { value: productId },
      { new: true, upsert: true }
    ).populate('value');

    res.json(updatedSetting.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;