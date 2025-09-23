import React, { useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import { SocketProvider } from './context/SocketContext';

import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // This effect runs once on startup to check for an existing token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        const userData = { ...decodedUser, token };
        console.log('🔑 App startup - User data:', userData);
        setUser(userData); // Store decoded user info and token
      } catch (error) {
        // If token is invalid, remove it
        localStorage.removeItem('token');
      }
    }
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