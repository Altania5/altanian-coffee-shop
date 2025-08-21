const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const ownerAuth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No authentication token, authorization denied.' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (!verified) {
      return res.status(401).json({ msg: 'Token verification failed, authorization denied.' });
    }

    // --- ADD THIS CHECK ---
    // Check if the user's role is 'owner'
    if (verified.role !== 'owner') {
      return res.status(403).json({ msg: 'Access denied. Not an owner.' });
    }

    req.user = verified.id;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = ownerAuth;