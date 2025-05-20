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

        await connectMongoose();
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        console.log("Ensured unique index on users.username");

        // --- Add this for menuitems ---
        const menuItemsCollection = db.collection('menuitems');
        // Example: Create an index on the 'name' field for faster lookups or if you want names to be unique
        // If names don't need to be unique, you might index 'category' or skip this specific index.
        await menuItemsCollection.createIndex({ name: 1 });
        // await menuItemsCollection.createIndex({ category: 1 }); // Another example
        console.log("Ensured indexes on menuitems collection.");
        // --- End of addition ---

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
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
        // Set secure only in production, or if explicitly configured for HTTPS in dev
        secure: false,
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000
        // sameSite: 'lax' // You can consider adding this for better security, though 'Lax' is often default
    }
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Welcome/Login page
app.get('/', (req, res) => {
    if (req.session.user) {
        // If the user is already logged in, check their role
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/menu'); // Redirect admin to admin menu
        } else {
            return res.redirect('/menu'); // Redirect other users to public menu
        }
    }
    // Otherwise, if no session user, show the login page
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

// Registration page (if you have one, link it from welcome.html)
app.get('/register', (req, res) => { // Changed from /register-page to /register
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});


// Registration Logic
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    if (password.length < 6) { // Example: Basic password length validation
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        // Check if username already exists (the unique index also helps, but this provides a nicer message)
        const existingUser = await usersCollection.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await usersCollection.insertOne({
            username: username,
            passwordHash: passwordHash,
            role: 'customer',
            createdAt: new Date()
        });

        console.log('User registered:', { id: result.insertedId, username });
        res.status(201).json({ success: true, message: 'User registered successfully! Please log in.' });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) { // MongoDB duplicate key error
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
             // Previous log:
             // console.log('Login successful, session user data set for:', req.session.user);
             // New, more detailed logging:
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
                 // Previous log:
                 // console.log('Session saved to store. Sending login success response.');
                 // New, more detailed logging:
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
                         id: req.session.user.id, // Ensure req.session.user is still accessible here
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
        // This case doesn't seem to be happening based on your current logs,
        // but it's good for completeness.
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ success: false, message: 'Unauthorized. No session.' });
        } else {
            return res.redirect('/');
        }
    }

    // Log the entire session object retrieved from the store
    console.log('[AuthCheck] Session Exists (req.session is truthy).');
    try {
        console.log('[AuthCheck] Full loaded req.session object from store:', JSON.stringify(req.session, null, 2));
    } catch (e) {
        console.log('[AuthCheck] Could not stringify loaded req.session:', e.message);
        console.log('[AuthCheck] Loaded req.session object (raw):', req.session); // Fallback log
    }

    if (req.session.user) {
        console.log('[AuthCheck] User is Authenticated. Session User Data:', req.session.user);
        return next();
    } else {
        console.log('[AuthCheck] User NOT Authenticated (req.session.user is falsy/missing).');
        // Redirect or send error as before
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
    // isAuthenticated should have ensured req.session.user exists if it passed
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        console.log(`User ${req.session.user.username} IS an Admin.`);
        return next();
    } else {
        console.log('User IS NOT an Admin or session/user data missing.');
        console.log('Current Session User Data for isAdmin check:', JSON.stringify(req.session.user, null, 2));
        console.log('Redirecting to /.');
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
        } else {
            return res.redirect('/');
        }
    }
}

// Protected Dashboard Route (Example)
app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log('/dashboard route, req.session.user:', req.session.user);
    res.status(200).json({
        success: true,
        message: `Welcome to your dashboard, ${req.session.user.username}!`,
        user: req.session.user
    });
});

// Logout Logic
app.get('/logout', (req, res, next) => { // Added next for error handling in destroy
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
        }
        // Optional: res.clearCookie('connect.sid'); // Default session cookie name, if needed
        console.log('User logged out');
        // For API, send success. For browser, you might redirect.
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
        // Example redirect: res.redirect('/');
    });
});


// --- Start Server Only After DB Connection ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Connected to database: ${DBNAME}`);
    });
}).catch(err => {
    // This catch is for the initial connectDB() promise if it rejects outside its own try/catch
    // (e.g., if the process.exit(1) inside connectDB fails for some reason or if there's an issue before that)
    console.error("Server failed to start due to critical DB connection issues from connectDB promise:", err);
    process.exit(1); // Ensure process exits if server can't start
});

app.get('/menu', (req, res) => {
    console.log("Serving /menu HTML page"); // Add server-side log
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/api/menu', async (req, res) => {
    console.log("Request to /api/menu received"); // Add server-side log
    try {
        const menuItemsCollection = db.collection('menuitems');
        const items = await menuItemsCollection.find({}).toArray();
        console.log(`Found ${items.length} menu items.`); // Server-side log
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error("Server Error: Error fetching menu items from DB:", error); // Server-side log
        res.status(500).json({ success: false, message: 'Failed to fetch menu items on server.' });
    }
});

// GET a single menu item by ID (Public)
app.get('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Validate ObjectId
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

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/admin/menu', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-menu.html'));
});

