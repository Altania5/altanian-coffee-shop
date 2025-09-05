import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  // 1. Add state for the new fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '',
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  // 2. Create a generic change handler
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 3. Send the full formData object
      await axios.post('/register', formData);
      setMessage('Registration successful! You can now log in.');
      // Clear the form
      setFormData({ firstName: '', lastName: '', birthday: '', username: '', password: '' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'An error occurred during registration.');
    }
  };

  return (
    // The wrapper div with className is in LoginPage.js, so it's removed from here
    <>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        {/* 4. Add the new input fields */}
        <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
        <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
        <label htmlFor="birthday">Birthday</label>
        <input type="date" name="birthday" id="birthday" value={formData.birthday} onChange={handleChange} required style={{ width: 'calc(100% - 24px)' }}/>
        <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <button type="submit">Register</button>
      </form>
      {message && <p>{message}</p>}
    </>
  );
}

export default Register;