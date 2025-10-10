const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { dualAuth, optionalDualAuth } = require('../middleware/dualAuth');
const Order = require('../models/order.model');
const OrderService = require('../services/orderService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user.model');
const loyaltyService = require('../services/loyaltyService');

const awardLoyaltyIfEligible = async (order, userId) => {
  if (!userId || order.loyaltyAwarded || order.totalAmount <= 0) {
    return;
  }

  try {
    const loyaltyResult = await loyaltyService.awardPoints(userId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount
    });
    console.log(`✅ Awarded ${loyaltyResult.pointsEarned} loyalty points to user ${userId}`);
    order.loyaltyAwarded = true;
    await order.save();
    if (loyaltyResult.tierUpgraded) {
      console.log(`🎉 User tier upgraded to ${loyaltyResult.newTier}!`);
    }
  } catch (loyaltyError) {
    console.error('❌ Failed to award loyalty points:', loyaltyError.message);
  }
};

/**
 * @route   POST /orders
 * @desc    Create a new order
 * @access  Public (for guest orders) / Private (for user orders)
 */
router.post('/', optionalDualAuth, async (req, res) => {
  try {
    const { items, customer, tip, notes, specialInstructions, paymentMethodId, rewardId, discount, promoCode, promoId, skipPayment, testOrder } = req.body;
    
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
      customer.id = req.user.id;
    }
    
    // Create order through service
    const orderData = {
      items,
      customer,
      tip: tip || 0,
      discount: discount || 0,
      rewardId: rewardId || undefined,
      promoCode: promoCode || undefined,
      promoId: promoId || undefined,
      notes,
      specialInstructions,
      source: 'website',
      isTestOrder: Boolean(testOrder)
    };
    
    const result = await OrderService.createOrder(orderData);
    
    // Admin/Owner-only: Skip payment and mark as test order
    if (skipPayment && req.user && (req.user.role === 'owner' || req.user.role === 'admin')) {
      try {
        result.order.payment.status = 'completed';
        result.order.payment.method = 'test';
        result.order.payment.paidAt = new Date();
        result.order.status = 'confirmed';
        result.order.isTestOrder = true;
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
              customerName: customer.name,
              testOrder: true
            }
          );
        }

        return res.status(201).json({
          success: true,
          order: result.order,
          testOrder: true,
          lowStockAlert: result.lowStockItems
        });
      } catch (skipErr) {
        console.error('Skip payment error:', skipErr);
        return res.status(400).json({ success: false, message: 'Failed to create test order' });
      }
    }
    
    // If payment method provided, process payment
    if (paymentMethodId && result.order.totalAmount > 0) {
      try {
        let customerId = null;
        if (customer.user) {
          const user = await User.findById(customer.user);
          if (user && user.stripeCustomerId) {
            customerId = user.stripeCustomerId;
          }
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(result.order.totalAmount * 100), // Convert to cents
          currency: 'usd',
          customer: customerId || undefined,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: Boolean(customerId),
          automatic_payment_methods: customerId ? undefined : {
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

          if (customer.user) {
            process.nextTick(() => awardLoyaltyIfEligible(result.order, customer.user));
          }
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

        if (customer.user) {
          process.nextTick(() => awardLoyaltyIfEligible(result.order, customer.user));
        }
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
router.get('/', dualAuth, async (req, res) => {
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
 * @route   GET /orders/history
 * @desc    Get user's order history
 * @access  Private
 */
router.get('/history', dualAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, from, to } = req.query;

    const query = { 'customer.user': req.user.id };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      count: orders.length,
      total,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
      filters: { from: from || null, to: to || null }
    });
    
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history'
    });
  }
});

/**
 * @route   GET /orders/usual
 * @desc    Get user's most ordered product (legacy endpoint)
 * @access  Private
 */
