import React, { useState } from 'react';
import Login from '../components/Login';
import Register from '../components/Register';
import { ToastProvider } from '../context/ToastContext';

function LoginPage({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <ToastProvider>
      <div className="login-page">
        <div className="app-header">
          <div className="app-title">Altanian Coffee</div>
          <div className="app-subtitle">Welcome back! Sign in to continue your coffee journey</div>
        </div>
        
        <main className="login-main">
          <div className="login-container">
            <div className="login-tabs">
              <button 
                className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Sign In
              </button>
              <button 
                className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Sign Up
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'login' ? (
                <Login onLogin={onLogin} />
              ) : (
                <Register onSuccess={() => setActiveTab('login')} />
              )}
            </div>
          </div>
          
          <div className="login-hero">
            <div className="hero-decoration">
              <div className="coffee-beans">
                <span className="bean">☕</span>
                <span className="bean">🫘</span>
                <span className="bean">☕</span>
                <span className="bean">🫘</span>
                <span className="bean">☕</span>
              </div>
            </div>
            <div className="hero-text">
              <h2>Your Daily Dose of Happiness</h2>
              <p>From the first sip to the last drop, we craft every cup with passion and precision.</p>
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

export default LoginPage;