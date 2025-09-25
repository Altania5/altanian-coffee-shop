import React, { useState } from 'react';
import api from '../../utils/api';

export default function NotificationManager() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      setStatus('Please provide both title and message.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/notifications/broadcast', { title, message });
      setStatus('Notification sent to all subscribers.');
      setTitle('');
      setMessage('');
    } catch (e) {
      setStatus('Failed to send notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Notification Manager</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        <button onClick={handleSend} disabled={loading}>{loading ? 'Sending…' : 'Send Broadcast'}</button>
        {status && <small>{status}</small>}
      </div>
    </div>
  );
}


