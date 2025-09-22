const router = require('express').Router();
const ownerAuth = require('../middleware/ownerAuth');
let PromoCode = require('../models/promoCode.model');

router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(), 
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (!promo) {
      return res.status(404).json({ msg: 'Invalid or expired promo code.' });
    }

    // Check usage limits
    if (promo.maxUsage && promo.usageCount >= promo.maxUsage) {
      return res.status(400).json({ msg: 'Promo code usage limit reached.' });
    }

    res.json({ 
      discountPercentage: promo.discountPercentage,
      promoId: promo._id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track promo code usage
router.post('/use', async (req, res) => {
  try {
    const { promoId } = req.body;
    
    if (!promoId) {
      return res.status(400).json({ msg: 'Promo ID is required.' });
    }

    const promo = await PromoCode.findById(promoId);
    if (!promo) {
      return res.status(404).json({ msg: 'Promo code not found.' });
    }

    // Increment usage count
    promo.usageCount += 1;
    await promo.save();

    res.json({ success: true, usageCount: promo.usageCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', ownerAuth, async (req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', ownerAuth, async (req, res) => {
  try {
    const { code, discountPercentage, expiresAt } = req.body;

    if (!code || !discountPercentage) {
      return res.status(400).json({ msg: 'Please enter a code and discount percentage.' });
    }

    const newPromoCode = new PromoCode({
      code: code.toUpperCase(),
      discountPercentage,
      expiresAt: expiresAt || null
    });

    const savedCode = await newPromoCode.save();
    res.json(savedCode);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: `A promo code named "${req.body.code}" already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;