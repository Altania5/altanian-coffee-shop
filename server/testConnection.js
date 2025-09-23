const mongoose = require('mongoose');

// Direct connection string
const MONGODB_URI = 'mongodb+srv://coffeeshop_app_db:Dorney1884-_@cluster0.z1v17tk.mongodb.net/coffeeshop_app_db?retryWrites=true';

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    // List collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections found:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    // Check users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);
    
    // Check for both user IDs
    const oldId = '68d1ebadd1eab2c8767bab64';
    const newId = '68bb1d47735cc4373efd98f7';
    
    const oldUser = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(oldId) });
    const newUser = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(newId) });
    
    console.log(`\n🔍 User ${oldId}:`, oldUser ? `${oldUser.firstName} ${oldUser.lastName}` : 'Not found');
    console.log(`🔍 User ${newId}:`, newUser ? `${newUser.firstName} ${newUser.lastName}` : 'Not found');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testConnection();
