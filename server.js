// server.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // For storing sessions in MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // Native MongoDB driver
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// --- MongoDB Configuration ---
const mongoUri = process.env.DATABASE_URL;
if (!mongoUri) {
    console.error("FATAL ERROR: DATABASE_URL is not defined in .env file.");
    process.exit(1); // Exit if DB URI is not set
}

const client = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db; // To store the database instance, e.g., for db.collection('users')
const DBNAME = "coffeeshop_app_db"; // Define your database name here

async function connectMongoose() {
    try {
        await mongoose.connect(mongoUri, { // Use the same mongoUri
            dbName: DBNAME, // Specify the database name for Mongoose as well
            useNewUrlParser: true, // Add common Mongoose options
            useUnifiedTopology: true
        });
        console.log(`Mongoose connected successfully to MongoDB for game models! Database: ${DBNAME}`);
    } catch (err) {
        console.error("Failed to connect Mongoose to MongoDB for game models:", err);
        // Decide if this is a fatal error for your app.
        // If the game is essential, you might process.exit(1);
    }
}

async function connectDB() {
    try {
        await client.connect();
        db = client.db(DBNAME);
        await db.command({ ping: 1 });
        console.log(`Successfully connected to MongoDB! Database: ${DBNAME}`);

        await connectMongoose(); // Ensure Mongoose is connected before defining models that might be used by native driver parts indirectly or for consistency
        
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        console.log("Ensured unique index on users.username");

        const menuItemsCollection = db.collection('menuitems');
        await menuItemsCollection.createIndex({ name: 1 });
        console.log("Ensured indexes on menuitems collection.");

        // --- Add this for inventoryitems ---
        const inventoryItemsCollection = db.collection('inventoryitems');
        await inventoryItemsCollection.createIndex({ itemName: 1 }, { unique: true });
        await inventoryItemsCollection.createIndex({ itemType: 1 });
        console.log("Ensured indexes on inventoryitems collection.");
        // --- End of addition for inventoryitems ---

    } catch (err) {
        console.error("Failed to connect to MongoDB or create/ensure indexes:", err);
        await client.close();
        process.exit(1);
    }
}

// --- Middleware Setup ---
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Session Configuration (using connect-mongo with native client)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        client: client,
        dbName: DBNAME,
        collectionName: 'sessions',
        stringify: true, 
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000 // Align with TTL or set as needed
        // sameSite: 'lax' 
    }
}));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'client', 'build')));

// --- Mongoose Schemas and Models ---

// PlayerGameProfile Schema (existing)
const farmSchema = new mongoose.Schema({
    regionName: { type: String, required: true },
    beanType: { type: String, required: true },
    costToInvest: { type: Number, required: true, default: 1000 },
    yieldPerCycle: { type: Number, required: true, default: 10 }, // kg
    cycleDuration: { type: Number, default: 24 * 60 * 60 * 1000 * 7 }, // 7 days in ms
    currentCycleProgress: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastHarvestTime: {type: Date, default: Date.now }
});

const cafeSchema = new mongoose.Schema({
    cityName: { type: String, required: true },
    size: { type: String, default: 'Small Kiosk' },
    operationalCostPerCycle: { type: Number, default: 100 },
    revenuePerCycle: {type: Number, default: 150}, // Simplified for now
    isActive: { type: Boolean, default: true }
});

const playerGameProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    gameName: { type: String, default: 'Global Brew Tycoon' },
    money: { type: Number, default: 5000 }, // Starting cash
    ownedFarms: [farmSchema],
    ownedCafes: [cafeSchema],
    inventory: { type: Map, of: Number, default: {} }, // e.g., { "Green Ethiopian Yirgacheffe": 0 }
    lastTickProcessed: { type: Date, default: Date.now }
});

const PlayerGameProfile = mongoose.model('PlayerGameProfile', playerGameProfileSchema);

