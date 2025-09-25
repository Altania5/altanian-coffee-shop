import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Get VAPID public key from server
    const { data } = await api.get('/notifications/vapid-public-key');
    const publicKey = data.publicKey;
    if (!publicKey) {
      alert('Push not available (missing server keys).');
      return;
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Save to server
    await api.post('/notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      userAgent: navigator.userAgent
    });

    alert('Push notifications enabled!');
  } catch (e) {
    console.error('Push subscription failed:', e);
    alert('Failed to enable push notifications.');
  }
}