router.get('/usual', dualAuth, async (req, res) => {
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
router.get('/myorders', dualAuth, async (req, res) => {
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
 * @route   GET /orders/user/summary
 * @desc    Get current user's orders grouped by status
 * @access  Private
 */
router.get('/user/summary', dualAuth, async (req, res) => {
  try {
    const { from, to, activeLimit = 10, activeOffset = 0, pastLimit = 10, pastOffset = 0 } = req.query;
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    const pastStatuses = ['completed', 'cancelled'];

    const baseQuery = { 'customer.user': req.user.id };
    if (from || to) {
      baseQuery.createdAt = {};
      if (from) baseQuery.createdAt.$gte = new Date(from);
      if (to) baseQuery.createdAt.$lte = new Date(to);
    }

    const [activeDocs, activeCount] = await Promise.all([
      Order.find({ ...baseQuery, status: { $in: activeStatuses } })
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(activeLimit))
        .skip(parseInt(activeOffset)),
      Order.countDocuments({ ...baseQuery, status: { $in: activeStatuses } })
    ]);

    const activeOrders = activeDocs.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      estimatedTime: order.fulfillment?.estimatedReadyTime || order.estimatedPickupTime,
      items: order.items.map(item => ({
        quantity: item.quantity,
        productName: item.productName || item.product?.name || 'Item'
      }))
    }));

    const [pastDocs, pastCount] = await Promise.all([
      Order.find({ ...baseQuery, status: { $in: pastStatuses } })
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(pastLimit))
        .skip(parseInt(pastOffset)),
      Order.countDocuments({ ...baseQuery, status: { $in: pastStatuses } })
    ]);

    const pastOrders = pastDocs.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      items: order.items.map(item => ({
        quantity: item.quantity,
        productName: item.productName || item.product?.name || 'Item'
      }))
    }));

    res.json({
      success: true,
      activeOrders,
      pastOrders,
      counts: {
        active: activeCount,
        past: pastCount,
        total: activeCount + pastCount
      },
      pagination: {
        active: { limit: parseInt(activeLimit), offset: parseInt(activeOffset) },
        past: { limit: parseInt(pastLimit), offset: parseInt(pastOffset) }
      },
      filters: { from: from || null, to: to || null }
    });
  } catch (error) {
    console.error('Get user order summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order summary'
    });
  }
});

router.post('/payment-methods/setup-intent', dualAuth, async (req, res) => {
  try {
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`.trim()
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customerId });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId
    });

    res.json({ success: true, clientSecret: setupIntent.client_secret, customerId });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ success: false, message: 'Failed to create setup intent' });
  }
});

router.get('/payment-methods', dualAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, paymentMethods: user?.savedPaymentMethods || [] });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payment methods' });
  }
});

router.post('/payment-methods', dualAuth, async (req, res) => {
  try {
    const { paymentMethodId, setDefault } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Payment method ID is required' });
    }

    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Stripe customer not found for user' });
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!paymentMethod || paymentMethod.customer !== customerId) {
      return res.status(400).json({ success: false, message: 'Payment method not found for customer' });
    }

    const methodData = {
      paymentMethodId: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      isDefault: Boolean(setDefault)
    };

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (methodData.isDefault) {
      user.savedPaymentMethods.forEach(pm => { pm.isDefault = false; });
    }

    const existingIndex = user.savedPaymentMethods.findIndex(pm => pm.paymentMethodId === paymentMethod.id);
    if (existingIndex >= 0) {
      user.savedPaymentMethods[existingIndex] = methodData;
    } else {
      user.savedPaymentMethods.push(methodData);
    }

    await user.save();

    res.json({ success: true, paymentMethod: methodData });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to save payment method' });
  }
});

router.delete('/payment-methods/:paymentMethodId', dualAuth, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.savedPaymentMethods = user.savedPaymentMethods.filter(pm => pm.paymentMethodId !== paymentMethodId);
    await user.save();

    if (req.user.stripeCustomerId) {
      try {
        await stripe.paymentMethods.detach(paymentMethodId);
      } catch (detachError) {
        console.warn(`Failed to detach payment method ${paymentMethodId}:`, detachError.message);
      }
    }

    res.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove payment method' });
  }
});

/**
 * @route   GET /orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', dualAuth, async (req, res) => {
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
router.put('/:id/status', dualAuth, async (req, res) => {
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
    
    // Award loyalty points on completion if not already awarded and not a test order
    if (status === 'completed' && order.customer?.user && !order.loyaltyAwarded && !order.isTestOrder) {
      try {
        const loyaltyResult = await loyaltyService.awardPoints(order.customer.user, {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount
        });
        order.loyaltyAwarded = true;
        await order.save();
      } catch (e) {
        console.warn('Failed to award loyalty on completion:', e.message);
      }
    }

    // Push notification to customer on order completion
    if (status === 'completed' && order.customer?.user) {
      try {
        await pushService.sendToUser(order.customer.user, {
          title: 'Order Ready for Pickup',
          message: `Your order #${order.orderNumber} is completed and ready!`,
          data: { orderId: order._id.toString(), orderNumber: order.orderNumber }
        });
      } catch (e) {
        console.warn('Failed to send push to customer:', e.message);
      }
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
router.post('/:id/cancel', dualAuth, async (req, res) => {
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
router.get('/admin/dashboard', dualAuth, async (req, res) => {
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
          ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
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
