const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let User = require('../models/user.model');

// --- REGISTRATION ---
router.route('/register').post(async (req, res) => {
  try {
    // 1. Destructure the new fields from the request body
    const { firstName, lastName, birthday, username, password } = req.body;

    // 2. Update validation to check for the new fields
    if (!firstName || !lastName || !birthday || !username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.status(400).json({ msg: 'An account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create the new user with all fields
    const newUser = new User({
      firstName,
      lastName,
      birthday,
      username,
      password: passwordHash,
    });

    const savedUser = await newUser.save();
    res.json(savedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LOGIN ---
router.route('/login').post(async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields.' });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ username: username }).select('+password');
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials.' });
    }

    // Sign a token
    const token = jwt.sign(
      { id: user._id, role: user.role, firstName: user.firstName }, // Add firstName to token
      process.env.JWT_SECRET || 'your_jwt_secret'
    );
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName // Add firstName to user object
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;