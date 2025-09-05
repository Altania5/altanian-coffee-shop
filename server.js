// server.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // Native MongoDB driver
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// --- MongoDB Configuration ---
const mongoUri = process.env.DATABASE_URL;
console.log('MongoDB URI configured:', mongoUri ? 'YES (length: ' + mongoUri.length + ')' : 'NO');
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
        await mongoose.connect(mongoUri, {
            dbName: DBNAME
        });
        console.log(`Mongoose connected successfully to MongoDB! Database: ${DBNAME}`);
    } catch (err) {
        console.error("Failed to connect Mongoose to MongoDB:", err);
        process.exit(1); // Exit if Mongoose connection fails
    }
}

async function connectDB() {
    try {
        // Connect Mongoose (primary database connection)
        await connectMongoose();
        
        // Connect native MongoDB client for menu items (if still needed)
        await client.connect();
        db = client.db(DBNAME);
        await db.command({ ping: 1 });
        console.log(`Native MongoDB client connected! Database: ${DBNAME}`);

        // Create indexes for collections that still use native driver
        const menuItemsCollection = db.collection('menuitems');
        await menuItemsCollection.createIndex({ name: 1 });
        console.log("Ensured indexes on menuitems collection.");
        
        // Seed some sample menu items if collection is empty
        await seedMenuItems(menuItemsCollection);
        
        // Seed some sample inventory items
        await seedInventoryItems();

    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message || err);
        console.error("Error details:", {
            name: err.name,
            code: err.code,
            codeName: err.codeName,
            connectionString: mongoUri ? mongoUri.substring(0, 50) + '...' : 'Not provided'
        });
        try {
            await mongoose.disconnect();
            await client.close();
        } catch (closeErr) {
            console.error("Error closing connections:", closeErr);
        }
        process.exit(1);
    }
}

// --- Middleware Setup ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'client', 'build')));

// --- Mongoose Schemas and Models ---

// User Schema matching the old format
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthday: { type: Date },
    username: { type: String, required: true, unique: true, trim: true }, // This is email in old format
    password: { type: String, required: true }, // Changed from passwordHash to password
    role: { type: String, enum: ['customer', 'admin', 'owner'], default: 'customer' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Coffee Log Schema
const coffeeLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coffeeName: { type: String, required: true },
    roastLevel: { type: String, enum: ['Light', 'Medium', 'Dark', 'Extra Dark'] },
    brewMethod: { type: String, required: true },
    grindSize: String,
    waterTemp: Number,
    brewTime: Number,
    rating: { type: Number, min: 1, max: 5 },
    notes: String,
    tags: [String],
    createdAt: { type: Date, default: Date.now }
});

const CoffeeLog = mongoose.model('CoffeeLog', coffeeLogSchema);

// Order Schema for tracking customer orders
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        menuItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: String,
        price: Number,
        quantity: Number,
        customizations: Object
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    stripePaymentIntentId: String,
    customerNotes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// --- Database Seeding Function ---
