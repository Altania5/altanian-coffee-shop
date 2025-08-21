import React from 'react';
import Login from '../components/Login';
import Register from '../components/Register';

function LoginPage({ onLogin }) {
  return (
    <div>
      <div className="app-header">
        <div className="app-title">Altanian Coffee</div>
      </div>
      <main>
        <div className="form-container">
          <Login onLogin={onLogin} />
        </div>
        <div className="form-container">
          <Register />
        </div>
      </main>
    </div>
  );
}

export default LoginPage;