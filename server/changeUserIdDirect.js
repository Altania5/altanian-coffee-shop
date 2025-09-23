const mongoose = require('mongoose');

// Direct connection string
const MONGODB_URI = 'mongodb+srv://coffeeshop_app_db:Dorney1884-_@cluster0.z1v17tk.mongodb.net/coffeeshop_app_db?retryWrites=true';

// Import the User model
const User = require('./models/user.model');

async function changeUserId() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const oldId = '68d1ebadd1eab2c8767bab64';
    const newId = '68bb1d47735cc4373efd98f7';

    // Check if the old user exists
    const oldUser = await User.findById(oldId);
    if (!oldUser) {
      console.log('❌ User with old ID not found:', oldId);
      return;
    }

    // Check if the new user ID already exists
    const existingUser = await User.findById(newId);
    if (existingUser) {
      console.log('❌ User with new ID already exists:', newId);
      console.log('Existing user:', existingUser.firstName, existingUser.lastName);
      return;
    }

    console.log('📋 Current user:', oldUser.firstName, oldUser.lastName, oldUser.email);
    console.log('🔄 Changing ID from', oldId, 'to', newId);

    // Update the user's _id
    const result = await User.findByIdAndUpdate(
      oldId,
      { _id: newId },
      { new: true, runValidators: true }
    );

    if (result) {
      console.log('✅ User ID successfully changed!');
      console.log('📋 Updated user:', result.firstName, result.lastName, result.email);
      console.log('🆔 New ID:', result._id);
    } else {
      console.log('❌ Failed to update user ID');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
changeUserId();
