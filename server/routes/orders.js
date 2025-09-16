const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Order = require('../models/order.model');
const OrderService = require('../services/orderService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * @route   POST /orders
 * @desc    Create a new order
 * @access  Public (for guest orders) / Private (for user orders)
 */
router.post('/', async (req, res) => {
  try {
    const { items, customer, tip, notes, specialInstructions, paymentMethodId, rewardId, discount } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Items are required and must be a non-empty array' 
      });
    }
    
    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name and email are required' 
      });
    }
    
    // Add user ID to customer if authenticated
    if (req.user) {
      customer.user = req.user.id;
    }
    
    // Create order through service
    const orderData = {
      items,
      customer,
      tip: tip || 0,
      discount: discount || 0,
      rewardId: rewardId || undefined,
      notes,
      specialInstructions,
      source: 'website'
    };
    
    const result = await OrderService.createOrder(orderData);
    
    // If payment method provided, process payment
    if (paymentMethodId && result.order.totalAmount > 0) {
      try {
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(result.order.totalAmount * 100), // Convert to cents
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            orderId: result.order._id.toString(),
            orderNumber: result.order.orderNumber,
            customerEmail: customer.email
          }
        });
        
        // Update order with payment info
        result.order.payment.stripePaymentIntentId = paymentIntent.id;
        result.order.payment.method = 'stripe';
        
        if (paymentIntent.status === 'succeeded') {
          result.order.payment.status = 'completed';
          result.order.payment.paidAt = new Date();
          result.order.status = 'confirmed';
        } else {
          result.order.payment.status = 'processing';
        }
        
        await result.order.save();
        
        // Broadcast new order creation via WebSocket
        const orderTrackingWS = req.app.get('orderTrackingWS');
        if (orderTrackingWS) {
          orderTrackingWS.broadcastOrderUpdate(
            result.order._id.toString(),
            result.order.status,
            {
              orderNumber: result.order.orderNumber,
              estimatedTime: calculateEstimatedTime(result.order.status),
              isNewOrder: true,
              customerName: customer.name
            }
          );
        }
        
        res.status(201).json({
          success: true,
          order: result.order,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            client_secret: paymentIntent.client_secret
          },
          lowStockAlert: result.lowStockItems
        });
        
      } catch (paymentError) {
        // Payment failed, but order was created - mark as pending
        result.order.payment.status = 'failed';
        await result.order.save();
        
        res.status(400).json({
          success: false,
          message: 'Payment failed',
          error: paymentError.message,
          order: result.order // Still return order for potential retry
        });
      }
    } else {
      // No payment method (cash order or zero total)
      if (result.order.totalAmount === 0) {
        result.order.payment.status = 'completed';
        result.order.status = 'confirmed';
        await result.order.save();
      }
      
      res.status(201).json({
        success: true,
        order: result.order,
        lowStockAlert: result.lowStockItems
      });
    }
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

/**
 * @route   GET /orders
 * @desc    Get orders (admin gets all, users get their own)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, today, limit } = req.query;
    const filters = {};
    
    // If not admin/owner, only show user's own orders
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      filters.customerId = req.user.id;
    }
    
    if (status) filters.status = status;
    if (today) filters.today = true;
    if (limit) filters.limit = parseInt(limit);
    
    const orders = await OrderService.getOrders(filters);
    
    res.json({
      success: true,
      orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

/**
 * @route   GET /orders/usual
 * @desc    Get user's most ordered product (legacy endpoint)
 * @access  Private
 */
router.get('/usual', auth, async (req, res) => {
  try {
    const result = await Order.aggregate([
      { $match: { 'customer.user': new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.product',
        totalOrdered: { $sum: '$items.quantity' }
      }},
      { $sort: { totalOrdered: -1 } },
      { $limit: 1 },
      { $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }},
      { $unwind: '$productDetails' },
      { $project: {
        _id: 0,
        product: '$productDetails'
      }}
    ]);

    if (result.length > 0) {
      res.json(result[0].product);
    } else {
      res.json(null); // No orders found for this user
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /orders/myorders
 * @desc    Get user's orders (legacy endpoint)
 * @access  Private
 */
router.get('/myorders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.user': req.user.id })
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer.user', 'firstName lastName')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user has access to this order
    if (req.user.role !== 'owner' && 
        req.user.role !== 'admin' && 
        order.customer.user?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

/**
 * @route   GET /orders/number/:orderNumber
 * @desc    Get order by order number (for customer lookup)
 * @access  Public
 */
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query; // Require email for security
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to lookup order'
      });
    }
    
    const order = await Order.findOne({ 
      orderNumber,
      'customer.email': email.toLowerCase()
    }).populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