async function seedMenuItems(menuItemsCollection) {
    try {
        const count = await menuItemsCollection.countDocuments();
        if (count === 0) {
            const sampleItems = [
                {
                    name: "Classic Americano",
                    description: "Bold and smooth espresso with hot water. The perfect wake-up call.",
                    price: 3.50,
                    category: "Coffee",
                    imageUrl: "americano.jpg",
                    isAvailable: true,
                    customizationConfig: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: "Caramel Macchiato",
                    description: "Espresso with steamed milk and vanilla syrup, topped with caramel drizzle.",
                    price: 4.75,
                    category: "Coffee",
                    imageUrl: "macchiato.jpg",
                    isAvailable: true,
                    customizationConfig: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: "Vanilla Latte",
                    description: "Rich espresso with steamed milk and vanilla syrup. Comfort in a cup.",
                    price: 4.25,
                    category: "Coffee",
                    imageUrl: "latte.jpg",
                    isAvailable: true,
                    customizationConfig: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: "Chocolate Croissant",
                    description: "Buttery, flaky pastry filled with rich dark chocolate.",
                    price: 3.25,
                    category: "Pastry",
                    imageUrl: "croissant.jpg",
                    isAvailable: true,
                    customizationConfig: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: "Iced Cold Brew",
                    description: "Smooth, slow-steeped coffee served over ice. Refreshingly bold.",
                    price: 3.75,
                    category: "Cold Coffee",
                    imageUrl: "coldbrew.jpg",
                    isAvailable: true,
                    customizationConfig: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];
            
            await menuItemsCollection.insertMany(sampleItems);
            console.log(`Seeded ${sampleItems.length} sample menu items.`);
        } else {
            console.log(`Menu items collection already has ${count} items, skipping seeding.`);
        }
    } catch (error) {
        console.error('Error seeding menu items:', error);
    }
}

// --- Inventory Seeding Function ---
async function seedInventoryItems() {
    try {
        const count = await InventoryItem.countDocuments();
        if (count === 0) {
            const sampleInventory = [
                {
                    itemName: "Ethiopian Yirgacheffe",
                    itemType: "Coffee Beans",
                    unit: "lb",
                    quantityInStock: 50,
                    costPerUnit: 12.50,
                    pricePerUnitCharge: 0.75,
                    isAvailable: true,
                    supplierInfo: "Direct Trade",
                    notes: "Floral and citrusy notes"
                },
                {
                    itemName: "Colombian Supremo",
                    itemType: "Coffee Beans",
                    unit: "lb",
                    quantityInStock: 75,
                    costPerUnit: 10.00,
                    pricePerUnitCharge: 0.50,
                    isAvailable: true,
                    supplierInfo: "Fair Trade",
                    notes: "Rich and balanced"
                },
                {
                    itemName: "Vanilla Syrup",
                    itemType: "Syrup",
                    unit: "ml",
                    quantityInStock: 2000,
                    costPerUnit: 0.02,
                    pricePerUnitCharge: 0.60,
                    isAvailable: true,
                    notes: "Premium vanilla flavor"
                },
                {
                    itemName: "Caramel Sauce",
                    itemType: "Sauce",
                    unit: "ml",
                    quantityInStock: 1500,
                    costPerUnit: 0.03,
                    pricePerUnitCharge: 0.75,
                    isAvailable: true,
                    notes: "Rich caramel drizzle"
                },
                {
                    itemName: "Whole Milk",
                    itemType: "Milk",
                    unit: "ml",
                    quantityInStock: 5000,
                    costPerUnit: 0.001,
                    pricePerUnitCharge: 0.00,
                    isAvailable: true,
                    notes: "Fresh daily delivery"
                }
            ];
            
            await InventoryItem.insertMany(sampleInventory);
            console.log(`Seeded ${sampleInventory.length} sample inventory items.`);
        } else {
            console.log(`Inventory collection already has ${count} items, skipping seeding.`);
        }
    } catch (error) {
        console.error('Error seeding inventory items:', error);
    }
}

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


// --- JWT Authentication Middleware ---
function authenticateToken(req, res, next) {
    // Check for token in both Authorization header and x-auth-token header
    const authHeader = req.headers['authorization'];
    const xAuthToken = req.headers['x-auth-token'];
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (xAuthToken) {
        token = xAuthToken;
    }

    if (!token) {
        console.log('Authentication failed: No token provided for', req.method, req.path);
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Authentication failed: Invalid token for', req.method, req.path, 'Error:', err.message);
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Admin access required' });
}

// --- Routes ---

// Registration Logic
app.post('/register', async (req, res) => {
    const { firstName, lastName, username, password, birthday } = req.body;
    
    if (!firstName || !lastName || !username || !password) {
        return res.status(400).json({ success: false, message: 'First name, last name, username, and password are required.' });
    }
    if (password.length < 6) { 
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName,
            lastName,
            username,
            password: hashedPassword,
            birthday: birthday ? new Date(birthday) : undefined,
            role: 'customer'
        });

        await newUser.save();
        console.log('User registered:', { id: newUser._id, username, email });
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: newUser._id, 
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully!', 
            token,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) { 
            return res.status(409).json({ success: false, message: 'Username or email already taken.' });
        }
        res.status(500).json({ success: false, message: 'An error occurred during registration.' });
    }
});

