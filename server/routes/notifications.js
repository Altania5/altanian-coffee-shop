const router = require('express').Router();
const auth = require('../middleware/auth');
const ownerAuth = require('../middleware/ownerAuth');
const PushSubscription = require('../models/pushSubscription.model');
const pushService = require('../services/pushService');

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: pushService.VAPID_PUBLIC || '' });
});

// Save/replace subscription for current user
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }
    await PushSubscription.updateOne(
      { endpoint },
      { userId: req.user.id, endpoint, keys, userAgent },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Subscribe error:', e);
    res.status(500).json({ success: false });
  }
});

// Broadcast notification (admin only)
router.post('/broadcast', ownerAuth, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }
    await pushService.broadcast({ title, message, data: { type: 'broadcast' } });
    res.json({ success: true });
  } catch (e) {
    console.error('Broadcast error:', e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;


