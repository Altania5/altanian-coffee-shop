import React, { useState } from 'react';
import axios from 'axios';

// The 'setToken' prop will be a function passed down from App.js
function Login({ onLogin  }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/login', { username, password });
      // On successful login, call the function passed from App.js
      // to update the global token state.
      onLogin(response.data.token);
      // Store the token in the browser's local storage
      localStorage.setItem('token', response.data.token);
    } catch (err) {
      setError(err.response.data.msg || 'An error occurred during login.');
    }
  };

  return (
    <>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </>
  );
}

export default Login;