// Login Logic
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        // Find user by username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('User logged in:', { id: user._id, username: user.username });
        
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

// Create test admin user (for development/testing only)
app.post('/create-test-admin', async (req, res) => {
    try {
        // Check if test admin already exists
        const existingAdmin = await User.findOne({ username: 'admin@test.com' });
        
        if (existingAdmin) {
            return res.status(200).json({ 
                success: true, 
                message: 'Test admin already exists',
                username: 'admin@test.com',
                note: 'Use password: admin123 to login'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        const testAdmin = new User({
            firstName: 'Test',
            lastName: 'Admin',
            username: 'admin@test.com',
            password: hashedPassword,
            role: 'owner'
        });
        
        await testAdmin.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Test admin created successfully!',
            username: 'admin@test.com',
            password: 'admin123',
            note: 'This is for testing purposes only'
        });
    } catch (error) {
        console.error('Error creating test admin:', error);
        res.status(500).json({ success: false, message: 'Failed to create test admin.' });
    }
});

// Create test customer user (for development/testing only)
app.post('/create-test-customer', async (req, res) => {
    try {
        // Check if test customer already exists
        const existingCustomer = await User.findOne({ username: 'customer@test.com' });
        
        if (existingCustomer) {
            return res.status(200).json({ 
                success: true, 
                message: 'Test customer already exists',
                username: 'customer@test.com',
                note: 'Use password: customer123 to login'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('customer123', salt);
        
        const testCustomer = new User({
            firstName: 'Test',
            lastName: 'Customer',
            username: 'customer@test.com',
            password: hashedPassword,
            role: 'customer'
        });
        
        await testCustomer.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Test customer created successfully!',
            username: 'customer@test.com',
            password: 'customer123',
            note: 'This is for testing purposes only'
        });
    } catch (error) {
        console.error('Error creating test customer:', error);
        res.status(500).json({ success: false, message: 'Failed to create test customer.' });
    }
});

// Promote user to admin (for development/testing only)
app.post('/promote-to-admin', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { role: 'owner' },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        // Generate new token with updated role
        const token = jwt.sign(
            { 
                id: user._id, 
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(200).json({
            success: true,
            message: 'Successfully promoted to owner!',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ success: false, message: 'Failed to promote user.' });
    }
});

// User profile route
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
    }
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

// Products endpoint for frontend compatibility
app.get('/products', async (req, res) => {
    try {
        const menuItemsCollection = db.collection('menuitems');
        const items = await menuItemsCollection.find({}).sort({ category: 1, name: 1 }).toArray();
        res.status(200).json(items); // Return items directly without wrapper
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// Inventory endpoint for frontend compatibility 
app.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const items = await InventoryItem.find({}).sort({ itemType: 1, itemName: 1 });
        res.status(200).json(items); // Return items directly without wrapper
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: 'Failed to fetch inventory.' });
    }
});

// Product management endpoints for admin
app.post('/products/add', authenticateToken, isAdmin, async (req, res) => {
    try {
        const menuItemsCollection = db.collection('menuitems');
        const newItem = {
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await menuItemsCollection.insertOne(newItem);
        const createdItem = await menuItemsCollection.findOne({ _id: result.insertedId });
        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ msg: 'Failed to add product.' });
    }
});

app.put('/products/update/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const menuItemsCollection = db.collection('menuitems');
        const updatedItem = {
            ...req.body,
            updatedAt: new Date()
        };
        const result = await menuItemsCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updatedItem },
            { returnDocument: 'after' }
        );
        res.status(200).json(result);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ msg: 'Failed to update product.' });
    }
});

app.delete('/products/delete/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const menuItemsCollection = db.collection('menuitems');
        await menuItemsCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ msg: 'Failed to delete product.' });
    }
});

// Promo codes endpoint for admin page
app.get('/promocodes', authenticateToken, isAdmin, async (req, res) => {
    try {
        // For now, return empty array - you can implement promo codes later
        res.status(200).json([]);
    } catch (error) {
        console.error('Error fetching promo codes:', error);
        res.status(500).json({ error: 'Failed to fetch promo codes.' });
    }
});

