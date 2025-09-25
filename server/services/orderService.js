const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const InventoryItem = require('../models/inventory.model');
const emailService = require('./emailService');
const loyaltyService = require('./loyaltyService');

class OrderService {
  
  /**
   * Create a new order with inventory validation and deduction
   */
  static async createOrder(orderData, session = null) {
    const useSession = session || await mongoose.startSession();
    let shouldEndSession = !session;
    
    try {
      if (shouldEndSession) {
        useSession.startTransaction();
      }
      
      // 1. Validate customer information
      if (!orderData.customer || !orderData.customer.name || !orderData.customer.email) {
        throw new Error('Customer name and email are required');
      }
      
      // 2. Validate and process order items
      const processedItems = [];
      const inventoryDeductions = [];
      
      for (const item of orderData.items) {
        const processedItem = await this.processOrderItem(item, useSession);
        processedItems.push(processedItem.item);
        inventoryDeductions.push(...processedItem.deductions);
      }
      
      // 3. Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.itemTotalPrice, 0);
      const tax = Math.round((subtotal - (orderData.discount || 0)) * 0.0875 * 100) / 100; // 8.75% tax
      const totalAmount = subtotal + tax + (orderData.tip || 0) - (orderData.discount || 0);
      
      // 4. Create the order
      const order = new Order({
        customer: orderData.customer,
        items: processedItems,
        subtotal,
        tax,
        tip: orderData.tip || 0,
        discount: orderData.discount || 0,
        totalAmount,
        promoCode: orderData.promoCode ? {
          code: orderData.promoCode,
          discountPercentage: orderData.discountPercentage || 0,
          appliedAt: new Date()
        } : undefined,
        isTestOrder: Boolean(orderData.isTestOrder),
        notes: orderData.notes,
        specialInstructions: orderData.specialInstructions,
        source: orderData.source || 'website'
      });
      
      // 5. Save order
      await order.save({ session: useSession });
      
      // 6. Apply inventory deductions
      const inventorySnapshot = [];
      for (const deduction of inventoryDeductions) {
        const result = await this.deductInventory(
          deduction.inventoryItem,
          deduction.quantity,
          deduction.reason,
          useSession
        );
        inventorySnapshot.push(result);
      }
      
      // 7. Update order with inventory snapshot
      order.inventorySnapshot = inventorySnapshot;
      await order.save({ session: useSession });
      
      // 8. Check for low stock alerts
      const lowStockItems = await InventoryItem.getLowStockItems().session(useSession);
      if (lowStockItems.length > 0) {
        // Send email and WebSocket notifications
        process.nextTick(async () => {
          try {
            await emailService.sendLowStockAlert(lowStockItems);
          } catch (emailError) {
            console.error('❌ Failed to send low stock email alert:', emailError.message);
          }
          this.emitLowStockAlert(lowStockItems);
        });
      }
      
      if (shouldEndSession) {
        await useSession.commitTransaction();
      }
      
      // 9. Populate order for response
      await order.populate('items.product customer.user');
      
      // 10. Track promo code usage if applicable
      if (orderData.promoCode && orderData.promoId) {
        try {
          const PromoCode = require('../models/promoCode.model');
          await PromoCode.findByIdAndUpdate(
            orderData.promoId,
            { $inc: { usageCount: 1 } },
            { session: useSession }
          );
        } catch (promoError) {
          console.error('Failed to track promo code usage:', promoError);
          // Don't fail the order for promo tracking issues
        }
      }

      // 11. Process reward redemption if applicable
      if (orderData.rewardId && order.customer.user) {
        process.nextTick(async () => {
          try {
            const redemptionResult = await loyaltyService.redeemReward(
              order.customer.user, 
              orderData.rewardId, 
              order._id
            );
            console.log(`🎁 Reward redeemed: ${redemptionResult.reward.name} for ${redemptionResult.pointsUsed} points`);
          } catch (redemptionError) {
            console.error('❌ Failed to redeem reward:', redemptionError.message);
          }
        });
      }

      // 12. Loyalty points are awarded after successful payment in routes/orders.js

      // 13. Send order confirmation email (skip for test orders)
      if (!order.isTestOrder) {
        process.nextTick(async () => {
          try {
            await emailService.sendOrderConfirmation(order);
          } catch (emailError) {
            console.error('❌ Failed to send order confirmation email:', emailError.message);
          }
        });
      }
      
      return {
        success: true,
        order,
        lowStockItems: lowStockItems.length > 0 ? lowStockItems : null
      };
      
    } catch (error) {
      if (shouldEndSession) {
        await useSession.abortTransaction();
      }
      throw error;
    } finally {
      if (shouldEndSession) {
        useSession.endSession();
      }
    }
  }
  