app.get('/api/inventory/customizations', async (req, res) => {
    console.log("====== SERVER: Reached /api/inventory/customizations ======");
    try {
        console.log("====== SERVER: Inside TRY block for /api/inventory/customizations ======");
        
        const customizationItems = await InventoryItem.find({
            isAvailable: true,
            quantityInStock: { $gt: 0 },
            pricePerUnitCharge: { $gte: 0 }
        }).sort({ itemType: 1, itemName: 1 }).lean(); // Added .lean() for safety

        console.log(`====== SERVER: InventoryItem.find() completed. Found ${customizationItems ? customizationItems.length : 'null/undefined'} items.`);
        // console.log("====== SERVER: First item (if any):", customizationItems && customizationItems.length > 0 ? JSON.stringify(customizationItems[0]) : "No items"); // Log first item

        // Before sending, let's try to stringify it ourselves to see if that's the issue
        let responseData;
        try {
            responseData = { success: true, data: customizationItems };
            JSON.stringify(responseData); // Test stringification
            console.log("====== SERVER: Data stringified successfully, about to send response.");
        } catch (stringifyError) {
            console.error("====== SERVER: Error stringifying customizationItems for response:", stringifyError);
            // If stringification fails, this error should be caught by the outer catch
            throw stringifyError; // Re-throw to be caught by the outer catch block
        }

        res.status(200).json(responseData);
        console.log("====== SERVER: Response 200 sent successfully from /api/inventory/customizations");

    } catch (error) {
        console.error("====== SERVER CATCH BLOCK for /api/inventory/customizations: Error fetching customization options:", error);
        // Log the error type as well
        console.error("====== SERVER CATCH BLOCK: Error type:", error.name, "Error message:", error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch customization options due to server error.' });
    }
});


// --- NEW: Inventory Item Schema ---
const inventoryItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true, unique: true, trim: true },
    itemType: { 
        type: String, 
        required: true, 
        enum: ['Syrup', 'Coffee Beans', 'Sauce', 'Powder', 'Milk', 'Topping', 'Other'], // Example types
        trim: true 
    },
    unit: { type: String, required: true, trim: true }, // e.g., 'ml', 'grams', 'pumps', 'liters', 'bottle', 'bag'
    quantityInStock: { type: Number, required: true, default: 0, min: 0 },
    // Cost per unit for internal tracking (e.g., cost of 1ml of syrup)
    costPerUnit: { type: Number, required: false, min: 0 }, 
    // Price charge per unit for customer add-ons (e.g., price for 1 pump of syrup)
    pricePerUnitCharge: { type: Number, required: false, default: 0, min: 0 }, 
    isAvailable: { type: Boolean, default: true }, // Whether this item can be used in customizations
    supplierInfo: { type: String, trim: true, required: false },
    lastReorderDate: { type: Date, required: false },
    notes: { type: String, trim: true, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update `updatedAt` timestamp
inventoryItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

inventoryItemSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
// --- END: Inventory Item Schema ---


// --- Routes ---

// Note: Root route now handled by React catch-all route at the end

// Registration page route removed - now handled by React SPA


// Registration Logic
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    if (password.length < 6) { 
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await usersCollection.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await usersCollection.insertOne({
            username: username,
            passwordHash: passwordHash,
            role: 'customer', // Default role
            createdAt: new Date()
        });

        console.log('User registered:', { id: result.insertedId, username });
        res.status(201).json({ success: true, message: 'User registered successfully! Please log in.' });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) { 
            return res.status(409).json({ success: false, message: 'Username already taken.' });
        }
        res.status(500).json({ success: false, message: 'An error occurred during registration.' });
    }
});

