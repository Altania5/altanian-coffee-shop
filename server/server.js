const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com", "https://www.altaniancoffee.com", "https://altaniancoffee.com"]
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  allowEIO4: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  forceBase64: false,
  serveClient: false,
  compression: false // Disable compression to avoid frame issues
});
const port = process.env.PORT || 5002;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ["https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com", "https://www.altaniancoffee.com", "https://altaniancoffee.com"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());

// Add headers to prevent caching issues
app.use((req, res, next) => {
  // Don't cache HTML files
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

const uri = process.env.ATLAS_URI || 'mongodb+srv://coffeeshop_app_db:Alex998863-_@cluster0.z1v17tk.mongodb.net/coffeeshop_app_db?retryWrites=true&w=majority&appName=Cluster0';
console.log('ATLAS_URI:', uri ? 'Found (length: ' + uri.length + ')' : 'NOT FOUND');
mongoose.connect(uri).catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Trying fallback connection...');
  mongoose.connect('mongodb://localhost:27017/altaniancoffee').catch(fallbackErr => {
    console.error('Fallback MongoDB connection also failed:', fallbackErr);
    console.log('Server will continue without database connection');
  });
});
const connection = mongoose.connection;
connection.once('open', async () => {
  console.log("MongoDB database connection established successfully");
  
  // Initialize AI Service after database connection
  try {
    const aiService = require('./services/centralizedAIService');
    await aiService.initialize();
  } catch (error) {
    console.error('❌ Error initializing AI Service:', error);
  }
})

const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const beansRouter = require('./routes/beans');
const coffeeLogsRouter = require('./routes/coffeeLogs');
const inventoryRouter = require('./routes/inventory');
const settingsRouter = require('./routes/settings');
const promoCodesRouter = require('./routes/promoCodes');
const paymentsRouter = require('./routes/payments');
const loyaltyRouter = require('./routes/loyalty');
const beanBagsRouter = require('./routes/beanBags');
const aiRouter = require('./routes/ai');
const aiModelsRouter = require('./routes/aiModels');
const coffeeArtRouter = require('./routes/coffeeArt');
const socialFeaturesRouter = require('./routes/socialFeatures');
const healthInsightsRouter = require('./routes/healthInsights');

app.use('/products', productsRouter);
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);
app.use('/beans', beansRouter);
app.use('/coffeelogs', coffeeLogsRouter);
app.use('/inventory', inventoryRouter);
app.use('/settings', settingsRouter);
app.use('/promocodes', promoCodesRouter);
app.use('/payments', paymentsRouter);
app.use('/loyalty', loyaltyRouter);
app.use('/beanbags', beanBagsRouter);
app.use('/ai', aiRouter);
app.use('/ai-models', aiModelsRouter);
app.use('/coffee-art', coffeeArtRouter);
app.use('/social', socialFeaturesRouter);
app.use('/health', healthInsightsRouter);

// Initialize WebSocket server for real-time order tracking
const OrderTrackingServer = require('./websocket/orderTracking');
const orderTrackingWS = new OrderTrackingServer(server);

// Initialize Centralized AI Service
const aiService = require('./services/realMLService');

// Make WebSocket server available to routes
app.set('orderTrackingWS', orderTrackingWS);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Join user to appropriate room based on role
  socket.on('join-room', (userRole, userId) => {
    if (userRole === 'owner') {
      socket.join('admin-room');
      console.log(`👑 Admin ${userId} joined admin room`);
    } else {
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  // Handle order status updates
  socket.on('order-status-update', (orderData) => {
    const { orderId, userId, status } = orderData;
    socket.to(`user-${userId}`).emit('order-status-changed', {
      orderId,
      status,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io available globally for other modules
global.io = io;

if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'client', 'build');
    
    // Serve static files from the React app build directory
    app.use('/static', express.static(path.join(buildPath, 'static'), {
        maxAge: '1d',
        etag: true,
        lastModified: true
    }));
    
    // Serve other static files (favicon, manifest, etc.)
    app.use(express.static(buildPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        index: false
    }));

    // Handle React routing - return index.html for all non-API routes
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/users/') ||
            req.path.startsWith('/products/') ||
            req.path.startsWith('/orders/') ||
            req.path.startsWith('/beans/') ||
            req.path.startsWith('/coffeelogs/') ||
            req.path.startsWith('/inventory/') ||
            req.path.startsWith('/settings/') ||
            req.path.startsWith('/promocodes/') ||
            req.path.startsWith('/payments/') ||
            req.path.startsWith('/loyalty/') ||
            req.path.startsWith('/beanbags/') ||
            req.path.startsWith('/socket.io/')) {
            return res.status(404).json({ error: 'Not found' });
        }
        
        // Check if the requested file exists
        const filePath = path.join(buildPath, req.path);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return res.sendFile(filePath);
        }
        
        // Serve index.html for React routes
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

server.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
    console.log(`📡 WebSocket server ready for real-time order tracking`);
    console.log(`🔌 Socket.IO server is ready for real-time connections`);
});