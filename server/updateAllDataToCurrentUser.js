const mongoose = require('mongoose');

// Direct connection string
const MONGODB_URI = 'mongodb+srv://coffeeshop_app_db:Dorney1884-_@cluster0.z1v17tk.mongodb.net/coffeeshop_app_db?retryWrites=true';

async function updateAllDataToCurrentUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = mongoose.connection.db;
    const currentUserId = '68d1ebadd1eab2c8767bab64'; // Your current user ID
    
    console.log(`🔄 Updating all data to be associated with user ID: ${currentUserId}`);
    
    // List of collections that might contain user references
    const collectionsToUpdate = [
      'coffeelogs',
      'coffeeLogs', 
      'coffee_logs',
      'orders',
      'beans',
      'beanbags',
      'loyalty',
      'promocodes',
      'settings'
    ];
    
    let totalUpdated = 0;
    
    for (const collectionName of collectionsToUpdate) {
      try {
        const collection = db.collection(collectionName);
        
        // Check if collection exists
        const exists = await db.listCollections({ name: collectionName }).hasNext();
        if (!exists) {
          console.log(`⏭️  Collection ${collectionName} doesn't exist, skipping...`);
          continue;
        }
        
        // Count total documents in collection
        const totalCount = await collection.countDocuments();
        console.log(`📊 Collection ${collectionName} has ${totalCount} total documents`);
        
        if (totalCount > 0) {
          // Update ALL documents to have the current user ID
          const result = await collection.updateMany(
            {}, // Empty filter means update all documents
            { $set: { user: new mongoose.Types.ObjectId(currentUserId) } }
          );
          
          console.log(`✅ Updated ${result.modifiedCount} documents in ${collectionName} to user ID ${currentUserId}`);
          totalUpdated += result.modifiedCount;
        } else {
          console.log(`⚪ No documents found in ${collectionName}`);
        }
        
      } catch (error) {
        console.log(`❌ Error updating ${collectionName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Update complete! Total documents updated: ${totalUpdated}`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    for (const collectionName of collectionsToUpdate) {
      try {
        const collection = db.collection(collectionName);
        const exists = await db.listCollections({ name: collectionName }).hasNext();
        if (!exists) continue;
        
        const count = await collection.countDocuments({ 
          user: new mongoose.Types.ObjectId(currentUserId) 
        });
        
        if (count > 0) {
          console.log(`📊 ${collectionName}: ${count} documents now associated with user ID ${currentUserId}`);
        }
      } catch (error) {
        // Ignore errors for verification
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
updateAllDataToCurrentUser();