// Login Logic
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const user = await usersCollection.findOne({ username: username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
             req.session.user = {
                 id: user._id.toHexString(),
                 username: user.username,
                 role: user.role || 'customer' 
             };
             console.log('[Login] req.session.user populated with:', req.session.user);
             try {
                 console.log('[Login] Full req.session object BEFORE save:', JSON.stringify(req.session, null, 2));
             } catch (e) {
                 console.log('[Login] Could not stringify req.session before save:', e.message);
             }

             req.session.save(err => {
                 if (err) {
                     console.error('[Login] Session save error:', err);
                     try {
                        console.log('[Login] Full req.session object ON SAVE ERROR:', JSON.stringify(req.session, null, 2));
                     } catch (e) {
                        console.log('[Login] Could not stringify req.session on save error:', e.message);
                     }
                     return res.status(500).json({ success: false, message: 'Session save error occurred.' });
                 }
                 console.log('[Login] Session save callback: Success! Session should be in store.');
                 try {
                    console.log('[Login] Full req.session object IN SAVE CALLBACK (after presumed save):', JSON.stringify(req.session, null, 2));
                 } catch (e) {
                    console.log('[Login] Could not stringify req.session in save callback:', e.message);
                 }

                 res.status(200).json({
                     success: true,
                     message: 'Login successful!',
                     user: {
                         id: req.session.user.id, 
                         username: req.session.user.username,
                         role: req.session.user.role
                     }
                 });
             });
         } else {
            res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
    } catch (error) {
        console.error('[Login] Outer catch error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log('------ isAuthenticated CHECK ------');
    console.log('Path:', req.method, req.originalUrl);
    console.log('Session ID:', req.sessionID);

    if (!req.session) {
        console.log('[AuthCheck] No session object found (req.session is falsy).');
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ success: false, message: 'Unauthorized. No session.' });
        } else {
            return res.redirect('/');
        }
    }

    console.log('[AuthCheck] Session Exists (req.session is truthy).');
    try {
        console.log('[AuthCheck] Full loaded req.session object from store:', JSON.stringify(req.session, null, 2));
    } catch (e) {
        console.log('[AuthCheck] Could not stringify loaded req.session:', e.message);
        console.log('[AuthCheck] Loaded req.session object (raw):', req.session); 
    }

    if (req.session.user && req.session.user.id) { // Added check for req.session.user.id
        console.log('[AuthCheck] User is Authenticated. Session User Data:', req.session.user);
        return next();
    } else {
        console.log('[AuthCheck] User NOT Authenticated (req.session.user is falsy/missing or id missing).');
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
        } else {
            console.log('[AuthCheck] Redirecting to /.');
            return res.redirect('/');
        }
    }
}

function isAdmin(req, res, next) {
    console.log(`------ isAdmin CHECK ------`);
    console.log(`Path: ${req.method} ${req.path}`);
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        console.log(`User ${req.session.user.username} IS an Admin.`);
        return next();
    } else {
        console.log('User IS NOT an Admin or session/user data missing.');
        // console.log('Current Session User Data for isAdmin check:', JSON.stringify(req.session.user, null, 2)); // Can be noisy
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
        } else {
            console.log('Redirecting to / due to insufficient admin privileges.'); // Clarified log
            return res.redirect('/');
        }
    }
}

// Protected Dashboard Route 
app.get('/dashboard', isAuthenticated, (req, res) => {
    // console.log('/dashboard route, req.session.user:', req.session.user); // Can be noisy
    res.status(200).json({
        success: true,
        message: `Welcome to your dashboard, ${req.session.user.username}!`,
        user: req.session.user 
    });
});

// Logout Logic
app.get('/logout', (req, res, next) => { 
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        console.log('User logged out, session destroyed, cookie cleared.');
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    });
});


// Menu page route removed - now handled by React SPA

// API to get all menu items (Public)
app.get('/api/menu', async (req, res) => {
    console.log("Request to /api/menu received"); 
    try {
        const menuItemsCollection = db.collection('menuitems');
        const items = await menuItemsCollection.find({}).sort({ category: 1, name: 1 }).toArray(); // Added sort
        console.log(`Found ${items.length} menu items.`); 
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error("Server Error: Error fetching menu items from DB:", error); 
        res.status(500).json({ success: false, message: 'Failed to fetch menu items on server.' });
    }
});

// GET a single menu item by ID (Public)
app.get('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid menu item ID format.' });
        }
        const menuItemsCollection = db.collection('menuitems');
        const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found.' });
        }
        res.status(200).json({ success: true, data: item });
    } catch (error) {
        console.error("Error fetching single menu item:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch menu item.' });
    }
});

// Admin menu page route removed - now handled by React SPA

