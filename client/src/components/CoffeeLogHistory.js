import React from 'react';

function CoffeeLogHistory({ logs }) {
  return (
    <div className="container">
      <h2>Your Coffee Log History</h2>
      {logs.length === 0 ? (
        <p>You haven't logged any coffee yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {logs.map(log => (
            <li key={log._id} className="order-item">
              <p><strong>Bean:</strong> {log.bean?.name} ({log.bean?.roaster})</p>
              {log.bag && (
                <p><strong>Bag:</strong> {log.bag.bagSizeGrams}g • {Math.max(0, log.bag.remainingGrams)}g left {log.bag.isEmpty ? '(empty)' : ''}</p>
              )}
              <p><strong>Date:</strong> {new Date(log.createdAt).toLocaleString()}</p>
              <p>
                <strong>Parameters:</strong> {log.inWeight}g in, {log.outWeight}g out,
                {log.extractionTime}s, grind @ {log.grindSize}
                {log.temperature ? `, ${log.temperature}°C` : ''}
              </p>
              <p><strong>Taste:</strong> {log.tasteMetExpectations ? '👍 Good' : '👎 Bad'}</p>
              {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CoffeeLogHistory;