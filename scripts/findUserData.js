#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config();

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        return mongoose.connection.db;
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function findUserData() {
    const db = await connectToDatabase();
    
    try {
        // Different possible user field names and ID formats
        const USER_ID_VARIANTS = [
            '68925b9ea610c07348ea412a',
            '68bb1d47735cc4373efd98f7',
            new mongoose.Types.ObjectId('68925b9ea610c07348ea412a'),
            new mongoose.Types.ObjectId('68bb1d47735cc4373efd98f7')
        ];
        
        const USER_FIELD_NAMES = [
            'user',
            'userId', 
            'User',
            'UserId',
            'user_id'
        ];
        
        console.log('\n🔍 Searching for user data in all collections...');
        
        const collections = await db.listCollections().toArray();
        
        for (const collectionInfo of collections) {
            console.log(`\n📋 Checking collection: ${collectionInfo.name}`);
            const collection = db.collection(collectionInfo.name);
            
            // First, check if there are any documents at all
            const totalCount = await collection.countDocuments();
            console.log(`   Total documents: ${totalCount}`);
            
            if (totalCount > 0) {
                // Get sample document to see structure
                const sample = await collection.findOne({});
                console.log(`   Sample keys:`, Object.keys(sample || {}));
                
                // Check for user references
                for (const fieldName of USER_FIELD_NAMES) {
                    for (const userId of USER_ID_VARIANTS) {
                        try {
                            const count = await collection.countDocuments({ [fieldName]: userId });
                            if (count > 0) {
                                console.log(`   🎯 FOUND: ${count} documents with ${fieldName} = ${userId}`);
                                
                                // Get a sample of the found documents
                                const samples = await collection.find({ [fieldName]: userId }).limit(2).toArray();
                                console.log(`   Sample documents:`, samples.map(s => ({
                                    _id: s._id,
                                    [fieldName]: s[fieldName],
                                    createdAt: s.createdAt,
                                    keys: Object.keys(s).slice(0, 10)
                                })));
                            }
                        } catch (error) {
                            // Ignore query errors for invalid field/value combinations
                        }
                    }
                }
                
                // Also check for any field that might contain the user ID as a string
                const userIdString = '68925b9ea610c07348ea412a';
                const userIdString2 = '68bb1d47735cc4373efd98f7';
                
                try {
                    const regexResults1 = await collection.find({ 
                        $or: [
                            { $text: { $search: userIdString } },
                            { userId: userIdString },
                            { user: userIdString }
                        ]
                    }).limit(2).toArray();
                    
                    if (regexResults1.length > 0) {
                        console.log(`   🔍 Text search found documents for old user:`, regexResults1.length);
                    }
                } catch (error) {
                    // Text search might not be available
                }
            }
        }
        
        // Also check if there might be documents with embedded ObjectIds
        console.log('\n🔍 Checking for documents that might contain user references in nested fields...');
        
        for (const collectionInfo of collections) {
            if (collectionInfo.name === 'coffeelogs' || collectionInfo.name === 'beans' || collectionInfo.name === 'orders') {
                const collection = db.collection(collectionInfo.name);
                const totalCount = await collection.countDocuments();
                
                if (totalCount > 0) {
                    console.log(`\n📋 Deep checking ${collectionInfo.name} (${totalCount} total docs):`);
                    
                    // Get all documents and check their structure
                    const allDocs = await collection.find({}).limit(10).toArray();
                    allDocs.forEach((doc, index) => {
                        console.log(`   Doc ${index + 1}:`, {
                            _id: doc._id,
                            structure: JSON.stringify(doc, null, 2).substring(0, 200) + '...'
                        });
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the search
findUserData().catch(console.error);