// POST - Create a new menu item (Admin Only)
app.post('/api/menu', isAuthenticated, isAdmin, async (req, res) => {
    // Destructure customizationConfig from req.body
    const { name, description, price, category, imageUrl, isAvailable = true, customizationConfig } = req.body;

    if (!name || price == null) {
        return res.status(400).json({ success: false, message: 'Name and price are required.' });
    }
    if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
    }

    try {
        const menuItemsCollection = db.collection('menuitems');
        const newItem = {
            name,
            description: description || '',
            price,
            category: category || 'Uncategorized',
            imageUrl: imageUrl || '',
            isAvailable,
            customizationConfig: customizationConfig || {}, // Add customizationConfig, default to empty object
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await menuItemsCollection.insertOne(newItem);
        const createdItem = await menuItemsCollection.findOne({ _id: result.insertedId });

        res.status(201).json({ success: true, message: 'Menu item created successfully.', data: createdItem });
    } catch (error) {
        console.error("Error creating menu item:", error);
        if (error.code === 11000) { 
             return res.status(409).json({ success: false, message: `Menu item with name "${name}" already exists.` });
        }
        res.status(500).json({ success: false, message: 'Failed to create menu item.' });
    }
});

// PUT - Update an existing menu item by ID (Admin Only)
app.put('/api/menu/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    // Destructure customizationConfig from req.body
    const { name, description, price, category, imageUrl, isAvailable, customizationConfig } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid menu item ID format.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) {
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
        }
        updates.price = price;
    }
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (customizationConfig !== undefined) updates.customizationConfig = customizationConfig; // Add customizationConfig

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }
    updates.updatedAt = new Date(); 

    try {
        const menuItemsCollection = db.collection('menuitems');
        const result = await menuItemsCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: 'after' } 
        );

        if (!result) { 
            return res.status(404).json({ success: false, message: 'Menu item not found or no changes made.' });
        }
        res.status(200).json({ success: true, message: 'Menu item updated successfully.', data: result });
    } catch (error) {
        console.error("Error updating menu item:", error);
         if (error.code === 11000) { 
             return res.status(409).json({ success: false, message: `Menu item with name "${updates.name}" already exists.` });
        }
        res.status(500).json({ success: false, message: 'Failed to update menu item.' });
    }
});

// DELETE - Delete a menu item by ID (Admin Only)
app.delete('/api/menu/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid menu item ID format.' });
    }

    try {
        const menuItemsCollection = db.collection('menuitems');
        const result = await menuItemsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Menu item not found.' });
        }
        res.status(200).json({ success: true, message: 'Menu item deleted successfully.' });
    } catch (error) {
        console.error("Error deleting menu item:", error);
        res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
    }
});

// Tycoon game page route removed - now handled by React SPA

// --- Game API Endpoints --- (existing, kept for brevity)
// Middleware to get or create game profile
async function getOrCreateGameProfile(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "User not authenticated." });
    }
    try {
        let profile = await PlayerGameProfile.findOne({ userId: req.session.user.id });
        if (!profile) {
            profile = new PlayerGameProfile({
                userId: req.session.user.id,
            });
            await profile.save();
            console.log(`New game profile created for user ${req.session.user.id}`);
        }
        req.gameProfile = profile;
        next();
    } catch (error) {
        console.error("Error in getOrCreateGameProfile:", error);
        res.status(500).json({ success: false, message: "Error accessing game profile." });
    }
}

app.get('/api/game/tycoon/state', isAuthenticated, getOrCreateGameProfile, (req, res) => {
    res.status(200).json({ success: true, data: req.gameProfile });
});

const farmOptions = [
    { id: "ethiopia_yirgacheffe", regionName: "Ethiopia", beanType: "Yirgacheffe", costToInvest: 1500, yieldPerCycle: 15, cycleDurationDays: 7 },
    { id: "colombia_supremo", regionName: "Colombia", beanType: "Supremo", costToInvest: 1200, yieldPerCycle: 20, cycleDurationDays: 5 },
    { id: "vietnam_robusta", regionName: "Vietnam", beanType: "Robusta", costToInvest: 800, yieldPerCycle: 25, cycleDurationDays: 4 },
];

app.get('/api/game/tycoon/world/farm-options', isAuthenticated, (req, res) => {
    res.status(200).json({ success: true, data: farmOptions });
});

