import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Handle unhandled promise rejections to prevent console errors
window.addEventListener('unhandledrejection', (event) => {
  // Suppress async response errors from browser extensions
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message channel closed')) {
    event.preventDefault();
    return;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Service worker registration disabled to fix fetch errors
console.log('Service worker registration disabled');