// Promo code management endpoints
app.post('/promocodes/add', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Implement promo code creation logic here
        res.status(201).json({ message: 'Promo code created successfully.' });
    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({ error: 'Failed to create promo code.' });
    }
});

app.put('/promocodes/update/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Implement promo code update logic here
        res.status(200).json({ message: 'Promo code updated successfully.' });
    } catch (error) {
        console.error('Error updating promo code:', error);
        res.status(500).json({ error: 'Failed to update promo code.' });
    }
});

app.delete('/promocodes/delete/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Implement promo code deletion logic here
        res.status(200).json({ message: 'Promo code deleted successfully.' });
    } catch (error) {
        console.error('Error deleting promo code:', error);
        res.status(500).json({ error: 'Failed to delete promo code.' });
    }
});

// Order history endpoint for order page
app.get('/orders/myorders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// Suggested product management endpoints
app.put('/settings/suggested-product', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { productId } = req.body;
        const menuItemsCollection = db.collection('menuitems');
        const product = await menuItemsCollection.findOne({ _id: new ObjectId(productId) });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        
        // For now, just return the product - in a real app you'd save this to a settings collection
        res.status(200).json(product);
    } catch (error) {
        console.error('Error updating suggested product:', error);
        res.status(500).json({ msg: 'Failed to update suggested product.' });
    }
});

// Inventory management endpoints
app.post('/inventory/add', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, quantity, unit, category } = req.body;
        const newInventoryItem = new InventoryItem({
            itemName: name,
            itemType: category,
            unit: unit,
            quantityInStock: quantity,
            isAvailable: true
        });
        
        const savedItem = await newInventoryItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ msg: 'Failed to add inventory item.' });
    }
});

app.put('/inventory/update/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Map frontend fields to backend schema
        if (updateData.quantity !== undefined) {
            updateData.quantityInStock = updateData.quantity;
            delete updateData.quantity;
        }
        
        const updatedItem = await InventoryItem.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );
        
        if (!updatedItem) {
            return res.status(404).json({ msg: 'Inventory item not found.' });
        }
        
        res.status(200).json(updatedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ msg: 'Failed to update inventory item.' });
    }
});