app.post('/api/game/tycoon/action/invest-farm', isAuthenticated, getOrCreateGameProfile, async (req, res) => {
    const { farmOptionId } = req.body;
    const profile = req.gameProfile;

    const selectedOption = farmOptions.find(f => f.id === farmOptionId);
    if (!selectedOption) {
        return res.status(400).json({ success: false, message: "Invalid farm option selected." });
    }

    if (profile.money < selectedOption.costToInvest) {
        return res.status(400).json({ success: false, message: "Not enough money to invest." });
    }

    profile.money -= selectedOption.costToInvest;
    profile.ownedFarms.push({
        regionName: selectedOption.regionName,
        beanType: selectedOption.beanType,
        costToInvest: selectedOption.costToInvest,
        yieldPerCycle: selectedOption.yieldPerCycle,
        cycleDuration: selectedOption.cycleDurationDays * 24 * 60 * 60 * 1000, 
        lastHarvestTime: Date.now() 
    });

    try {
        await profile.save();
        res.status(200).json({ success: true, message: `Successfully invested in ${selectedOption.beanType} farm in ${selectedOption.regionName}!`, data: profile });
    } catch (error) {
        console.error("Error investing in farm:", error);
        res.status(500).json({ success: false, message: "Error saving farm investment." });
    }
});

async function processGameTick(profile) {
    const now = Date.now();
    let changed = false;

    profile.ownedFarms.forEach(farm => {
        if (farm.isActive) {
            const timeSinceLastHarvest = now - new Date(farm.lastHarvestTime).getTime();
            if (timeSinceLastHarvest >= farm.cycleDuration) {
                const cyclesCompleted = Math.floor(timeSinceLastHarvest / farm.cycleDuration);
                const beansHarvested = cyclesCompleted * farm.yieldPerCycle;
                
                const inventoryKey = `Green ${farm.beanType}`; // Game inventory, not shop inventory
                profile.inventory.set(inventoryKey, (profile.inventory.get(inventoryKey) || 0) + beansHarvested);
                
                farm.lastHarvestTime = new Date(new Date(farm.lastHarvestTime).getTime() + cyclesCompleted * farm.cycleDuration); 
                console.log(`Harvested ${beansHarvested}kg of ${farm.beanType} for user ${profile.userId}`);
                changed = true;
            }
        }
    });

    profile.lastTickProcessed = now;
    if (changed) {
        await profile.save();
    }
    return profile;
}

app.get('/api/game/tycoon/state/ticked', isAuthenticated, getOrCreateGameProfile, async (req, res) => {
    try {
        const updatedProfile = await processGameTick(req.gameProfile);
        res.status(200).json({ success: true, data: updatedProfile });
    } catch (error) {
        console.error("Error processing game tick:", error);
        res.status(500).json({ success: false, message: "Error processing game state." });
    }
});

app.post('/api/inventory', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { 
            itemName, 
            itemType, 
            unit, 
            quantityInStock, 
            costPerUnit, 
            pricePerUnitCharge, 
            isAvailable, 
            supplierInfo, 
            notes 
        } = req.body;

        // Basic validation
        if (!itemName || !itemType || !unit || quantityInStock === undefined) {
            return res.status(400).json({ success: false, message: 'Item name, type, unit, and quantity are required.' });
        }
        if (typeof quantityInStock !== 'number' || quantityInStock < 0) {
            return res.status(400).json({ success: false, message: 'Quantity in stock must be a non-negative number.' });
        }
        if (pricePerUnitCharge !== undefined && (typeof pricePerUnitCharge !== 'number' || pricePerUnitCharge <= 0)) {
            return res.status(400).json({ success: false, message: 'Price per unit charge must be a non-negative number.' });
        }
        if (costPerUnit !== undefined && (typeof costPerUnit !== 'number' || costPerUnit < 0)) {
            return res.status(400).json({ success: false, message: 'Cost per unit must be a non-negative number.' });
        }

        const newInventoryItem = new InventoryItem({
            itemName,
            itemType,
            unit,
            quantityInStock,
            costPerUnit,
            pricePerUnitCharge,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            supplierInfo,
            notes
        });

        const savedItem = await newInventoryItem.save();
        res.status(201).json({ success: true, message: 'Inventory item created successfully.', data: savedItem });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        if (error.code === 11000) { // MongoDB duplicate key error for itemName
            return res.status(409).json({ success: false, message: `Inventory item with name "${req.body.itemName}" already exists.` });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to create inventory item.' });
    }
});

