const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class OrderTrackingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/orders'
    });
    this.clients = new Map(); // userId -> WebSocket connection
    this.orderSubscriptions = new Map(); // orderId -> Set of userIds
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection established');
      
      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Authentication token required');
        return;
      }

      try {
        // Verify JWT token
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`👤 User ${user.firstName} connected to WebSocket`);
        
        // Store client connection
        this.clients.set(user.id, ws);
        
        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'CONNECTION_ESTABLISHED',
          message: 'Connected to order tracking',
          userId: user.id
        }));

        // Handle incoming messages
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleMessage(user.id, data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Invalid message format'
            }));
          }
        });

        // Handle connection close
        ws.on('close', () => {
          console.log(`👋 User ${user.firstName} disconnected from WebSocket`);
          this.clients.delete(user.id);
          this.removeUserFromSubscriptions(user.id);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${user.id}:`, error);
          this.clients.delete(user.id);
        });

      } catch (error) {
        console.error('JWT verification failed:', error);
        ws.close(1008, 'Invalid authentication token');
      }
    });
  }

  handleMessage(userId, data) {
    switch (data.type) {
      case 'SUBSCRIBE_ORDER':
        this.subscribeToOrder(userId, data.orderId);
        break;
      case 'UNSUBSCRIBE_ORDER':
        this.unsubscribeFromOrder(userId, data.orderId);
        break;
      case 'PING':
        this.sendToUser(userId, { type: 'PONG', timestamp: Date.now() });
        break;
      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  subscribeToOrder(userId, orderId) {
    if (!this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.set(orderId, new Set());
    }
    this.orderSubscriptions.get(orderId).add(userId);
    
    console.log(`📋 User ${userId} subscribed to order ${orderId}`);
    
    this.sendToUser(userId, {
      type: 'SUBSCRIPTION_CONFIRMED',
      orderId,
      message: 'Subscribed to order updates'
    });
  }

  unsubscribeFromOrder(userId, orderId) {
    if (this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.get(orderId).delete(userId);
      
      // Clean up empty subscriptions
      if (this.orderSubscriptions.get(orderId).size === 0) {
        this.orderSubscriptions.delete(orderId);
      }
    }
    
    console.log(`📋 User ${userId} unsubscribed from order ${orderId}`);
  }

  removeUserFromSubscriptions(userId) {
    for (const [orderId, subscribers] of this.orderSubscriptions.entries()) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.orderSubscriptions.delete(orderId);
      }
    }
  }

  // Broadcast order update to all subscribed users
  broadcastOrderUpdate(orderId, status, additionalData = {}) {
    const subscribers = this.orderSubscriptions.get(orderId);
    if (!subscribers || subscribers.size === 0) {
      console.log(`No subscribers for order ${orderId}`);
      return;
    }

    const updateMessage = {
      type: 'ORDER_UPDATE',
      orderId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    console.log(`📢 Broadcasting order update for ${orderId}: ${status}`);
    
    subscribers.forEach(userId => {
      this.sendToUser(userId, updateMessage);
    });
  }

  // Send message to specific user
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
        this.clients.delete(userId);
      }
    }
  }

  // Get connection statistics
  getStats() {
    return {
      connectedUsers: this.clients.size,
      activeSubscriptions: this.orderSubscriptions.size,
      totalSubscribers: Array.from(this.orderSubscriptions.values())
        .reduce((sum, set) => sum + set.size, 0)
    };
  }

  // Close all connections
  close() {
    this.wss.close();
    this.clients.clear();
    this.orderSubscriptions.clear();
  }
}

module.exports = OrderTrackingServer;

