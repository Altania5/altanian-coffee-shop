const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
let User = require('../models/user.model');
const FavoriteDrink = require('../models/favoriteDrink.model');
const Product = require('../models/product.model');

// utility to hash customization objects consistently
const hashCustomizations = (data = {}) => {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return require('crypto').createHash('sha256').update(stable).digest('hex');
};

// --- REGISTRATION ---
router.route('/register').post(async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    // 1. Destructure the new fields from the request body
    const { firstName, lastName, birthday, email, username, password } = req.body;

    // 2. Update validation to check for the new fields
    if (!firstName || !lastName || !birthday || !email || !username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ 
      $or: [{ username: username }, { email: email }] 
    });
    if (existingUser) {
      return res.status(400).json({ msg: 'An account with this username or email already exists.' });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create the new user with all fields
    const newUser = new User({
      firstName,
      lastName,
      birthday,
      email,
      username,
      password: passwordHash,
    });

    const savedUser = await newUser.save();
    res.json(savedUser);

  } catch (err) {
    console.error('Registration error:', err);
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

// --- GET USER PROFILE ---
router.route('/profile').get(auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        birthday: user.birthday,
        phone: user.phone || '',
        role: user.role
      }
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE USER PROFILE ---
router.route('/profile').put(auth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ msg: 'Please provide firstName and lastName' });
    }

    const updatePayload = {
      firstName,
      lastName,
      phone: phone || ''
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updatePayload,
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        username: updatedUser.username,
        birthday: updatedUser.birthday,
        phone: updatedUser.phone || '',
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- CHANGE PASSWORD ---
router.route('/password').put(auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Please provide current and new password' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters' });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await User.findByIdAndUpdate(req.user.id, { password: passwordHash });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET USER FAVORITES ---
router.route('/favorites').get(auth, async (req, res) => {
  try {
    const favorites = await FavoriteDrink.find({ user: req.user.id })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      favorites: favorites.map(f => f.toClient())
    });
  } catch (err) {
    console.error('Favorites fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- ADD FAVORITE ---
router.route('/favorites').post(auth, async (req, res) => {
  try {
    const { productId, customizations, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    const customizationHash = hashCustomizations(customizations || {});

    const favorite = await FavoriteDrink.findOneAndUpdate(
      {
        user: req.user.id,
        product: product._id,
        customizationHash
      },
      {
        user: req.user.id,
        product: product._id,
        productName: product.name,
        productImage: product.image || product.imageUrl,
        basePrice: product.price,
        customizations: customizations || {},
        customizationHash,
        notes: notes || undefined,
        lastOrderedAt: new Date()
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    if (req.body.incrementOrderCount) {
      favorite.timesOrdered += 1;
      await favorite.save();
    }

    res.json({
      success: true,
      favorite: favorite.toClient()
    });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- REMOVE FAVORITE ---
router.route('/favorites/:favoriteId').delete(auth, async (req, res) => {
  try {
    const { favoriteId } = req.params;

    const favorite = await FavoriteDrink.findOne({
      _id: favoriteId,
      user: req.user.id
    });

    if (!favorite) {
      return res.status(404).json({ msg: 'Favorite not found' });
    }

    await favorite.deleteOne();

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;