  /**
   * Process a single order item and calculate inventory requirements
   */
  static async processOrderItem(itemData, session) {
    // Validate product exists
    const product = await Product.findById(itemData.productId).session(session);
    if (!product) {
      throw new Error(`Product not found: ${itemData.productId}`);
    }
    
    if (!product.isAvailable) {
      throw new Error(`Product not available: ${product.name}`);
    }
    
    // Create base order item
    const orderItem = {
      product: product._id,
      productName: product.name,
      productPrice: product.price,
      quantity: itemData.quantity || 1,
      customizations: itemData.customizations || {},
      inventoryDeductions: []
    };
    
    // Calculate pricing with customizations
    let itemPrice = product.price;
    const deductions = [];
    
    // Process base recipe if product has one
    if (product.recipe && Array.isArray(product.recipe)) {
      for (const ingredient of product.recipe) {
        if (ingredient.item && ingredient.quantityRequired > 0) {
          const totalQuantityNeeded = ingredient.quantityRequired * orderItem.quantity;
          
          deductions.push({
            inventoryItem: ingredient.item._id,
            quantity: totalQuantityNeeded,
            reason: 'base_recipe'
          });
          
          orderItem.inventoryDeductions.push({
            inventoryItem: ingredient.item._id,
            quantityDeducted: totalQuantityNeeded,
            reason: 'base_recipe'
          });
        }
      }
    }
    
    // Process customizations
    if (itemData.customizations) {
      const customizationResult = await this.processCustomizations(
        itemData.customizations, 
        orderItem.quantity,
        session
      );
      
      itemPrice += customizationResult.additionalPrice;
      deductions.push(...customizationResult.deductions);
      orderItem.inventoryDeductions.push(...customizationResult.inventoryDeductions);
      orderItem.customizations = customizationResult.processedCustomizations;
    }
    
    // Calculate total price for this line item
    orderItem.itemTotalPrice = itemPrice * orderItem.quantity;
    
    return {
      item: orderItem,
      deductions
    };
  }
  
  /**
   * Process customizations and calculate inventory impact
   */
  static async processCustomizations(customizations, quantity, session) {
    let additionalPrice = 0;
    const deductions = [];
    const inventoryDeductions = [];
    const processedCustomizations = { ...customizations };
    
    // Process extra shots
    if (customizations.extraShots && customizations.extraShots.quantity > 0) {
      additionalPrice += customizations.extraShots.quantity * customizations.extraShots.pricePerShot;
      
      // Find espresso/coffee beans in inventory for deduction
      const espressoBeans = await InventoryItem.findOne({
        $or: [
          { itemType: 'Coffee Beans' },
          { itemName: /espresso/i }
        ],
        isAvailable: true
      }).session(session);
      
      if (espressoBeans) {
        const shotQuantity = customizations.extraShots.quantity * quantity;
        deductions.push({
          inventoryItem: espressoBeans._id,
          quantity: shotQuantity * 18, // 18g per shot
          reason: 'extra_shots'
        });
        
        inventoryDeductions.push({
          inventoryItem: espressoBeans._id,
          quantityDeducted: shotQuantity * 18,
          reason: 'extra_shots'
        });
      }
    }
    
    // Process syrup
    if (customizations.syrup && customizations.syrup.inventoryId) {
      additionalPrice += customizations.syrup.price;
      
      deductions.push({
        inventoryItem: customizations.syrup.inventoryId,
        quantity: 30 * quantity, // 30ml per serving
        reason: 'syrup_customization'
      });
      
      inventoryDeductions.push({
        inventoryItem: customizations.syrup.inventoryId,
        quantityDeducted: 30 * quantity,
        reason: 'syrup_customization'
      });
    }
    
    // Process milk
    if (customizations.milk && customizations.milk.inventoryId) {
      additionalPrice += customizations.milk.price;
      
      deductions.push({
        inventoryItem: customizations.milk.inventoryId,
        quantity: 150 * quantity, // 150ml per serving
        reason: 'milk_customization'
      });
      
      inventoryDeductions.push({
        inventoryItem: customizations.milk.inventoryId,
        quantityDeducted: 150 * quantity,
        reason: 'milk_customization'
      });
    }
    
    // Process toppings
    if (customizations.toppings && Array.isArray(customizations.toppings)) {
      for (const topping of customizations.toppings) {
        if (topping.inventoryId) {
          additionalPrice += topping.price;
          
          deductions.push({
            inventoryItem: topping.inventoryId,
            quantity: 15 * quantity, // 15g per serving
            reason: 'topping_customization'
          });
          
          inventoryDeductions.push({
            inventoryItem: topping.inventoryId,
            quantityDeducted: 15 * quantity,
            reason: 'topping_customization'
          });
        }
      }
    }
    
    // Process cold foam
    if (customizations.coldFoam && customizations.coldFoam.added) {
      additionalPrice += customizations.coldFoam.price;
      
      // Cold foam typically uses milk, find default milk
      const milk = await InventoryItem.findOne({
        itemType: 'Milk',
        itemName: /whole|regular/i,
        isAvailable: true
      }).session(session);
      
      if (milk) {
        deductions.push({
          inventoryItem: milk._id,
          quantity: 50 * quantity, // 50ml for cold foam
          reason: 'cold_foam'
        });
        
        inventoryDeductions.push({
          inventoryItem: milk._id,
          quantityDeducted: 50 * quantity,
          reason: 'cold_foam'
        });
      }
    }
    
    return {
      additionalPrice,
      deductions,
      inventoryDeductions,
      processedCustomizations
    };
  }
  
