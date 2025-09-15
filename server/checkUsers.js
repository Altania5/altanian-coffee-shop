const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('./models/user.model');

async function checkUsers() {
  try {
    // Connect to MongoDB
    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('firstName lastName username role createdAt');
    
    console.log(`\n📊 Found ${users.length} users in the database:`);
    console.log('=====================================');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('   ---');
    });

    if (users.length === 0) {
      console.log('No users found in the database.');
    }

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

checkUsers();
