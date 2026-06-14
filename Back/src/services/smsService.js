const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/logging');

const prisma = new PrismaClient();

class SMSService {
  constructor() {
    this.kavenegarApiKey = process.env.KAVENEGAR_API_KEY;
    this.kavenegarBaseUrl = 'https://api.kavenegar.com/v1';
    this.senderNumber = process.env.SMS_SENDER_NUMBER || '10008663';
  }

  async sendSMS(to, message, template = null) {
    try {
      if (!this.kavenegarApiKey) {
        throw new Error('Kavenegar API key not configured');
      }

      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = to.replace(/\D/g, '');
      
      // Ensure Iranian phone number format
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith('0')) {
        formattedPhone = '98' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('98')) {
        formattedPhone = '98' + cleanPhone;
      }

      const url = `${this.kavenegarBaseUrl}/${this.kavenegarApiKey}/sms/send.json`;
      
      const data = {
        receptor: formattedPhone,
        message: message,
        sender: this.senderNumber
      };

      const response = await axios.post(url, data);
      
      if (response.data && response.data.return && response.data.return.status === 200) {
        console.log('✅ SMS sent successfully:', response.data.entries[0].messageid);
        return {
          success: true,
          messageId: response.data.entries[0].messageid,
          status: response.data.entries[0].status,
          cost: response.data.entries[0].cost
        };
      } else {
        throw new Error(`SMS sending failed: ${response.data.return.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to send SMS:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.return?.message || error.message
      };
    }
  }

  async sendTemplateSMS(to, template, params) {
    try {
      if (!this.kavenegarApiKey) {
        throw new Error('Kavenegar API key not configured');
      }

      // Clean phone number
      const cleanPhone = to.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith('0')) {
        formattedPhone = '98' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('98')) {
        formattedPhone = '98' + cleanPhone;
      }

      const url = `${this.kavenegarBaseUrl}/${this.kavenegarApiKey}/verify/lookup.json`;
      
      const data = {
        receptor: formattedPhone,
        template: template,
        ...params // token, token2, token3, etc.
      };

      const response = await axios.post(url, data);
      
      if (response.data && response.data.return && response.data.return.status === 200) {
        console.log('✅ Template SMS sent successfully:', response.data.entries[0].messageid);
        return {
          success: true,
          messageId: response.data.entries[0].messageid,
          status: response.data.entries[0].status
        };
      } else {
        throw new Error(`Template SMS sending failed: ${response.data.return.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to send template SMS:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.return?.message || error.message
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

      if (!user || !user.phone) {
        throw new Error('User not found or phone number not available');
      }

      // Check notification preferences
      if (user.notificationPreference && !user.notificationPreference.smsEnabled) {
        console.log('📱 SMS notifications disabled for user:', userId);
        return { success: false, reason: 'SMS notifications disabled' };
      }

      const message = `سلام ${user.name}
سفارش شما با شماره ${orderData.id} ثبت شد.
مبلغ: ${(orderData.totalPrice / 100).toLocaleString()} تومان
وضعیت: در حال بررسی
فروشگاه آنلاین`;

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_CONFIRMATION',
          channel: 'SMS',
          title: 'تایید سفارش',
          message: `سفارش #${orderData.id} ثبت شد`,
          metadata: { orderId: orderData.id }
        }
      });

      const result = await this.sendSMS(user.phone, message);

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
      await logActivity(userId, 'notification.sms.sent', 'Order', orderData.id, {
        type: 'ORDER_CONFIRMATION',
        phone: user.phone,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send order confirmation SMS:', error);
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

      if (!user || !user.phone) {
        throw new Error('User not found or phone number not available');
      }

      // Check notification preferences
      if (user.notificationPreference && (!user.notificationPreference.smsEnabled || !user.notificationPreference.orderUpdates)) {
        console.log('📱 Order update SMS disabled for user:', userId);
        return { success: false, reason: 'Order update SMS disabled' };
      }

      const statusMessages = {
        PROCESSING: 'در حال آماده‌سازی',
        SHIPPED: 'ارسال شده',
        DELIVERED: 'تحویل داده شده',
        CANCELLED: 'لغو شده',
        DELAYED: 'به تعویق افتاده'
      };

      const message = `سلام ${user.name}
وضعیت سفارش ${orderData.id} به‌روزرسانی شد:
${statusMessages[newStatus] || newStatus}
${orderData.trackingCode ? `کد پیگیری: ${orderData.trackingCode}` : ''}
فروشگاه آنلاین`;

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_STATUS_UPDATE',
          channel: 'SMS',
          title: 'به‌روزرسانی سفارش',
          message: `سفارش #${orderData.id} به ${statusMessages[newStatus]} تغییر یافت`,
          metadata: { orderId: orderData.id, newStatus }
        }
      });

