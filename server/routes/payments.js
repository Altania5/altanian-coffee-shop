const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
let PromoCode = require('../models/promoCode.model');
const auth = require('../middleware/auth');
const User = require('../models/user.model');

const findActivePromoCode = async (promoCode) => {
  if (!promoCode) return null;
  return await PromoCode.findOne({
    code: promoCode.toUpperCase(),
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  });
};

router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { cart, promoCode } = req.body;
    const user = await User.findById(req.user.id);

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: { message: "Cannot create a payment for an empty cart." }});
    }

    const line_items = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    
    const activePromo = await findActivePromoCode(promoCode);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/order`,
      customer_email: user.username,
      automatic_tax: {
        enabled: true,
      },
      discounts: activePromo ? [{ coupon: activePromo.stripeCouponId }] : [],
      allow_promotion_codes: true,
    });

    res.json({ id: session.id });

  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.post('/create-tip-session', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: { message: 'A tip amount is required.' } });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tip for Altanian Coffee',
            },
            unit_amount: Math.round(amount * 100), // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}?tip=success`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}`,
      customer_email: user.username,
    });

    res.json({ id: session.id });
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});


module.exports = router;