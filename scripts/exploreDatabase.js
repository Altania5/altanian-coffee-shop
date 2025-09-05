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

async function exploreDatabase() {
    const db = await connectToDatabase();
    
    try {
        console.log('\n📊 Database Information:');
        console.log('Database Name:', db.databaseName);
        
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log('\n📋 Collections found:');
        collections.forEach(collection => {
            console.log(`   - ${collection.name}`);
        });
        
        // Check specific collections for user data
        const USER_IDS = [
            '68925b9ea610c07348ea412a', // old user ID
            '68bb1d47735cc4373efd98f7'  // new user ID
        ];
        
        for (const userId of USER_IDS) {
            console.log(`\n🔍 Checking data for user: ${userId}`);
            
            // Check different possible collection names
            const collectionChecks = [
                'coffeelogs',
                'coffeeLogs',
                'coffee_logs',
                'beans',
                'orders',
                'users'
            ];
            
            for (const collectionName of collectionChecks) {
                try {
                    const collection = db.collection(collectionName);
                    const count = await collection.countDocuments({ user: new mongoose.Types.ObjectId(userId) });
                    if (count > 0) {
                        console.log(`   ✅ ${collectionName}: ${count} documents`);
                        
                        // Get a sample document
                        const sample = await collection.findOne({ user: new mongoose.Types.ObjectId(userId) });
                        console.log(`   📄 Sample document structure:`, Object.keys(sample || {}));
                    } else {
                        console.log(`   ⚪ ${collectionName}: 0 documents`);
                    }
                } catch (error) {
                    console.log(`   ❌ ${collectionName}: Collection doesn't exist or error -`, error.message);
                }
            }
        }
        
        // Check what collections have any documents at all
        console.log('\n📊 Collection document counts:');
        for (const collectionInfo of collections) {
            const collection = db.collection(collectionInfo.name);
            const count = await collection.countDocuments();
            console.log(`   ${collectionInfo.name}: ${count} documents`);
            
            if (count > 0 && count < 20) {
                // Show sample documents for small collections
                const samples = await collection.find({}).limit(2).toArray();
                console.log(`     Sample documents:`, samples.map(s => ({ _id: s._id, keys: Object.keys(s) })));
            }
        }
        
    } catch (error) {
        console.error('❌ Exploration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the exploration
exploreDatabase().catch(console.error);