      const result = await this.sendSMS(user.phone, message);

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
      await logActivity(userId, 'notification.sms.sent', 'Order', orderData.id, {
        type: 'ORDER_STATUS_UPDATE',
        phone: user.phone,
        newStatus,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send order status update SMS:', error);
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

      if (!user || !user.phone) {
        throw new Error('User not found or phone number not available');
      }

      // Check notification preferences
      if (user.notificationPreference && !user.notificationPreference.smsEnabled) {
        console.log('📱 SMS notifications disabled for user:', userId);
        return { success: false, reason: 'SMS notifications disabled' };
      }

      const message = `سلام ${user.name}
پرداخت سفارش ${orderData.id} با موفقیت انجام شد.
مبلغ: ${(paymentData.amount / 100).toLocaleString()} تومان
کد تراکنش: ${paymentData.gatewayTxnId || paymentData.gatewayRef}
فروشگاه آنلاین`;

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT_SUCCESS',
          channel: 'SMS',
          title: 'تایید پرداخت',
          message: `پرداخت سفارش #${orderData.id} تایید شد`,
          metadata: { orderId: orderData.id, paymentId: paymentData.id }
        }
      });

      const result = await this.sendSMS(user.phone, message);

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
      await logActivity(userId, 'notification.sms.sent', 'Payment', paymentData.id, {
        type: 'PAYMENT_SUCCESS',
        phone: user.phone,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to send payment confirmation SMS:', error);
      return { success: false, error: error.message };
    }
  }

  async sendLowStockAlert(productData, adminUsers) {
    try {
      const message = `هشدار موجودی کم!
محصول: ${productData.name}
موجودی فعلی: ${productData.stock}
حد آستانه: ${productData.lowStockAlert}
فروشگاه آنلاین`;

      const results = [];
      
      for (const admin of adminUsers) {
        if (admin.phone) {
          // Create notification record
          const notification = await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'PROMOTION', // Using PROMOTION as closest type for alerts
              channel: 'SMS',
              title: 'هشدار موجودی کم',
              message: `موجودی محصول ${productData.name} کم است`,
              metadata: { productId: productData.id, currentStock: productData.stock }
            }
          });

          const result = await this.sendSMS(admin.phone, message);
          
          // Update notification status
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sentAt: result.success ? new Date() : null,
              failureReason: result.success ? null : result.error
            }
          });

          results.push({
            adminId: admin.id,
            phone: admin.phone,
            success: result.success,
            error: result.error
          });
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('❌ Failed to send low stock alert SMS:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeliveryStatus(messageId) {
    try {
      if (!this.kavenegarApiKey) {
        throw new Error('Kavenegar API key not configured');
      }

      const url = `${this.kavenegarBaseUrl}/${this.kavenegarApiKey}/sms/status.json`;
      
      const response = await axios.post(url, {
        messageid: messageId
      });

      if (response.data && response.data.return && response.data.return.status === 200) {
        return {
          success: true,
          status: response.data.entries[0].status,
          statusText: response.data.entries[0].statustext
        };
      } else {
        throw new Error(`Status check failed: ${response.data.return.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to check SMS delivery status:', error);
      return {
        success: false,
        error: error.response?.data?.return?.message || error.message
      };
    }
  }
}

module.exports = new SMSService();