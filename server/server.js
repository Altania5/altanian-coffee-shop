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
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6
});
const port = process.env.PORT || 5003;

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

const uri = process.env.ATLAS_URI;
console.log('ATLAS_URI:', uri ? 'Found (length: ' + uri.length + ')' : 'NOT FOUND');
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
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

// Initialize WebSocket server for real-time order tracking
const OrderTrackingServer = require('./websocket/orderTracking');
const orderTrackingWS = new OrderTrackingServer(server);

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
        console.log('Request for:', req.path);
        
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
            console.log('API route, returning 404');
            return res.status(404).json({ error: 'Not found' });
        }
        
        // Check if the requested file exists
        const filePath = path.join(buildPath, req.path);
        console.log('Checking file:', filePath);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            console.log('Serving file:', filePath);
            return res.sendFile(filePath);
        }
        
        // Serve index.html for React routes
        console.log('Serving index.html for route:', req.path);
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

server.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
    console.log(`📡 WebSocket server ready for real-time order tracking`);
    console.log(`🔌 Socket.IO server is ready for real-time connections`);
});