// server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001; // Use Heroku's port or 3001 locally

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the Coffee Shop App!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});