  /**
   * Deduct inventory with validation
   */
  static async deductInventory(inventoryItemId, quantity, reason, session) {
    const inventoryItem = await InventoryItem.findById(inventoryItemId).session(session);
    
    if (!inventoryItem) {
      throw new Error(`Inventory item not found: ${inventoryItemId}`);
    }
    
    if (!inventoryItem.isAvailable) {
      throw new Error(`Inventory item not available: ${inventoryItem.itemName}`);
    }
    
    const result = inventoryItem.deductQuantity(quantity, reason);
    await inventoryItem.save({ session });
    
    return {
      item: inventoryItem._id,
      quantityBefore: result.previousQuantity,
      quantityDeducted: quantity,
      quantityAfter: result.newQuantity
    };
  }
  
  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, newStatus, userId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['completed'],
      'completed': [],
      'cancelled': []
    };
    
    if (!validTransitions[order.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }
    
    const oldStatus = order.status;
    order.status = newStatus;
    
    // Set timestamps based on status
    switch (newStatus) {
      case 'preparing':
        order.prepStartedAt = new Date();
        if (userId) order.assignedBarista = userId;
        break;
      case 'ready':
        order.fulfillment.actualReadyTime = new Date();
        break;
      case 'completed':
        order.fulfillment.pickedUpAt = new Date();
        break;
    }
    
    await order.save();
    
    // Send email notification and emit status change event for real-time updates
    process.nextTick(async () => {
      try {
        await emailService.sendOrderStatusUpdate(order, oldStatus);
      } catch (emailError) {
        console.error('❌ Failed to send order status email:', emailError.message);
      }
      this.emitOrderStatusChange(order, oldStatus, newStatus);
    });
    
    return order;
  }
  
  /**
   * Get orders by various filters
   */
  static async getOrders(filters = {}) {
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.customerId) query['customer.user'] = filters.customerId;
    if (filters.email) query['customer.email'] = filters.email;
    if (filters.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    
    return Order.find(query)
      .populate('customer.user', 'firstName lastName')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);
  }
  
  /**
   * Emit low stock alert via WebSocket to admin users
   */
  static emitLowStockAlert(lowStockItems) {
    console.log('🚨 LOW STOCK ALERT:', lowStockItems.map(item => 
      `${item.itemName}: ${item.quantityInStock}${item.unit} remaining`
    ));
    
    // Send real-time notification to admin room
    if (global.io) {
      global.io.to('admin-room').emit('low-stock-alert', {
        items: lowStockItems,
        timestamp: new Date(),
        message: `Low stock alert: ${lowStockItems.length} items need restocking`
      });
    }
  }
  
  /**
   * Emit order status change via WebSocket to customer
   */
  static emitOrderStatusChange(order, oldStatus, newStatus) {
    console.log(`📱 ORDER STATUS CHANGE - Order ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
    
    // Send real-time notification to customer
    if (global.io && order.customer && order.customer.user) {
      const roomId = `user-${order.customer.user.toString()}`;
      global.io.to(roomId).emit('order-status-changed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        message: `Your order #${order.orderNumber} status has been updated to: ${newStatus}`
      });
    }
  }
  
  /**
   * Cancel order and restore inventory
   */
  static async cancelOrder(orderId, reason = 'Customer request') {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (!order.canBeCancelled()) {
        throw new Error('Order cannot be cancelled in its current status');
      }
      
      // Restore inventory
      for (const snapshot of order.inventorySnapshot) {
        const inventoryItem = await InventoryItem.findById(snapshot.item).session(session);
        if (inventoryItem) {
          inventoryItem.addQuantity(snapshot.quantityDeducted, `order_cancelled:${orderId}`);
          await inventoryItem.save({ session });
        }
      }
      
      // Update order status
      order.status = 'cancelled';
      order.notes = (order.notes || '') + `\\nCancelled: ${reason}`;
      await order.save({ session });
      
      await session.commitTransaction();
      
      return order;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = OrderService;
