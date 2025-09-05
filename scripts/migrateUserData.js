#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const CoffeeLog = require('../server/models/coffeeLog.model');
const Bean = require('../server/models/bean.model');
const Order = require('../server/models/order.model');

// Migration configuration
const OLD_USER_ID = '68925b9ea610c07348ea412a';
const NEW_USER_ID = '68bb1d47735cc4373efd98f7';

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function backupCollections() {
    console.log('\n🔄 Creating backup of current data...');
    
    try {
        const coffeeLogs = await CoffeeLog.find({ user: OLD_USER_ID }).lean();
        const beans = await Bean.find({ user: OLD_USER_ID }).lean();
        const orders = await Order.find({ user: OLD_USER_ID }).lean();
        
        console.log(`📊 Found data to migrate:`);
        console.log(`   - Coffee Logs: ${coffeeLogs.length}`);
        console.log(`   - Beans: ${beans.length}`);
        console.log(`   - Orders: ${orders.length}`);
        
        // Save backup to file
        const fs = require('fs');
        const backupData = {
            timestamp: new Date(),
            oldUserId: OLD_USER_ID,
            newUserId: NEW_USER_ID,
            data: {
                coffeeLogs,
                beans,
                orders
            }
        };
        
        fs.writeFileSync(
            `scripts/backup_${Date.now()}.json`, 
            JSON.stringify(backupData, null, 2)
        );
        
        console.log('✅ Backup created successfully');
        return { coffeeLogs: coffeeLogs.length, beans: beans.length, orders: orders.length };
        
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

async function migrateCollection(Model, collectionName) {
    console.log(`\n🔄 Migrating ${collectionName}...`);
    
    try {
        const result = await Model.updateMany(
            { user: new mongoose.Types.ObjectId(OLD_USER_ID) },
            { $set: { user: new mongoose.Types.ObjectId(NEW_USER_ID) } }
        );
        
        console.log(`✅ ${collectionName}: Updated ${result.modifiedCount} documents`);
        return result.modifiedCount;
        
    } catch (error) {
        console.error(`❌ Failed to migrate ${collectionName}:`, error);
        throw error;
    }
}

async function verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    try {
        // Check old user ID - should be 0
        const oldCoffeeLogs = await CoffeeLog.countDocuments({ user: OLD_USER_ID });
        const oldBeans = await Bean.countDocuments({ user: OLD_USER_ID });
        const oldOrders = await Order.countDocuments({ user: OLD_USER_ID });
        
        // Check new user ID - should have all the data
        const newCoffeeLogs = await CoffeeLog.countDocuments({ user: NEW_USER_ID });
        const newBeans = await Bean.countDocuments({ user: NEW_USER_ID });
        const newOrders = await Order.countDocuments({ user: NEW_USER_ID });
        
        console.log(`📊 Migration verification:`);
        console.log(`   Old User ID (${OLD_USER_ID}):`);
        console.log(`     - Coffee Logs: ${oldCoffeeLogs} (should be 0)`);
        console.log(`     - Beans: ${oldBeans} (should be 0)`);
        console.log(`     - Orders: ${oldOrders} (should be 0)`);
        console.log(`   New User ID (${NEW_USER_ID}):`);
        console.log(`     - Coffee Logs: ${newCoffeeLogs}`);
        console.log(`     - Beans: ${newBeans}`);
        console.log(`     - Orders: ${newOrders}`);
        
        const success = oldCoffeeLogs === 0 && oldBeans === 0 && oldOrders === 0 &&
                       (newCoffeeLogs > 0 || newBeans > 0 || newOrders > 0);
        
        return success;
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting User Data Migration');
    console.log(`   From: ${OLD_USER_ID}`);
    console.log(`   To:   ${NEW_USER_ID}`);
    
    try {
        // Connect to database
        await connectToDatabase();
        
        // Create backup
        const backupStats = await backupCollections();
        
        // Check if there's actually data to migrate
        if (backupStats.coffeeLogs === 0 && backupStats.beans === 0 && backupStats.orders === 0) {
            console.log('⚠️  No data found to migrate for the old user ID');
            process.exit(0);
        }
        
        // Perform migration
        console.log('\n🔄 Starting migration...');
        
        const coffeeLogsMigrated = await migrateCollection(CoffeeLog, 'Coffee Logs');
        const beansMigrated = await migrateCollection(Bean, 'Beans');
        const ordersMigrated = await migrateCollection(Order, 'Orders');
        
        // Verify migration
        const verificationSuccess = await verifyMigration();
        
        if (verificationSuccess) {
            console.log('\n✅ Migration completed successfully!');
            console.log(`📊 Summary:`);
            console.log(`   - Coffee Logs migrated: ${coffeeLogsMigrated}`);
            console.log(`   - Beans migrated: ${beansMigrated}`);
            console.log(`   - Orders migrated: ${ordersMigrated}`);
        } else {
            console.log('\n❌ Migration verification failed - please check manually');
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.log('\n💡 Check the backup file to restore data if needed');
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
