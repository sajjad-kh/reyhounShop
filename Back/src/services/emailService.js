const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/logging');

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error);
        } else {
          console.log('✅ Email service ready for messages');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'E-commerce Platform'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendOrderConfirmation(userId, orderData) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          notificationPreference: true
        }
      });

      if (!user || !user.email) {
        throw new Error('User not found or email not available');
      }

      // Check notification preferences
      if (user.notificationPreference && !user.notificationPreference.emailEnabled) {
        console.log('📧 Email notifications disabled for user:', userId);
        return { success: false, reason: 'Email notifications disabled' };
      }

      const subject = `Order Confirmation - #${orderData.id}`;
      const htmlContent = this.generateOrderConfirmationTemplate(orderData, user);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_CONFIRMATION',
          channel: 'EMAIL',
          title: subject,
          message: `Order #${orderData.id} confirmed`,
          metadata: { orderId: orderData.id }
        }
      });

      const result = await this.sendEmail(user.email, subject, htmlContent);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          failureReason: result.success ? null : result.error
        }
      });

      // Log activity
      await logActivity(userId, 'notification.email.sent', 'Order', orderData.id, {
        type: 'ORDER_CONFIRMATION',
        email: user.email,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOrderStatusUpdate(userId, orderData, newStatus) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          notificationPreference: true
        }
      });

      if (!user || !user.email) {
        throw new Error('User not found or email not available');
      }

      // Check notification preferences
      if (user.notificationPreference && (!user.notificationPreference.emailEnabled || !user.notificationPreference.orderUpdates)) {
        console.log('📧 Order update emails disabled for user:', userId);
        return { success: false, reason: 'Order update emails disabled' };
      }

      const subject = `Order Update - #${orderData.id} is now ${newStatus}`;
      const htmlContent = this.generateOrderStatusUpdateTemplate(orderData, user, newStatus);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_STATUS_UPDATE',
          channel: 'EMAIL',
          title: subject,
          message: `Order #${orderData.id} status updated to ${newStatus}`,
          metadata: { orderId: orderData.id, newStatus }
        }
      });

      const result = await this.sendEmail(user.email, subject, htmlContent);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          failureReason: result.success ? null : result.error
        }
      });

      // Log activity
      await logActivity(userId, 'notification.email.sent', 'Order', orderData.id, {
        type: 'ORDER_STATUS_UPDATE',
        email: user.email,
        newStatus,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send order status update email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentConfirmation(userId, orderData, paymentData) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          notificationPreference: true
        }
      });

      if (!user || !user.email) {
        throw new Error('User not found or email not available');
      }

      // Check notification preferences
      if (user.notificationPreference && !user.notificationPreference.emailEnabled) {
        console.log('📧 Email notifications disabled for user:', userId);
        return { success: false, reason: 'Email notifications disabled' };
      }

      const subject = `Payment Confirmation - Order #${orderData.id}`;
      const htmlContent = this.generatePaymentConfirmationTemplate(orderData, user, paymentData);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT_SUCCESS',
          channel: 'EMAIL',
          title: subject,
          message: `Payment confirmed for order #${orderData.id}`,
          metadata: { orderId: orderData.id, paymentId: paymentData.id }
        }
      });

      const result = await this.sendEmail(user.email, subject, htmlContent);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          failureReason: result.success ? null : result.error
        }
      });

      // Log activity
      await logActivity(userId, 'notification.email.sent', 'Payment', paymentData.id, {
        type: 'PAYMENT_SUCCESS',
        email: user.email,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send payment confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  generateOrderConfirmationTemplate(orderData, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Thank you for your order. We've received your order and it's being processed.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> #${orderData.id}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ${(orderData.totalPrice / 100).toLocaleString()} IRR</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
              ${orderData.trackingCode ? `<p><strong>Tracking Code:</strong> ${orderData.trackingCode}</p>` : ''}
            </div>
            
            <p>We'll send you another email when your order ships.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${orderData.id}" class="button">View Order Details</a>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>E-commerce Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOrderStatusUpdateTemplate(orderData, user, newStatus) {
    const statusMessages = {
      PROCESSING: 'Your order is being prepared',
      SHIPPED: 'Your order has been shipped',
      DELIVERED: 'Your order has been delivered',
      CANCELLED: 'Your order has been cancelled',
      DELAYED: 'Your order has been delayed'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .status-update { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Your order status has been updated.</p>
            
            <div class="status-update">
              <h3>Order #${orderData.id}</h3>
              <p><strong>New Status:</strong> ${newStatus}</p>
              <p>${statusMessages[newStatus] || 'Your order status has been updated'}</p>
              ${orderData.trackingCode ? `<p><strong>Tracking Code:</strong> ${orderData.trackingCode}</p>` : ''}
              <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${orderData.id}" class="button">Track Your Order</a>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>E-commerce Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentConfirmationTemplate(orderData, user, paymentData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .payment-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .success { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p class="success">✅ Your payment has been successfully processed!</p>
            
            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>Order Number:</strong> #${orderData.id}</p>
              <p><strong>Amount Paid:</strong> ${(paymentData.amount / 100).toLocaleString()} ${paymentData.currency}</p>
              <p><strong>Payment Method:</strong> ${paymentData.gateway}</p>
              <p><strong>Transaction ID:</strong> ${paymentData.gatewayTxnId || paymentData.gatewayRef}</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Your order is now being processed and will be shipped soon.</p>
          </div>
          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>E-commerce Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new EmailService();