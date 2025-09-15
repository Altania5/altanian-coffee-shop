const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the User model
const User = require('./models/user.model');

async function createTestUser() {
  try {
    // Connect to MongoDB
    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Clear any existing users with null email to avoid conflicts
    await User.deleteMany({ email: null });
    console.log('Cleared users with null email');

    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Username: testuser');
      console.log('Password: testpass123');
      process.exit(0);
    }

    // Create test user
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash('testpass123', salt);

    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      birthday: new Date('1990-01-01'),
      username: 'testuser',
      password: passwordHash,
      role: 'customer'
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('Username: testuser');
    console.log('Password: testpass123');
    console.log('Role: customer');

    // Create admin user
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminSalt = await bcrypt.genSalt();
      const adminPasswordHash = await bcrypt.hash('admin123', adminSalt);

      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        birthday: new Date('1985-01-01'),
        username: 'admin',
        password: adminPasswordHash,
        role: 'owner'
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('Role: owner');
    } else {
      console.log('Admin user already exists!');
      console.log('Username: admin');
      console.log('Password: admin123');
    }

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

createTestUser();