// GET /api/inventory - Get all inventory items (Admin Only)
app.get('/api/inventory', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const items = await InventoryItem.find({}).sort({ itemType: 1, itemName: 1 });
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory items.' });
    }
});

// GET /api/inventory/:id - Get a single inventory item by ID (Admin Only)
app.get('/api/inventory/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid inventory item ID format.' });
        }
        const item = await InventoryItem.findById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        res.status(200).json({ success: true, data: item });
    } catch (error) {
        console.error("Error fetching single inventory item:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory item.' });
    }
});

// PUT /api/inventory/:id - Update an existing inventory item (Admin Only)
app.put('/api/inventory/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid inventory item ID format.' });
        }

        const { 
            itemName, 
            itemType, 
            unit, 
            quantityInStock, 
            costPerUnit, 
            pricePerUnitCharge, 
            isAvailable, 
            supplierInfo, 
            notes 
        } = req.body;

        const updates = {};
        if (itemName !== undefined) updates.itemName = itemName;
        if (itemType !== undefined) updates.itemType = itemType;
        if (unit !== undefined) updates.unit = unit;
        if (quantityInStock !== undefined) {
            if (typeof quantityInStock !== 'number' || quantityInStock < 0) {
                 return res.status(400).json({ success: false, message: 'Quantity in stock must be a non-negative number.' });
            }
            updates.quantityInStock = quantityInStock;
        }
        if (costPerUnit !== undefined) {
            if (typeof costPerUnit !== 'number' || costPerUnit < 0) {
                return res.status(400).json({ success: false, message: 'Cost per unit must be a non-negative number.' });
            }
            updates.costPerUnit = costPerUnit;
        }
        if (pricePerUnitCharge !== undefined) {
             if (typeof pricePerUnitCharge !== 'number' || pricePerUnitCharge <= 0) {
                return res.status(400).json({ success: false, message: 'Price per unit charge must be a non-negative number.' });
            }
            updates.pricePerUnitCharge = pricePerUnitCharge;
        }
        if (isAvailable !== undefined) updates.isAvailable = isAvailable;
        if (supplierInfo !== undefined) updates.supplierInfo = supplierInfo;
        if (notes !== undefined) updates.notes = notes;
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No update fields provided.' });
        }
        // Mongoose 'findOneAndUpdate' with schema pre-save hook for 'updatedAt' will handle it.
        // updates.updatedAt = new Date(); // Or handled by schema pre-hook

        const updatedItem = await InventoryItem.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

        if (!updatedItem) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        res.status(200).json({ success: true, message: 'Inventory item updated successfully.', data: updatedItem });
    } catch (error) {
        console.error("Error updating inventory item:", error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: `Inventory item with name "${req.body.itemName}" already exists.` });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to update inventory item.' });
    }
});

// DELETE /api/inventory/:id - Delete an inventory item (Admin Only)
app.delete('/api/inventory/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid inventory item ID format.' });
        }
        const deletedItem = await InventoryItem.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        res.status(200).json({ success: true, message: `Inventory item "${deletedItem.itemName}" deleted successfully.` });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        res.status(500).json({ success: false, message: 'Failed to delete inventory item.' });
    }
});

// Catch-all handler: send back React's index.html file for any non-API routes
// This must be the LAST route defined
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// --- Start Server Only After DB Connection ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Connected to database: ${DBNAME}`);
    });
}).catch(err => {
    console.error("Server failed to start due to critical DB connection issues from connectDB promise:", err);
    process.exit(1); 
});

// --- Graceful Shutdown ---
async function gracefulShutdown(signal) {
    console.log(`\n${signal} signal received. Closing MongoDB connection...`);
    try {
        await mongoose.disconnect(); // Disconnect Mongoose
        await client.close();
        console.log('MongoDB connections closed successfully.');
    } catch (err) {
        console.error('Error closing MongoDB connections:', err);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));