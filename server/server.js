const express = require('express');
const path = require('path');
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
      ? "https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com"
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 5003;

// Create HTTP server for WebSocket integration
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

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
>>>>>>> 83790a08f4b74119b94a383356887d1ffb58d053

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
    });
}

server.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
<<<<<<< HEAD
    console.log(`📡 WebSocket server ready for real-time order tracking`);
=======
    console.log(`🔌 Socket.IO server is ready for real-time connections`);
>>>>>>> 83790a08f4b74119b94a383356887d1ffb58d053
});