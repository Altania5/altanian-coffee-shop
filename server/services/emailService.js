const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Check if we're using SendGrid, Gmail, or other SMTP
    if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.EMAIL_SERVICE === 'gmail') {
      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Use app password for Gmail
        }
      });
    } else {
      // Generic SMTP configuration
      return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
  }

  /**
   * Send order confirmation email to customer
   * @param {Object} order - The order object
   * @returns {Promise} - Email send result
   */
  async sendOrderConfirmation(order) {
    try {
      const emailHtml = this.generateOrderConfirmationHTML(order);
      
      const mailOptions = {
        from: {
          name: 'Altanian Coffee Shop',
          address: process.env.FROM_EMAIL || 'noreply@altaniancoffee.com'
        },
        to: order.customer.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: emailHtml,
        text: this.generateOrderConfirmationText(order)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order confirmation email sent to ${order.customer.email}`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send order status update email to customer
   * @param {Object} order - The order object
   * @param {string} previousStatus - The previous status
   * @returns {Promise} - Email send result
   */
  async sendOrderStatusUpdate(order, previousStatus) {
    try {
      const emailHtml = this.generateStatusUpdateHTML(order, previousStatus);
      
      let subject = `Order Update - ${order.orderNumber}`;
      if (order.status === 'ready') {
        subject = `Your order is ready for pickup! - ${order.orderNumber}`;
      } else if (order.status === 'completed') {
        subject = `Thank you for your order! - ${order.orderNumber}`;
      }
      
      const mailOptions = {
        from: {
          name: 'Altanian Coffee Shop',
          address: process.env.FROM_EMAIL || 'noreply@altaniancoffee.com'
        },
        to: order.customer.email,
        subject: subject,
        html: emailHtml,
        text: this.generateStatusUpdateText(order, previousStatus)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Status update email sent to ${order.customer.email}`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to send status update email:', error);
      throw error;
    }
  }

  /**
   * Send low stock alert to admin
   * @param {Array} lowStockItems - Array of low stock items
   * @returns {Promise} - Email send result
   */
  async sendLowStockAlert(lowStockItems) {
    try {
      if (!lowStockItems || lowStockItems.length === 0) {
        return;
      }

      const emailHtml = this.generateLowStockAlertHTML(lowStockItems);
      
      const mailOptions = {
        from: {
          name: 'Altanian Coffee Shop System',
          address: process.env.FROM_EMAIL || 'noreply@altaniancoffee.com'
        },
        to: process.env.ADMIN_EMAIL || 'admin@altaniancoffee.com',
        subject: `🚨 Low Stock Alert - ${lowStockItems.length} items need attention`,
        html: emailHtml,
        text: this.generateLowStockAlertText(lowStockItems)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Low stock alert sent to admin`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to send low stock alert:', error);
      throw error;
    }
  }

  /**
   * Generate HTML for order confirmation email
   * @param {Object} order - The order object
   * @returns {string} - HTML content
   */
  generateOrderConfirmationHTML(order) {
    const itemsHTML = order.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">
          <strong>${item.product.name}</strong>
          ${item.customizations.size ? `<br><small>Size: ${item.customizations.size}</small>` : ''}
          ${item.customizations.milk ? `<br><small>Milk: ${item.customizations.milk}</small>` : ''}
          ${item.customizations.extraShots > 0 ? `<br><small>Extra shots: ${item.customizations.extraShots}</small>` : ''}
          ${item.customizations.syrups && item.customizations.syrups.length > 0 ? `<br><small>Syrups: ${item.customizations.syrups.join(', ')}</small>` : ''}
          ${item.customizations.specialInstructions ? `<br><small>Special: ${item.customizations.specialInstructions}</small>` : ''}
        </td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">$${item.priceSnapshot.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">$${(item.priceSnapshot * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #8B4513; color: white; padding: 12px; text-align: left; }
          .totals { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>☕ Order Confirmation</h1>
            <p>Thank you for your order!</p>
          </div>
          
          <div class="content">
            <div class="order-info">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Customer:</strong> ${order.customer.name}</p>
              <p><strong>Email:</strong> ${order.customer.email}</p>
              <p><strong>Phone:</strong> ${order.customer.phone || 'Not provided'}</p>
              <p><strong>Status:</strong> <span class="status-badge">${order.getStatusDisplay()}</span></p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            </div>

            <h3>Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div class="totals">
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Subtotal:</span>
                <span>$${order.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Tax:</span>
                <span>$${order.tax.toFixed(2)}</span>
              </div>
              ${order.tip > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Tip:</span>
                <span>$${order.tip.toFixed(2)}</span>
              </div>` : ''}
              ${order.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Discount:</span>
                <span>-$${order.discount.toFixed(2)}</span>
              </div>` : ''}
              <hr>
              <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: bold;">
                <span>Total:</span>
                <span>$${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            ${order.notes ? `
            <div class="order-info">
              <h4>Notes:</h4>
              <p>${order.notes}</p>
            </div>` : ''}

            ${order.specialInstructions ? `
            <div class="order-info">
              <h4>Special Instructions:</h4>
              <p>${order.specialInstructions}</p>
            </div>` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <p>You can track your order status at:</p>
              <a href="${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/order/${order.orderNumber}?email=${encodeURIComponent(order.customer.email)}" 
                 style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Track Order
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Altanian Coffee Shop<br>
            Thank you for choosing us!<br>
            <a href="${process.env.CLIENT_URL || 'https://altaniancoffee.com'}">Visit our website</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text for order confirmation email
   * @param {Object} order - The order object
   * @returns {string} - Plain text content
   */
  generateOrderConfirmationText(order) {
    const itemsText = order.items.map(item => {
      let itemText = `${item.product.name} x${item.quantity} - $${(item.priceSnapshot * item.quantity).toFixed(2)}`;
      if (item.customizations.size) itemText += `\n  Size: ${item.customizations.size}`;
      if (item.customizations.milk) itemText += `\n  Milk: ${item.customizations.milk}`;
      if (item.customizations.extraShots > 0) itemText += `\n  Extra shots: ${item.customizations.extraShots}`;
      if (item.customizations.syrups && item.customizations.syrups.length > 0) {
        itemText += `\n  Syrups: ${item.customizations.syrups.join(', ')}`;
      }
      if (item.customizations.specialInstructions) {
        itemText += `\n  Special: ${item.customizations.specialInstructions}`;
      }
      return itemText;
    }).join('\n\n');

    return `
ALTANIAN COFFEE SHOP - ORDER CONFIRMATION

Thank you for your order!

Order Number: ${order.orderNumber}
Customer: ${order.customer.name}
Email: ${order.customer.email}
Status: ${order.getStatusDisplay()}
Order Date: ${new Date(order.createdAt).toLocaleString()}

ORDER ITEMS:
${itemsText}

TOTALS:
Subtotal: $${order.subtotal.toFixed(2)}
Tax: $${order.tax.toFixed(2)}
${order.tip > 0 ? `Tip: $${order.tip.toFixed(2)}\n` : ''}
${order.discount > 0 ? `Discount: -$${order.discount.toFixed(2)}\n` : ''}
Total: $${order.totalAmount.toFixed(2)}

${order.notes ? `Notes: ${order.notes}\n` : ''}
${order.specialInstructions ? `Special Instructions: ${order.specialInstructions}\n` : ''}

Track your order: ${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/order/${order.orderNumber}?email=${encodeURIComponent(order.customer.email)}

Thank you for choosing Altanian Coffee Shop!
    `.trim();
  }

  /**
   * Generate HTML for status update email
   * @param {Object} order - The order object
   * @param {string} previousStatus - Previous status
   * @returns {string} - HTML content
   */
  generateStatusUpdateHTML(order, previousStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      preparing: 'Your order is now being prepared by our baristas.',
      ready: 'Your order is ready for pickup!',
      completed: 'Your order has been completed. Thank you!',
      cancelled: 'Your order has been cancelled.'
    };

    const statusColors = {
      confirmed: '#28a745',
      preparing: '#ffc107',
      ready: '#17a2b8',
      completed: '#6f42c1',
      cancelled: '#dc3545'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: ${statusColors[order.status] || '#8B4513'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-update { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>☕ Order Status Update</h1>
            <p>Order ${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <div class="status-update">
              <h2>Status: ${order.getStatusDisplay()}</h2>
              <p style="font-size: 16px; color: #333;">${statusMessages[order.status] || 'Your order status has been updated.'}</p>
              <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/order/${order.orderNumber}?email=${encodeURIComponent(order.customer.email)}" 
                 style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                View Order Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Altanian Coffee Shop<br>
            Thank you for your business!<br>
            <a href="${process.env.CLIENT_URL || 'https://altaniancoffee.com'}">Visit our website</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text for status update email
   * @param {Object} order - The order object
   * @param {string} previousStatus - Previous status
   * @returns {string} - Plain text content
   */
  generateStatusUpdateText(order, previousStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      preparing: 'Your order is now being prepared by our baristas.',
      ready: 'Your order is ready for pickup!',
      completed: 'Your order has been completed. Thank you!',
      cancelled: 'Your order has been cancelled.'
    };

    return `
ALTANIAN COFFEE SHOP - ORDER STATUS UPDATE

Order Number: ${order.orderNumber}
Status: ${order.getStatusDisplay()}

${statusMessages[order.status] || 'Your order status has been updated.'}

Updated: ${new Date().toLocaleString()}

View order details: ${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/order/${order.orderNumber}?email=${encodeURIComponent(order.customer.email)}

Thank you for choosing Altanian Coffee Shop!
    `.trim();
  }

  /**
   * Generate HTML for low stock alert email
   * @param {Array} lowStockItems - Array of low stock items
   * @returns {string} - HTML content
   */
  generateLowStockAlertHTML(lowStockItems) {
    const itemsHTML = lowStockItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">${item.itemName}</td>
        <td style="padding: 12px; text-align: center;">${item.quantityInStock} ${item.unit}</td>
        <td style="padding: 12px; text-align: center;">${item.lowStockThreshold} ${item.unit}</td>
        <td style="padding: 12px; text-align: center;">
          <span style="background: ${item.quantityInStock === 0 ? '#dc3545' : '#ffc107'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
            ${item.quantityInStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #343a40; color: white; padding: 12px; text-align: left; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Low Stock Alert</h1>
            <p>${lowStockItems.length} items need your attention</p>
          </div>
          
          <div class="content">
            <p>The following inventory items are running low or out of stock:</p>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Current Stock</th>
                  <th style="text-align: center;">Threshold</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Action Required:</strong> Please restock these items to avoid disruptions to your menu offerings.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/admin/inventory" 
                 style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Manage Inventory
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Altanian Coffee Shop Admin System<br>
            Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text for low stock alert email
   * @param {Array} lowStockItems - Array of low stock items
   * @returns {string} - Plain text content
   */
  generateLowStockAlertText(lowStockItems) {
    const itemsText = lowStockItems.map(item => {
      const status = item.quantityInStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
      return `${item.itemName}: ${item.quantityInStock} ${item.unit} (threshold: ${item.lowStockThreshold}) - ${status}`;
    }).join('\n');

    return `
ALTANIAN COFFEE SHOP - LOW STOCK ALERT

${lowStockItems.length} items need your attention:

${itemsText}

Action Required: Please restock these items to avoid disruptions to your menu offerings.

Manage inventory: ${process.env.CLIENT_URL || 'https://altaniancoffee.com'}/admin/inventory

Generated: ${new Date().toLocaleString()}
    `.trim();
  }
}

module.exports = new EmailService();
