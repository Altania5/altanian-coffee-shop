const mongoose = require('mongoose');
const User = require('../server/models/user.model');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/altanian-coffee';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Update Alexander's role to owner
const makeAlexanderOwner = async () => {
  try {
    const result = await User.updateOne(
      { firstName: 'Alexander' },
      { role: 'owner' }
    );
    
    if (result.matchedCount === 0) {
      console.log('No user found with firstName "Alexander"');
      console.log('Looking for all users...');
      
      const users = await User.find({}, 'firstName lastName username role');
      console.log('Found users:');
      users.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName} (${user.username}) - Role: ${user.role}`);
      });
    } else if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated Alexander to owner role!');
      
      // Verify the change
      const updatedUser = await User.findOne({ firstName: 'Alexander' }, 'firstName lastName role');
      console.log(`Verified: ${updatedUser.firstName} ${updatedUser.lastName} is now role: ${updatedUser.role}`);
    } else {
      console.log('Alexander was already an owner');
    }
    
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
const run = async () => {
  console.log('🚀 Starting admin role update script...');
  await connectDB();
  await makeAlexanderOwner();
};

run();
