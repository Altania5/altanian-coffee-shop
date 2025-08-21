import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';

import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // This effect runs once on startup to check for an existing token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setUser({ ...decodedUser, token }); // Store decoded user info and token
      } catch (error) {
        // If token is invalid, remove it
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    const decodedUser = jwtDecode(token);
    setUser({ ...decodedUser, token });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // If there's no user, show the LoginPage. Otherwise, show the main app.
  return user ? (
    <AppLayout user={user} onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}

export default App;