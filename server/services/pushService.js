const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription.model');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@altaniancoffee.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('Web Push VAPID keys not configured. Push notifications disabled.');
}

async function sendToSubscription(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      try {
        await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
      } catch (_) {}
    } else {
      console.error('Failed to send push:', error.message);
    }
  }
}

async function sendToUser(userId, payload) {
  try {
    const subs = await PushSubscription.find({ userId });
    await Promise.all(subs.map(s => sendToSubscription({ endpoint: s.endpoint, keys: s.keys }, payload)));
  } catch (e) {
    console.error('Error sending push to user:', e.message);
  }
}

async function broadcast(payload) {
  try {
    const subs = await PushSubscription.find();
    await Promise.all(subs.map(s => sendToSubscription({ endpoint: s.endpoint, keys: s.keys }, payload)));
  } catch (e) {
    console.error('Error broadcasting push:', e.message);
  }
}

module.exports = { sendToUser, broadcast, VAPID_PUBLIC };


