import React, { useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import { SocketProvider } from './context/SocketContext';
import dataValidationService from './utils/dataValidation';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize data validation and check for existing token
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Run data validation and cleanup
        dataValidationService.initialize();
        
        // Check for existing token after cleanup
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const decodedUser = jwtDecode(token);
            const userData = { ...decodedUser, token };
            console.log('🔑 App startup - User data:', userData);
            setUser(userData);
          } catch (error) {
            console.warn('🗑️ Invalid token found, removing:', error.message);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
        
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        // Emergency cleanup
        dataValidationService.emergencyCleanup();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    const decodedUser = jwtDecode(token);
    const userData = { ...decodedUser, token };
    console.log('🔑 Login - User data:', userData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Memoize user object to prevent unnecessary re-renders
  const stableUser = useMemo(() => user, [user]);

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#FDF6E3',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <div style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          color: '#4A2C17'
        }}>
          ☕
        </div>
        <div style={{
          fontSize: '1.2rem',
          color: '#4A2C17',
          marginBottom: '0.5rem'
        }}>
          Altanian Coffee
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: '#8B6F4D'
        }}>
          Initializing...
        </div>
      </div>
    );
  }

  // If there's no user, show the LoginPage. Otherwise, show the main app.
  return stableUser ? (
    <SocketProvider user={stableUser}>
      <AppLayout user={stableUser} onLogout={handleLogout} />
    </SocketProvider>
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}

export default App;