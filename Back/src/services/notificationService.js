const { getPrismaClient } = require('../utils/database');

class NotificationService {
  /**
   * Get Prisma client instance
   */
  getPrisma() {
    return getPrismaClient();
  }
  /**
   * Send order status notification
   * @param {number} orderId - Order ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   */
  async sendOrderStatusNotification(orderId, oldStatus, newStatus) {
    try {
      // Get order details with user information
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for notification:', orderId);
        return;
      }

      // Prepare notification data
      const notificationData = {
        orderId: order.id,
        trackingCode: order.trackingCode,
        oldStatus,
        newStatus,
        user: order.user
      };

      // Send email notification
      await this.sendEmailNotification(notificationData);

      // Send SMS notification for important status changes
      if (this.shouldSendSMS(newStatus)) {
        await this.sendSMSNotification(notificationData);
      }

      // Log notification activity
      await this.logActivity({
        userId: order.user.id,
        action: ActivityAction.SYSTEM_EVENT,
        entity: 'Order',
        entityId: orderId,
        metadata: {
          event: 'notification_sent',
          type: 'status_change',
          oldStatus,
          newStatus,
          channels: [
            'email',
            ...(this.shouldSendSMS(newStatus) ? ['sms'] : [])
          ]
        }
      });

    } catch (error) {
      console.error('Failed to send order status notification:', error);
    }
  }

  /**
   * Send email notification for order status change
   * @param {Object} notificationData - Notification data
   */
  async sendEmailNotification(notificationData) {
    try {
      const { orderId, trackingCode, oldStatus, newStatus, user } = notificationData;
      
      // Email template based on status
      const emailContent = this.getEmailTemplate(newStatus, {
        userName: user.name,
        orderId,
        trackingCode,
        oldStatus,
        newStatus
      });

      // In a real implementation, this would integrate with an email service
      // For now, we'll log the email content
      console.log('Email notification sent:', {
        to: user.email,
        subject: emailContent.subject,
        body: emailContent.body
      });

      // Store notification record
      await this.storeNotificationRecord({
        userId: user.id,
        type: 'email',
        channel: 'order_status',
        recipient: user.email,
        subject: emailContent.subject,
        content: emailContent.body,
        status: 'sent',
        relatedEntityType: 'Order',
        relatedEntityId: orderId
      });

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send SMS notification for order status change
   * @param {Object} notificationData - Notification data
   */
  async sendSMSNotification(notificationData) {
    try {
      const { orderId, trackingCode, newStatus, user } = notificationData;
      
      if (!user.phone) {
        console.log('No phone number available for SMS notification');
        return;
      }

      // SMS template based on status
      const smsContent = this.getSMSTemplate(newStatus, {
        userName: user.name,
        orderId,
        trackingCode
      });

      // In a real implementation, this would integrate with an SMS service (Kavenegar, etc.)
      // For now, we'll log the SMS content
      console.log('SMS notification sent:', {
        to: user.phone,
        message: smsContent
      });

      // Store notification record
      await this.storeNotificationRecord({
        userId: user.id,
        type: 'sms',
        channel: 'order_status',
        recipient: user.phone,
        content: smsContent,
        status: 'sent',
        relatedEntityType: 'Order',
        relatedEntityId: orderId
      });

    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  }

  /**
   * Check if SMS should be sent for this status
   * @param {string} status - Order status
   * @returns {boolean} Should send SMS
   */
  shouldSendSMS(status) {
    // Send SMS for important status changes
    const smsStatuses = ['SHIPPED', 'DELIVERED', 'CANCELLED'];
    return smsStatuses.includes(status);
  }

  /**
   * Get email template for order status
   * @param {string} status - Order status
   * @param {Object} data - Template data
   * @returns {Object} Email template
   */
  getEmailTemplate(status, data) {
    const templates = {
      'PROCESSING': {
        subject: `Order #${data.orderId} is being processed`,
        body: `Dear ${data.userName},\n\nYour order #${data.orderId} is now being processed. We'll notify you when it ships.\n\nTracking Code: ${data.trackingCode}\n\nThank you for your order!`
      },
      'SHIPPED': {
        subject: `Order #${data.orderId} has been shipped`,
        body: `Dear ${data.userName},\n\nGreat news! Your order #${data.orderId} has been shipped and is on its way to you.\n\nTracking Code: ${data.trackingCode}\n\nYou can track your package using this code.`
      },
      'DELIVERED': {
        subject: `Order #${data.orderId} has been delivered`,
        body: `Dear ${data.userName},\n\nYour order #${data.orderId} has been successfully delivered.\n\nTracking Code: ${data.trackingCode}\n\nWe hope you enjoy your purchase! Please consider leaving a review.`
      },
      'CANCELLED': {
        subject: `Order #${data.orderId} has been cancelled`,
        body: `Dear ${data.userName},\n\nYour order #${data.orderId} has been cancelled. If you didn't request this cancellation, please contact our support team.\n\nTracking Code: ${data.trackingCode}\n\nAny payment will be refunded within 3-5 business days.`
      },
      'DELAYED': {
        subject: `Order #${data.orderId} has been delayed`,
        body: `Dear ${data.userName},\n\nWe apologize, but your order #${data.orderId} has been delayed. We're working to resolve this and will update you soon.\n\nTracking Code: ${data.trackingCode}\n\nThank you for your patience.`
      }
    };

    return templates[status] || {
      subject: `Order #${data.orderId} status update`,
      body: `Dear ${data.userName},\n\nYour order #${data.orderId} status has been updated to ${status}.\n\nTracking Code: ${data.trackingCode}`
    };
  }

  /**
   * Get SMS template for order status
   * @param {string} status - Order status
   * @param {Object} data - Template data
   * @returns {string} SMS content
   */
  getSMSTemplate(status, data) {
    const templates = {
      'SHIPPED': `Hi ${data.userName}, your order #${data.orderId} has been shipped! Track: ${data.trackingCode}`,
      'DELIVERED': `Hi ${data.userName}, your order #${data.orderId} has been delivered! Track: ${data.trackingCode}`,
      'CANCELLED': `Hi ${data.userName}, your order #${data.orderId} has been cancelled. Contact support if needed. Track: ${data.trackingCode}`
    };

    return templates[status] || `Hi ${data.userName}, your order #${data.orderId} status: ${status}. Track: ${data.trackingCode}`;
  }

  /**
   * Store notification record in database
   * @param {Object} notificationData - Notification data to store
   */
  async storeNotificationRecord(notificationData) {
    try {
      await this.logActivity({
        userId: notificationData.userId,
        action: ActivityAction.SYSTEM_EVENT,
        entity: notificationData.relatedEntityType,
        entityId: notificationData.relatedEntityId,
        metadata: {
          event: 'notification_delivered',
          type: notificationData.type,
          channel: notificationData.channel,
          recipient: notificationData.recipient,
          status: notificationData.status,
          subject: notificationData.subject,
          contentLength: notificationData.content?.length
        }
      });
    } catch (error) {
      console.error('Failed to store notification record:', error);
    }
  }

  /**
   * Send order confirmation notification
   * @param {number} orderId - Order ID
   */
  async sendOrderConfirmationNotification(orderId) {
    try {
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for confirmation notification:', orderId);
        return;
      }

      const emailContent = {
        subject: `Order Confirmation #${order.id}`,
        body: `Dear ${order.user.name},\n\nThank you for your order! Here are the details:\n\nOrder #${order.id}\nTracking Code: ${order.trackingCode}\nTotal: ${order.totalPrice} IRR\n\nItems:\n${order.items.map(item => `- ${item.product.name} (Qty: ${item.quantity})`).join('\n')}\n\nWe'll notify you when your order ships.`
      };

      console.log('Order confirmation email sent:', {
        to: order.user.email,
        subject: emailContent.subject,
        body: emailContent.body
      });

      await this.storeNotificationRecord({
        userId: order.user.id,
        type: 'email',
        channel: 'order_confirmation',
        recipient: order.user.email,
        subject: emailContent.subject,
        content: emailContent.body,
        status: 'sent',
        relatedEntityType: 'Order',
        relatedEntityId: orderId
      });

    } catch (error) {
      console.error('Failed to send order confirmation notification:', error);
    }
  }

  /**
   * Send payment confirmation notification
   * @param {number} orderId - Order ID
   * @param {string} paymentStatus - Payment status
   */
  async sendPaymentNotification(orderId, paymentStatus) {
    try {
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for payment notification:', orderId);
        return;
      }

      let emailContent;
      if (paymentStatus === 'SUCCESS') {
        emailContent = {
          subject: `Payment Confirmed for Order #${order.id}`,
          body: `Dear ${order.user.name},\n\nYour payment for order #${order.id} has been successfully processed.\n\nAmount: ${order.totalPrice} IRR\nTracking Code: ${order.trackingCode}\n\nYour order is now being processed.`
        };
      } else {
        emailContent = {
          subject: `Payment Failed for Order #${order.id}`,
          body: `Dear ${order.user.name},\n\nWe were unable to process your payment for order #${order.id}.\n\nAmount: ${order.totalPrice} IRR\nTracking Code: ${order.trackingCode}\n\nPlease try again or contact support.`
        };
      }

      console.log('Payment notification email sent:', {
        to: order.user.email,
        subject: emailContent.subject,
        body: emailContent.body
      });

      await this.storeNotificationRecord({
        userId: order.user.id,
        type: 'email',
        channel: 'payment_status',
        recipient: order.user.email,
        subject: emailContent.subject,
        content: emailContent.body,
        status: 'sent',
        relatedEntityType: 'Order',
        relatedEntityId: orderId
      });

    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }

  /**
   * Log activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  async logActivity(userId, action, entity, entityId, details = {}) {
    try {
      await this.getPrisma().activityLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          details
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Schedule a notification for later delivery
   * @param {Object} notificationData - Notification data
   * @param {Date} scheduledAt - When to send the notification
   */
  async scheduleNotification(notificationData, scheduledAt = null) {
    try {
      const {
        userId,
        type,
        channel,
        title,
        message,
        metadata = {}
      } = notificationData;

      // Check user preferences before scheduling
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(preferences, type, channel)) {
        console.log(`Notification skipped due to user preferences: ${type} via ${channel}`);
        return null;
      }

      const notification = await this.getPrisma().notification.create({
        data: {
          userId,
          type,
          channel,
          title,
          message,
          status: 'PENDING',
          scheduledAt: scheduledAt || new Date(),
          metadata
        }
      });

      // If scheduled for immediate delivery, process it
      if (!scheduledAt || scheduledAt <= new Date()) {
        await this.processNotification(notification.id);
      }

      return notification;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Process a pending notification
   * @param {number} notificationId - Notification ID
   */
  async processNotification(notificationId) {
    try {
      const notification = await this.getPrisma().notification.findUnique({
        where: { id: notificationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!notification || notification.status !== 'PENDING') {
        return;
      }

      let success = false;
      let failureReason = null;

      try {
        if (notification.channel === 'EMAIL') {
          success = await this.sendEmail(notification);
        } else if (notification.channel === 'SMS') {
          success = await this.sendSMS(notification);
        }
      } catch (error) {
        failureReason = error.message;
        console.error(`Failed to send ${notification.channel} notification:`, error);
      }

      // Update notification status
      await this.getPrisma().notification.update({
        where: { id: notificationId },
        data: {
          status: success ? 'SENT' : 'FAILED',
          sentAt: success ? new Date() : null,
          failureReason
        }
      });

      // Log activity
      await this.logActivity({
        userId: notification.userId,
        action: ActivityAction.SYSTEM_EVENT,
        entity: 'Notification',
        entityId: notificationId,
        metadata: {
          event: 'notification_processed',
          type: notification.type,
          channel: notification.channel,
          status: success ? 'SENT' : 'FAILED',
          failureReason
        }
      });

    } catch (error) {
      console.error('Failed to process notification:', error);
    }
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @returns {boolean} Success status
   */
  async sendEmail(notification) {
    try {
      // In a real implementation, this would integrate with an email service
      // For now, we'll simulate email sending
      console.log('Email notification sent:', {
        to: notification.user.email,
        subject: notification.title,
        body: notification.message,
        type: notification.type
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   * @param {Object} notification - Notification object
   * @returns {boolean} Success status
   */
  async sendSMS(notification) {
    try {
      if (!notification.user.phone) {
        throw new Error('No phone number available');
      }

      // In a real implementation, this would integrate with an SMS service (Kavenegar, etc.)
      // For now, we'll simulate SMS sending
      console.log('SMS notification sent:', {
        to: notification.user.phone,
        message: notification.message,
        type: notification.type
      });

      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   * @returns {Object} User preferences
   */
  async getUserPreferences(userId) {
    try {
      let preferences = await this.getPrisma().notificationPreference.findUnique({
        where: { userId }
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await this.getPrisma().notificationPreference.create({
          data: {
            userId,
            emailEnabled: true,
            smsEnabled: true,
            orderUpdates: true,
            promotions: false
          }
        });
      }

      return preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return {
        emailEnabled: true,
        smsEnabled: true,
        orderUpdates: true,
        promotions: false
      };
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   * @param {Object} preferences - User preferences
   * @param {string} type - Notification type
   * @param {string} channel - Notification channel
   * @returns {boolean} Should send notification
   */
  shouldSendNotification(preferences, type, channel) {
    // Check channel preferences
    if (channel === 'EMAIL' && !preferences.emailEnabled) {
      return false;
    }
    if (channel === 'SMS' && !preferences.smsEnabled) {
      return false;
    }

    // Check type preferences
    const orderTypes = ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'];
    if (orderTypes.includes(type) && !preferences.orderUpdates) {
      return false;
    }

    if (type === 'PROMOTION' && !preferences.promotions) {
      return false;
    }

    return true;
  }

  /**
   * Process pending notifications (for scheduled delivery)
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await this.getPrisma().notification.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            lte: new Date()
          }
        },
        take: 50, // Process in batches
        orderBy: {
          scheduledAt: 'asc' // Process oldest first
        }
      });

      let processedCount = 0;
      let failedCount = 0;

      for (const notification of pendingNotifications) {
        try {
          await this.processNotification(notification.id);
          processedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Failed to process notification ${notification.id}:`, error);
        }
      }

      console.log(`Processed ${processedCount} notifications, ${failedCount} failed`);
      
      return {
        processed: processedCount,
        failed: failedCount,
        total: pendingNotifications.length
      };
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
      return {
        processed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(timeframe = '24h') {
    try {
      let startDate;
      switch (timeframe) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const stats = await this.getPrisma().notification.groupBy({
        by: ['status', 'type', 'channel'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        }
      });

      const summary = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        byType: {},
        byChannel: {}
      };

      stats.forEach(stat => {
        const count = stat._count.id;
        summary.total += count;
        summary[stat.status.toLowerCase()] += count;

        if (!summary.byType[stat.type]) {
          summary.byType[stat.type] = 0;
        }
        summary.byType[stat.type] += count;

        if (!summary.byChannel[stat.channel]) {
          summary.byChannel[stat.channel] = 0;
        }
        summary.byChannel[stat.channel] += count;
      });

      return summary;
    } catch (error) {
      console.error('Failed to get delivery stats:', error);
      return null;
    }
  }

  /**
   * Retry failed notifications with exponential backoff
   */
  async retryFailedNotifications(maxRetries = 3) {
    try {
      // SQLite does not support array JSON paths — filter retry count in memory
      const failedCandidates = await this.getPrisma().notification.findMany({
        where: { status: 'FAILED' },
        take: 50
      });

      const failedNotifications = failedCandidates
        .filter(notification => {
          const metadata = notification.metadata || {};
          if (metadata.permanentFailure) return false;
          const retryCount = metadata.retryCount ?? 0;
          return retryCount < maxRetries;
        })
        .slice(0, 20);

      let retriedCount = 0;
      let permanentFailures = 0;

      for (const notification of failedNotifications) {
        try {
          const retryCount = (notification.metadata?.retryCount || 0) + 1;
          
          if (retryCount > maxRetries) {
            // Mark as permanently failed
            await this.getPrisma().notification.update({
              where: { id: notification.id },
              data: {
                metadata: {
                  ...notification.metadata,
                  retryCount,
                  permanentFailure: true
                }
              }
            });
            permanentFailures++;
            continue;
          }

          // Calculate exponential backoff delay
          const backoffDelay = Math.pow(2, retryCount - 1) * 60 * 1000; // 1min, 2min, 4min, etc.
          const scheduledAt = new Date(Date.now() + backoffDelay);

          // Reset to pending with updated retry count and scheduled time
          await this.getPrisma().notification.update({
            where: { id: notification.id },
            data: {
              status: 'PENDING',
              scheduledAt,
              metadata: {
                ...(notification.metadata || {}),
                retryCount,
                lastRetryAt: new Date().toISOString()
              }
            }
          });

          retriedCount++;
        } catch (error) {
          console.error(`Failed to retry notification ${notification.id}:`, error);
        }
      }

      console.log(`Retry process: ${retriedCount} notifications scheduled for retry, ${permanentFailures} marked as permanent failures`);
      
      return {
        retried: retriedCount,
        permanentFailures,
        total: failedNotifications.length
      };
    } catch (error) {
      console.error('Failed to retry failed notifications:', error);
      return {
        retried: 0,
        permanentFailures: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await this.getPrisma().notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          status: {
            in: ['SENT', 'CANCELLED']
          }
        }
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  /**
   * Send order status notification using new system
   * @param {number} orderId - Order ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   */
  async sendOrderStatusNotificationV2(orderId, oldStatus, newStatus) {
    try {
      // Get order details with user information
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for notification:', orderId);
        return;
      }

      // Prepare notification data
      const emailData = {
        userId: order.user.id,
        type: 'ORDER_STATUS_UPDATE',
        channel: 'EMAIL',
        title: `Order #${order.id} Status Update`,
        message: this.getEmailTemplate(newStatus, {
          userName: order.user.name,
          orderId: order.id,
          trackingCode: order.trackingCode,
          oldStatus,
          newStatus
        }).body,
        metadata: {
          orderId,
          oldStatus,
          newStatus,
          trackingCode: order.trackingCode
        }
      };

      // Schedule email notification
      await this.scheduleNotification(emailData);

      // Schedule SMS notification for important status changes
      if (this.shouldSendSMS(newStatus)) {
        const smsData = {
          userId: order.user.id,
          type: 'ORDER_STATUS_UPDATE',
          channel: 'SMS',
          title: `Order #${order.id} Update`,
          message: this.getSMSTemplate(newStatus, {
            userName: order.user.name,
            orderId: order.id,
            trackingCode: order.trackingCode
          }),
          metadata: {
            orderId,
            oldStatus,
            newStatus,
            trackingCode: order.trackingCode
          }
        };

        await this.scheduleNotification(smsData);
      }

    } catch (error) {
      console.error('Failed to send order status notification:', error);
    }
  }

  /**
   * Send order confirmation notification using new system
   * @param {number} orderId - Order ID
   */
  async sendOrderConfirmationNotificationV2(orderId) {
    try {
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for confirmation notification:', orderId);
        return;
      }

      const emailData = {
        userId: order.user.id,
        type: 'ORDER_CONFIRMATION',
        channel: 'EMAIL',
        title: `Order Confirmation #${order.id}`,
        message: `Dear ${order.user.name},\n\nThank you for your order! Here are the details:\n\nOrder #${order.id}\nTracking Code: ${order.trackingCode}\nTotal: ${order.totalPrice} IRR\n\nItems:\n${order.items.map(item => `- ${item.product.name} (Qty: ${item.quantity})`).join('\n')}\n\nWe'll notify you when your order ships.`,
        metadata: {
          orderId,
          trackingCode: order.trackingCode,
          totalPrice: order.totalPrice,
          itemCount: order.items.length
        }
      };

      await this.scheduleNotification(emailData);

    } catch (error) {
      console.error('Failed to send order confirmation notification:', error);
    }
  }

  /**
   * Send payment notification using new system
   * @param {number} orderId - Order ID
   * @param {string} paymentStatus - Payment status
   */
  async sendPaymentNotificationV2(orderId, paymentStatus) {
    try {
      const order = await this.getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('Order not found for payment notification:', orderId);
        return;
      }

      const type = paymentStatus === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
      let title, message;

      if (paymentStatus === 'SUCCESS') {
        title = `Payment Confirmed for Order #${order.id}`;
        message = `Dear ${order.user.name},\n\nYour payment for order #${order.id} has been successfully processed.\n\nAmount: ${order.totalPrice} IRR\nTracking Code: ${order.trackingCode}\n\nYour order is now being processed.`;
      } else {
        title = `Payment Failed for Order #${order.id}`;
        const note = order.paymentRejectionReason
          ? `\n\nReason:\n${order.paymentRejectionReason}`
          : '';
        message = `Dear ${order.user.name},\n\nYour payment receipt for order #${order.id} was not confirmed.\n\nAmount: ${order.totalPrice} IRR\nTracking Code: ${order.trackingCode}${note}\n\nYou can submit a new receipt from your order history or contact support.`;
      }

      const emailData = {
        userId: order.user.id,
        type,
        channel: 'EMAIL',
        title,
        message,
        metadata: {
          orderId,
          paymentStatus,
          totalPrice: order.totalPrice,
          trackingCode: order.trackingCode
        }
      };

      await this.scheduleNotification(emailData);

    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }

  /**
   * Send Basalam order confirmation notification
   * @param {number} orderId - Basalam order ID
   */
  async sendBasalamOrderConfirmation(orderId) {
    try {
      const order = await this.getPrisma().basalamOrder.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('[NotificationService] Basalam order not found for confirmation:', orderId);
        return;
      }

      // Parse items from JSON
      const items = typeof order.itemsJson === 'string' 
        ? JSON.parse(order.itemsJson) 
        : order.itemsJson;

      const itemsList = items.map(item => 
        `- ${item.name || 'محصول'} (تعداد: ${item.quantity})`
      ).join('\n');

      const emailData = {
        userId: order.user.id,
        type: 'BASALAM_ORDER_CONFIRMATION',
        channel: 'EMAIL',
        title: `تایید سفارش بسلام #${order.id}`,
        message: `${order.user.name} عزیز،\n\nسفارش شما در بسلام با موفقیت ثبت شد!\n\nشماره سفارش: #${order.id}\n${order.orderNumber ? `کد پیگیری بسلام: ${order.orderNumber}\n` : ''}مبلغ کل: ${order.totalAmount} ریال\n\nمحصولات:\n${itemsList}\n\nپس از پرداخت، سفارش شما پردازش خواهد شد.`,
        metadata: {
          orderId,
          basalamOrderId: order.basalamOrderId,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount.toString(),
          itemCount: items.length
        }
      };

      await this.scheduleNotification(emailData);

      console.log('[NotificationService] Basalam order confirmation notification scheduled:', orderId);

    } catch (error) {
      console.error('[NotificationService] Failed to send Basalam order confirmation:', error);
      // Don't throw - notification failures should not block order flow
    }
  }

  /**
   * Send Basalam payment notification
   * @param {number} orderId - Basalam order ID
   * @param {string} status - Payment status ('success' or 'failed')
   */
  async sendBasalamPaymentNotification(orderId, status) {
    try {
      const order = await this.getPrisma().basalamOrder.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('[NotificationService] Basalam order not found for payment notification:', orderId);
        return;
      }

      const isSuccess = status === 'success' || status === 'paid';
      const type = isSuccess ? 'BASALAM_PAYMENT_SUCCESS' : 'BASALAM_PAYMENT_FAILED';
      
      let title, message;

      if (isSuccess) {
        title = `پرداخت سفارش بسلام #${order.id} موفق بود`;
        message = `${order.user.name} عزیز،\n\nپرداخت سفارش شما در بسلام با موفقیت انجام شد.\n\nشماره سفارش: #${order.id}\n${order.orderNumber ? `کد پیگیری بسلام: ${order.orderNumber}\n` : ''}مبلغ پرداختی: ${order.totalAmount} ریال\n${order.paymentTransactionId ? `شماره تراکنش: ${order.paymentTransactionId}\n` : ''}\nسفارش شما در حال پردازش است و به زودی ارسال خواهد شد.`;
      } else {
        title = `پرداخت سفارش بسلام #${order.id} ناموفق بود`;
        message = `${order.user.name} عزیز،\n\nمتاسفانه پرداخت سفارش شما در بسلام ناموفق بود.\n\nشماره سفارش: #${order.id}\n${order.orderNumber ? `کد پیگیری بسلام: ${order.orderNumber}\n` : ''}مبلغ: ${order.totalAmount} ریال\n\nلطفا مجددا تلاش کنید یا با پشتیبانی تماس بگیرید.`;
      }

      const emailData = {
        userId: order.user.id,
        type,
        channel: 'EMAIL',
        title,
        message,
        metadata: {
          orderId,
          basalamOrderId: order.basalamOrderId,
          orderNumber: order.orderNumber,
          paymentStatus: status,
          totalAmount: order.totalAmount.toString(),
          transactionId: order.paymentTransactionId
        }
      };

      await this.scheduleNotification(emailData);

      // Send SMS for successful payments
      if (isSuccess && order.user.phone) {
        const smsData = {
          userId: order.user.id,
          type,
          channel: 'SMS',
          title: `پرداخت سفارش بسلام #${order.id}`,
          message: `${order.user.name} عزیز، پرداخت سفارش بسلام #${order.id} با موفقیت انجام شد. مبلغ: ${order.totalAmount} ریال`,
          metadata: {
            orderId,
            basalamOrderId: order.basalamOrderId,
            paymentStatus: status
          }
        };

        await this.scheduleNotification(smsData);
      }

      console.log('[NotificationService] Basalam payment notification scheduled:', { orderId, status });

    } catch (error) {
      console.error('[NotificationService] Failed to send Basalam payment notification:', error);
      // Don't throw - notification failures should not block order flow
    }
  }

  /**
   * Send Basalam order status update notification
   * @param {number} orderId - Basalam order ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   */
  async sendBasalamOrderStatusUpdate(orderId, oldStatus, newStatus) {
    try {
      const order = await this.getPrisma().basalamOrder.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        console.error('[NotificationService] Basalam order not found for status update:', orderId);
        return;
      }

      // Map status to Persian
      const statusMap = {
        'pending_payment': 'در انتظار پرداخت',
        'paid': 'پرداخت شده',
        'payment_failed': 'پرداخت ناموفق',
        'processing': 'در حال پردازش',
        'shipped': 'ارسال شده',
        'delivered': 'تحویل داده شده',
        'cancelled': 'لغو شده',
        'returned': 'مرجوع شده'
      };

      const oldStatusText = statusMap[oldStatus] || oldStatus;
      const newStatusText = statusMap[newStatus] || newStatus;

      const emailData = {
        userId: order.user.id,
        type: 'BASALAM_ORDER_STATUS_UPDATE',
        channel: 'EMAIL',
        title: `بروزرسانی وضعیت سفارش بسلام #${order.id}`,
        message: `${order.user.name} عزیز،\n\nوضعیت سفارش شما در بسلام تغییر کرد.\n\nشماره سفارش: #${order.id}\n${order.orderNumber ? `کد پیگیری بسلام: ${order.orderNumber}\n` : ''}وضعیت قبلی: ${oldStatusText}\nوضعیت جدید: ${newStatusText}\n\nبرای مشاهده جزئیات بیشتر به پنل کاربری خود مراجعه کنید.`,
        metadata: {
          orderId,
          basalamOrderId: order.basalamOrderId,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus,
          oldStatusText,
          newStatusText
        }
      };

      await this.scheduleNotification(emailData);

      // Send SMS for important status changes
      const importantStatuses = ['shipped', 'delivered', 'cancelled'];
      if (importantStatuses.includes(newStatus) && order.user.phone) {
        const smsData = {
          userId: order.user.id,
          type: 'BASALAM_ORDER_STATUS_UPDATE',
          channel: 'SMS',
          title: `وضعیت سفارش بسلام #${order.id}`,
          message: `${order.user.name} عزیز، وضعیت سفارش بسلام #${order.id}: ${newStatusText}`,
          metadata: {
            orderId,
            basalamOrderId: order.basalamOrderId,
            newStatus
          }
        };

        await this.scheduleNotification(smsData);
      }

      console.log('[NotificationService] Basalam order status update notification scheduled:', { 
        orderId, 
        oldStatus, 
        newStatus 
      });

    } catch (error) {
      console.error('[NotificationService] Failed to send Basalam order status update:', error);
      // Don't throw - notification failures should not block order flow
    }
  }
}

module.exports = new NotificationService();