app.delete('/inventory/delete/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await InventoryItem.findByIdAndDelete(id);
        
        if (!deletedItem) {
            return res.status(404).json({ msg: 'Inventory item not found.' });
        }
        
        res.status(200).json({ message: 'Inventory item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ msg: 'Failed to delete inventory item.' });
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
app.post('/api/menu', authenticateToken, isAdmin, async (req, res) => {
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
app.put('/api/menu/:id', authenticateToken, isAdmin, async (req, res) => {
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
app.delete('/api/menu/:id', authenticateToken, isAdmin, async (req, res) => {
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

// --- Coffee Log API Endpoints ---

// Get all coffee logs for the authenticated user
app.get('/api/coffeelog', authenticateToken, async (req, res) => {
    try {
        const logs = await CoffeeLog.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(100); // Limit to last 100 entries
        
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching coffee logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch coffee logs.' });
    }
});

// Create a new coffee log entry
app.post('/api/coffeelog', authenticateToken, async (req, res) => {
    try {
        const { coffeeName, roastLevel, brewMethod, grindSize, waterTemp, brewTime, rating, notes, tags } = req.body;
        
        if (!coffeeName || !brewMethod) {
            return res.status(400).json({ success: false, message: 'Coffee name and brew method are required.' });
        }
        
        const newLog = new CoffeeLog({
            userId: req.user.id,
            coffeeName,
            roastLevel,
            brewMethod,
            grindSize,
            waterTemp,
            brewTime,
            rating,
            notes,
            tags: Array.isArray(tags) ? tags : []
        });
        
        await newLog.save();
        res.status(201).json({ success: true, message: 'Coffee log entry created successfully.', data: newLog });
    } catch (error) {
        console.error('Error creating coffee log:', error);
        res.status(500).json({ success: false, message: 'Failed to create coffee log entry.' });
    }
});

// Coffee logs endpoint for frontend compatibility
app.get('/coffeelogs', authenticateToken, async (req, res) => {
    try {
        const logs = await CoffeeLog.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json(logs); // Return logs directly without wrapper
    } catch (error) {
        console.error('Error fetching coffee logs:', error);
        res.status(500).json({ error: 'Failed to fetch coffee logs.' });
    }
});

// Beans endpoint (simplified - could be coffee beans from inventory or separate collection)
app.get('/beans', authenticateToken, async (req, res) => {
    try {
        // For now, return coffee beans from inventory items
        const beans = await InventoryItem.find({ itemType: 'Coffee Beans' });
        res.status(200).json(beans);
    } catch (error) {
        console.error('Error fetching beans:', error);
        res.status(500).json({ error: 'Failed to fetch beans.' });
    }
});

// Delete a coffee log entry
app.delete('/api/coffeelog/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const log = await CoffeeLog.findOneAndDelete({ _id: id, userId: req.user.id });
        
        if (!log) {
            return res.status(404).json({ success: false, message: 'Coffee log entry not found.' });
        }
        
        res.status(200).json({ success: true, message: 'Coffee log entry deleted successfully.' });
    } catch (error) {
        console.error('Error deleting coffee log:', error);
        res.status(500).json({ success: false, message: 'Failed to delete coffee log entry.' });
    }
});

// --- Order API Endpoints ---

// Create a new order
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, totalAmount, customerNotes } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are required.' });
        }
        
        if (typeof totalAmount !== 'number' || totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid total amount is required.' });
        }
        
        const newOrder = new Order({
            userId: req.user.id,
            items,
            totalAmount,
            customerNotes
        });
        
        await newOrder.save();
        res.status(201).json({ success: true, message: 'Order created successfully.', data: newOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to create order.' });
    }
});

// Get orders for the authenticated user
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 orders
        
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
});

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
});

// Get user's usual/most frequent order
app.get('/orders/usual', authenticateToken, async (req, res) => {
    try {
        // Find the user's most recent order or most frequent item
        const recentOrders = await Order.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5);
        
        if (recentOrders.length === 0) {
            return res.status(200).json(null); // No usual order yet
        }
        
        // For now, just return the most recent order's first item
        const usualItem = recentOrders[0].items[0];
        
        res.status(200).json({
            name: usualItem.name,
            description: 'Your most recent order',
            price: usualItem.price,
            id: usualItem.menuItemId
        });
    } catch (error) {
        console.error('Error fetching usual order:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch usual order.' });
    }
});

// Get suggested product for user
app.get('/settings/suggested-product', authenticateToken, async (req, res) => {
    try {
        // Get a random menu item as suggestion
        const menuItemsCollection = db.collection('menuitems');
        const menuItems = await menuItemsCollection.find({ isAvailable: true }).toArray();
        
        if (menuItems.length === 0) {
            return res.status(200).json(null);
        }
        
        // Return a random menu item as suggestion
        const randomIndex = Math.floor(Math.random() * menuItems.length);
        const suggestedItem = menuItems[randomIndex];
        
        res.status(200).json({
            name: suggestedItem.name,
            description: suggestedItem.description || 'Try something new!',
            price: suggestedItem.price,
            imageUrl: suggestedItem.imageUrl || 'default.jpg',
            id: suggestedItem._id
        });
    } catch (error) {
        console.error('Error fetching suggested product:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch suggested product.' });
    }
});

app.post('/api/inventory', authenticateToken, isAdmin, async (req, res) => {
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
app.get('/api/inventory', authenticateToken, isAdmin, async (req, res) => {
    try {
        const items = await InventoryItem.find({}).sort({ itemType: 1, itemName: 1 });
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory items.' });
    }
});

// GET /api/inventory/:id - Get a single inventory item by ID (Admin Only)
app.get('/api/inventory/:id', authenticateToken, isAdmin, async (req, res) => {
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
app.put('/api/inventory/:id', authenticateToken, isAdmin, async (req, res) => {
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
app.delete('/api/inventory/:id', authenticateToken, isAdmin, async (req, res) => {
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