const mongoose = require('mongoose');

// Direct connection string
const MONGODB_URI = 'mongodb+srv://coffeeshop_app_db:Dorney1884-_@cluster0.z1v17tk.mongodb.net/coffeeshop_app_db?retryWrites=true';

async function updateUserReferences() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = mongoose.connection.db;
    const oldUserId = '68d1ebadd1eab2c8767bab64';
    const newUserId = '68bb1d47735cc4373efd98f7';
    
    console.log(`🔄 Updating all references from ${oldUserId} to ${newUserId}`);
    
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
        
        // Count documents with old user ID
        const count = await collection.countDocuments({ 
          user: new mongoose.Types.ObjectId(oldUserId) 
        });
        
        if (count > 0) {
          console.log(`📝 Found ${count} documents in ${collectionName} with old user ID`);
          
          // Update all documents with old user ID to new user ID
          const result = await collection.updateMany(
            { user: new mongoose.Types.ObjectId(oldUserId) },
            { $set: { user: new mongoose.Types.ObjectId(newUserId) } }
          );
          
          console.log(`✅ Updated ${result.modifiedCount} documents in ${collectionName}`);
          totalUpdated += result.modifiedCount;
        } else {
          console.log(`⚪ No documents found in ${collectionName} with old user ID`);
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
        
        const oldCount = await collection.countDocuments({ 
          user: new mongoose.Types.ObjectId(oldUserId) 
        });
        const newCount = await collection.countDocuments({ 
          user: new mongoose.Types.ObjectId(newUserId) 
        });
        
        if (oldCount > 0 || newCount > 0) {
          console.log(`📊 ${collectionName}: Old ID references: ${oldCount}, New ID references: ${newCount}`);
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
updateUserReferences();
