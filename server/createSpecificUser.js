const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model');
require('dotenv').config({ path: './.env' });

async function createSpecificUser() {
  try {
    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Clear any existing users with null email to avoid conflicts
    await User.deleteMany({ email: null });
    console.log('Cleared users with null email');

    // Check if user already exists
    const existingUser = await User.findById('68bb1d47735cc4373efd98f7');
    if (existingUser) {
      console.log('User already exists!');
      console.log('Username:', existingUser.username);
      console.log('Role:', existingUser.role);
      console.log('First Name:', existingUser.firstName);
      console.log('Last Name:', existingUser.lastName);
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash('Alex998863-_', salt);

    // Create user with specific ObjectId
    const userData = {
      _id: new mongoose.Types.ObjectId('68bb1d47735cc4373efd98f7'),
      firstName: 'Alexander',
      lastName: 'Konopelski',
      birthday: new Date('2004-01-19'), // January 19, 2004
      username: '22konopelskialexande@gmail.com',
      email: '22konopelskialexande@gmail.com', // Add email field
      password: passwordHash,
      role: 'owner'
    };

    // Create the user document
    const user = new User(userData);
    await user.save();

    console.log('✅ User created successfully!');
    console.log('ObjectId:', user._id);
    console.log('Username:', user.username);
    console.log('Password: Alex998863-_');
    console.log('Role:', user.role);
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
    console.log('Birthday:', user.birthday);

  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

createSpecificUser();