// POST - Create a new menu item (Admin Only)
app.post('/api/menu', isAuthenticated, isAdmin, async (req, res) => {
    const { name, description, price, category, imageUrl, isAvailable = true } = req.body;

    // Basic validation
    if (!name || !price) {
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
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await menuItemsCollection.insertOne(newItem);
        // The inserted document (newItem) will have _id automatically added by MongoDB
        // To return the full document with its new _id:
        const createdItem = await menuItemsCollection.findOne({ _id: result.insertedId });

        res.status(201).json({ success: true, message: 'Menu item created successfully.', data: createdItem });
    } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(500).json({ success: false, message: 'Failed to create menu item.' });
    }
});

// PUT - Update an existing menu item by ID (Admin Only)
app.put('/api/menu/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, imageUrl, isAvailable } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid menu item ID format.' });
    }

    // Construct update object with only provided fields
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

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }
    updates.updatedAt = new Date(); // Always update the timestamp

    try {
        const menuItemsCollection = db.collection('menuitems');
        const result = await menuItemsCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: 'after' } // Returns the updated document
        );

        if (!result) { // Prior to MongoDB driver v6, result was { value: null } if not found. Now result itself is null.
            return res.status(404).json({ success: false, message: 'Menu item not found or no changes made.' });
        }
        res.status(200).json({ success: true, message: 'Menu item updated successfully.', data: result });
    } catch (error) {
        console.error("Error updating menu item:", error);
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

app.get('/tycoon.html', isAuthenticated, (req, res) => { // Protect the game page
    res.sendFile(path.join(__dirname, 'public', 'tycoon.html'));
});

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
// Note: If Farm and Cafe were separate collections, you'd do:
// const Farm = mongoose.model('Farm', farmSchema);
// const Cafe = mongoose.model('Cafe', cafeSchema);
// And in PlayerGameProfile, ownedFarms would be [ { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' } ]

// --- Game API Endpoints ---

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
                // Initialize with a starting farm or cart if desired
                // ownedFarms: [{ regionName: 'My First Plot', beanType: 'Generic Bean', costToInvest: 0, yieldPerCycle: 5, cycleDuration: 60000 }]
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

// Endpoint to get current game state (creates if not exists)
app.get('/api/game/tycoon/state', isAuthenticated, getOrCreateGameProfile, (req, res) => {
    // Potentially run game tick logic here before sending state
    res.status(200).json({ success: true, data: req.gameProfile });
});

// Static data for farm options for now
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
        cycleDuration: selectedOption.cycleDurationDays * 24 * 60 * 60 * 1000, // Convert days to ms
        lastHarvestTime: Date.now() // Start cycle from now
    });

    try {
        await profile.save();
        res.status(200).json({ success: true, message: `Successfully invested in ${selectedOption.beanType} farm in ${selectedOption.regionName}!`, data: profile });
    } catch (error) {
        console.error("Error investing in farm:", error);
        // Consider reverting money if save fails, or use transactions if your DB supports it well with Mongoose
        res.status(500).json({ success: false, message: "Error saving farm investment." });
    }
});

// --- Game Tick Logic (Conceptual - to be expanded) ---
// This would be called periodically or on certain player actions
async function processGameTick(profile) {
    const now = Date.now();
    let changed = false;

    // Process farms
    profile.ownedFarms.forEach(farm => {
        if (farm.isActive) {
            const timeSinceLastHarvest = now - new Date(farm.lastHarvestTime).getTime();
            if (timeSinceLastHarvest >= farm.cycleDuration) {
                const cyclesCompleted = Math.floor(timeSinceLastHarvest / farm.cycleDuration);
                const beansHarvested = cyclesCompleted * farm.yieldPerCycle;
                
                const inventoryKey = `Green ${farm.beanType}`;
                profile.inventory.set(inventoryKey, (profile.inventory.get(inventoryKey) || 0) + beansHarvested);
                
                farm.lastHarvestTime = new Date(new Date(farm.lastHarvestTime).getTime() + cyclesCompleted * farm.cycleDuration); // Advance harvest time
                console.log(`Harvested ${beansHarvested}kg of ${farm.beanType} for user ${profile.userId}`);
                changed = true;
            }
        }
    });

    // Process cafes (simplified)
    // profile.ownedCafes.forEach(cafe => {
    // if (cafe.isActive) { /* Add cafe logic, deduct operational costs, add revenue */ }
    // });

    profile.lastTickProcessed = now;
    if (changed) {
        await profile.save();
    }
    return profile;
}

// Example of how to potentially call tick before sending state:
app.get('/api/game/tycoon/state/ticked', isAuthenticated, getOrCreateGameProfile, async (req, res) => {
    try {
        const updatedProfile = await processGameTick(req.gameProfile);
        res.status(200).json({ success: true, data: updatedProfile });
    } catch (error) {
        console.error("Error processing game tick:", error);
        res.status(500).json({ success: false, message: "Error processing game state." });
    }
});

// --- Graceful Shutdown ---
// Listen for termination signals (Ctrl+C, Docker stop, etc.)
async function gracefulShutdown(signal) {
    console.log(`\n${signal} signal received. Closing MongoDB connection...`);
    try {
        await client.close();
        console.log('MongoDB connection closed successfully.');
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));