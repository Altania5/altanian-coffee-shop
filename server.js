// server.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // For storing sessions in MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // Native MongoDB driver

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

async function connectDB() {
    try {
        await client.connect();
        db = client.db(DBNAME);
        await db.command({ ping: 1 });
        console.log(`Successfully connected to MongoDB! Database: ${DBNAME}`);

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
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: MongoStore.create({
        client: client, // Pass the connected MongoClient instance
        dbName: DBNAME, // Specify the database name for sessions
        collectionName: 'sessions', // Optional: name for the sessions collection
        stringify: false, // Store JS objects directly (default is true, which stringifies)
        ttl: 14 * 24 * 60 * 60 // Session TTL in seconds (e.g., 14 days)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        httpOnly: true, // Helps prevent XSS attacks
        maxAge: 1000 * 60 * 60 * 24 // Cookie expiry in milliseconds (e.g., 24 hours)
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
                 role: user.role || 'customer' // Add role, default to 'customer' if not set
             };
             console.log('Login successful, session created for:', req.session.user); // Now includes role
             res.status(200).json({
                 success: true,
                 message: 'Login successful!',
                 user: {
                     id: user._id.toHexString(),
                     username: user.username,
                     role: user.role || 'customer'
                 }
             });
         } else {
            res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
    } else {
        return res.redirect('/');
    }
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    } else {
        return res.redirect('/');
    }
}

// Protected Dashboard Route (Example)
app.get('/dashboard', isAuthenticated, (req, res) => {
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