/**
 * @route   PUT /orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin/Owner)
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required'
      });
    }
    
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const order = await OrderService.updateOrderStatus(req.params.id, status, req.user.id);
    
    // Broadcast real-time update via WebSocket
    const orderTrackingWS = req.app.get('orderTrackingWS');
    if (orderTrackingWS) {
      const estimatedTime = calculateEstimatedTime(status);
      orderTrackingWS.broadcastOrderUpdate(
        order._id.toString(),
        status,
        {
          orderNumber: order.orderNumber,
          estimatedTime,
          updatedBy: req.user.firstName,
          statusDisplay: order.getStatusDisplay()
        }
      );
    }
    
    res.json({
      success: true,
      order,
      message: `Order status updated to ${order.getStatusDisplay()}`
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
});

// Helper function to calculate estimated completion time
function calculateEstimatedTime(status) {
  const now = new Date();
  const timeEstimates = {
    'pending': 15,      // 15 minutes
    'confirmed': 12,    // 12 minutes
    'preparing': 8,      // 8 minutes
    'ready': 0,         // Ready now
    'completed': 0,      // Already done
    'cancelled': 0       // No time needed
  };
  
  const minutes = timeEstimates[status] || 10;
  const estimatedTime = new Date(now.getTime() + minutes * 60000);
  return estimatedTime.toISOString();
}

/**
 * @route   POST /orders/:id/cancel
 * @desc    Cancel order and restore inventory
 * @access  Private
 */
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check access - user can cancel their own orders, admin can cancel any
    if (req.user.role !== 'owner' && 
        req.user.role !== 'admin' && 
        order.customer.user?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const cancelledOrder = await OrderService.cancelOrder(
      req.params.id, 
      reason || 'Cancelled by user'
    );
    
    res.json({
      success: true,
      order: cancelledOrder,
      message: 'Order cancelled successfully'
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});

/**
 * @route   GET /orders/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin/Owner)
 */
router.get('/admin/dashboard', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required'
      });
    }
    
    // Get today's orders
    const todaysOrders = await Order.getTodaysOrders();
    
    // Get orders by status for today
    const ordersByStatus = {
      pending: todaysOrders.filter(o => o.status === 'pending').length,
      confirmed: todaysOrders.filter(o => o.status === 'confirmed').length,
      preparing: todaysOrders.filter(o => o.status === 'preparing').length,
      ready: todaysOrders.filter(o => o.status === 'ready').length,
      completed: todaysOrders.filter(o => o.status === 'completed').length,
      cancelled: todaysOrders.filter(o => o.status === 'cancelled').length
    };
    
    // Calculate today's revenue
    const todaysRevenue = todaysOrders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Get low stock items
    const InventoryItem = require('../models/inventory.model');
    const lowStockItems = await InventoryItem.getLowStockItems();
    
    res.json({
      success: true,
      dashboard: {
        todaysOrders: {
          total: todaysOrders.length,
          revenue: todaysRevenue,
          byStatus: ordersByStatus
        },
        activeOrders: todaysOrders.filter(o => 
          ['confirmed', 'preparing', 'ready'].includes(o.status)
        ),
        lowStockItems: lowStockItems.map(item => ({
          id: item._id,
          name: item.itemName,
          currentStock: item.quantityInStock,
          threshold: item.lowStockThreshold,
          unit: item.unit
        }))
      }
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * @route   POST /orders/webhook/stripe
 * @desc    Handle Stripe webhooks
 * @access  Public (Stripe)
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            order.payment.status = 'completed';
            order.payment.paidAt = new Date();
            order.payment.stripeChargeId = paymentIntent.latest_charge;
            
            // Confirm the order if payment succeeded
            if (order.status === 'pending') {
              order.status = 'confirmed';
            }
            
            await order.save();
            console.log(`✅ Payment confirmed for order ${order.orderNumber}`);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedOrderId = failedPayment.metadata.orderId;
        
        if (failedOrderId) {
          const order = await Order.findById(failedOrderId);
          if (order) {
            order.payment.status = 'failed';
            await order.save();
            console.log(`❌ Payment failed for order ${order.orderNumber}`);
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
