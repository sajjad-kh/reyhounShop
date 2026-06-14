const { getPrismaClient } = require('../utils/database');
const notificationService = require('./notificationService');

class NotificationManagementService {
  /**
   * Create notification preferences for a new user
   * @param {number} userId - User ID
   * @param {Object} preferences - Initial preferences
   */
  async createUserPreferences(userId, preferences = {}) {
    try {
      const defaultPreferences = {
        emailEnabled: true,
        smsEnabled: true,
        orderUpdates: true,
        promotions: false,
        ...preferences
      };

      const userPreferences = await getPrismaClient().notificationPreference.create({
        data: {
          userId,
          ...defaultPreferences
        }
      });

      return userPreferences;
    } catch (error) {
      console.error('Failed to create user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {number} userId - User ID
   * @param {Object} preferences - Updated preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const userPreferences = await getPrismaClient().notificationPreference.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          emailEnabled: true,
          smsEnabled: true,
          orderUpdates: true,
          promotions: false,
          ...preferences
        }
      });

      return userPreferences;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   */
  async getUserPreferences(userId) {
    try {
      let preferences = await getPrismaClient().notificationPreference.findUnique({
        where: { userId }
      });

      if (!preferences) {
        preferences = await this.createUserPreferences(userId);
      }

      return preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Schedule a notification with preference checking
   * @param {Object} notificationData - Notification data
   * @param {Date} scheduledAt - When to send (optional)
   */
  async scheduleNotification(notificationData, scheduledAt = null) {
    try {
      return await notificationService.scheduleNotification(notificationData, scheduledAt);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Schedule bulk notifications
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data
   * @param {Date} scheduledAt - When to send (optional)
   */
  async scheduleBulkNotifications(userIds, notificationData, scheduledAt = null) {
    try {
      const results = {
        successful: [],
        failed: []
      };

      for (const userId of userIds) {
        try {
          const notification = await notificationService.scheduleNotification({
            ...notificationData,
            userId
          }, scheduledAt);

          if (notification) {
            results.successful.push({ userId, notificationId: notification.id });
          } else {
            results.failed.push({ userId, reason: 'Blocked by user preferences' });
          }
        } catch (error) {
          results.failed.push({ userId, reason: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to schedule bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification history for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filters (type, channel, status, etc.)
   * @param {Object} pagination - Pagination options
   */
  async getUserNotificationHistory(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...filters
      };

      const [notifications, total] = await Promise.all([
        getPrismaClient().notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            type: true,
            channel: true,
            title: true,
            message: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            failureReason: true,
            createdAt: true
          }
        }),
        getPrismaClient().notification.count({ where })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get user notification history:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   * @param {number} userId - User ID
   */
  async getUserNotificationStats(userId) {
    try {
      const stats = await getPrismaClient().notification.groupBy({
        by: ['status', 'type', 'channel'],
        where: { userId },
        _count: {
          id: true
        }
      });

      const processedStats = {
        byStatus: {},
        byType: {},
        byChannel: {},
        total: 0
      };

      stats.forEach(stat => {
        const count = stat._count.id;
        processedStats.total += count;

        if (!processedStats.byStatus[stat.status]) {
          processedStats.byStatus[stat.status] = 0;
        }
        processedStats.byStatus[stat.status] += count;

        if (!processedStats.byType[stat.type]) {
          processedStats.byType[stat.type] = 0;
        }
        processedStats.byType[stat.type] += count;

        if (!processedStats.byChannel[stat.channel]) {
          processedStats.byChannel[stat.channel] = 0;
        }
        processedStats.byChannel[stat.channel] += count;
      });

      return processedStats;
    } catch (error) {
      console.error('Failed to get user notification stats:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for authorization)
   */
  async cancelNotification(notificationId, userId) {
    try {
      const notification = await getPrismaClient().notification.findFirst({
        where: {
          id: notificationId,
          userId
        }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'PENDING') {
        throw new Error('Only pending notifications can be cancelled');
      }

      const updatedNotification = await getPrismaClient().notification.update({
        where: { id: notificationId },
        data: {
          status: 'CANCELLED'
        }
      });

      return updatedNotification;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw error;
    }
  }

  /**
   * Get notification delivery status
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for authorization)
   */
  async getNotificationStatus(notificationId, userId) {
    try {
      const notification = await getPrismaClient().notification.findFirst({
        where: {
          id: notificationId,
          userId
        },
        select: {
          id: true,
          type: true,
          channel: true,
          title: true,
          status: true,
          scheduledAt: true,
          sentAt: true,
          failureReason: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Calculate delivery metrics
      const deliveryInfo = {
        ...notification,
        deliveryTime: null,
        isDelivered: notification.status === 'SENT',
        isPending: notification.status === 'PENDING',
        isFailed: notification.status === 'FAILED',
        isCancelled: notification.status === 'CANCELLED',
        retryCount: notification.metadata?.retryCount || 0
      };

      if (notification.sentAt && notification.scheduledAt) {
        deliveryInfo.deliveryTime = Math.round(
          (new Date(notification.sentAt) - new Date(notification.scheduledAt)) / 1000
        );
      }

      return deliveryInfo;
    } catch (error) {
      console.error('Failed to get notification status:', error);
      throw error;
    }
  }

  /**
   * Get notification templates with variable placeholders
   */
  getNotificationTemplates() {
    return {
      ORDER_CONFIRMATION: {
        email: {
          title: 'Order Confirmation #{orderId}',
          message: 'Dear {userName},\n\nThank you for your order! Here are the details:\n\nOrder #{orderId}\nTracking Code: {trackingCode}\nTotal: {totalPrice} IRR\n\nItems:\n{itemsList}\n\nWe\'ll notify you when your order ships.',
          variables: ['userName', 'orderId', 'trackingCode', 'totalPrice', 'itemsList']
        },
        sms: {
          title: 'Order #{orderId} Confirmed',
          message: 'Hi {userName}, your order #{orderId} is confirmed! Total: {totalPrice} IRR. Track: {trackingCode}',
          variables: ['userName', 'orderId', 'totalPrice', 'trackingCode']
        }
      },
      ORDER_STATUS_UPDATE: {
        email: {
          title: 'Order #{orderId} Status Update',
          message: 'Dear {userName},\n\nYour order #{orderId} status has been updated to {newStatus}.\n\nTracking Code: {trackingCode}\n\n{statusMessage}\n\nThank you for your order!',
          variables: ['userName', 'orderId', 'newStatus', 'trackingCode', 'statusMessage']
        },
        sms: {
          title: 'Order #{orderId} Update',
          message: 'Hi {userName}, your order #{orderId} status: {newStatus}. Track: {trackingCode}',
          variables: ['userName', 'orderId', 'newStatus', 'trackingCode']
        }
      },
      PAYMENT_SUCCESS: {
        email: {
          title: 'Payment Confirmed for Order #{orderId}',
          message: 'Dear {userName},\n\nYour payment for order #{orderId} has been successfully processed.\n\nAmount: {totalPrice} IRR\nPayment Method: {paymentMethod}\nTracking Code: {trackingCode}\n\nYour order is now being processed.',
          variables: ['userName', 'orderId', 'totalPrice', 'paymentMethod', 'trackingCode']
        },
        sms: {
          title: 'Payment Confirmed',
          message: 'Hi {userName}, payment for order #{orderId} confirmed. Amount: {totalPrice} IRR',
          variables: ['userName', 'orderId', 'totalPrice']
        }
      },
      PAYMENT_FAILED: {
        email: {
          title: 'Payment Failed for Order #{orderId}',
          message: 'Dear {userName},\n\nWe were unable to process your payment for order #{orderId}.\n\nAmount: {totalPrice} IRR\nReason: {failureReason}\nTracking Code: {trackingCode}\n\nPlease try again or contact support.',
          variables: ['userName', 'orderId', 'totalPrice', 'failureReason', 'trackingCode']
        },
        sms: {
          title: 'Payment Failed',
          message: 'Hi {userName}, payment for order #{orderId} failed. Please try again or contact support.',
          variables: ['userName', 'orderId']
        }
      },
      PROMOTION: {
        email: {
          title: '{promotionTitle}',
          message: 'Dear {userName},\n\n{promotionMessage}\n\nDiscount Code: {discountCode}\nValid Until: {expiryDate}\n\nDon\'t miss out on this limited-time offer!',
          variables: ['userName', 'promotionTitle', 'promotionMessage', 'discountCode', 'expiryDate']
        },
        sms: {
          title: 'Special Offer',
          message: 'Hi {userName}, {promotionMessage} Code: {discountCode}. Valid until {expiryDate}',
          variables: ['userName', 'promotionMessage', 'discountCode', 'expiryDate']
        }
      },
      WELCOME: {
        email: {
          title: 'Welcome to {storeName}!',
          message: 'Dear {userName},\n\nWelcome to {storeName}! We\'re excited to have you as a customer.\n\nAs a welcome gift, use code {welcomeCode} for {discountAmount}% off your first order.\n\nStart shopping now and enjoy our wide selection of products!',
          variables: ['userName', 'storeName', 'welcomeCode', 'discountAmount']
        },
        sms: {
          title: 'Welcome!',
          message: 'Hi {userName}, welcome to {storeName}! Use code {welcomeCode} for {discountAmount}% off your first order.',
          variables: ['userName', 'storeName', 'welcomeCode', 'discountAmount']
        }
      },
      PASSWORD_RESET: {
        email: {
          title: 'Password Reset Request',
          message: 'Dear {userName},\n\nYou requested a password reset for your account.\n\nReset Code: {resetCode}\nThis code expires in {expiryMinutes} minutes.\n\nIf you didn\'t request this, please ignore this email.',
          variables: ['userName', 'resetCode', 'expiryMinutes']
        },
        sms: {
          title: 'Password Reset',
          message: 'Hi {userName}, your password reset code is {resetCode}. Expires in {expiryMinutes} minutes.',
          variables: ['userName', 'resetCode', 'expiryMinutes']
        }
      }
    };
  }

  /**
   * Render notification template with variables
   * @param {string} type - Notification type
   * @param {string} channel - Notification channel
   * @param {Object} variables - Template variables
   */
  renderTemplate(type, channel, variables) {
    try {
      const templates = this.getNotificationTemplates();
      const template = templates[type]?.[channel.toLowerCase()];

      if (!template) {
        throw new Error(`Template not found for type: ${type}, channel: ${channel}`);
      }

      let title = template.title;
      let message = template.message;

      // Replace variables in title and message
      Object.keys(variables).forEach(key => {
        const placeholder = `{${key}}`;
        title = title.replace(new RegExp(placeholder, 'g'), variables[key] || '');
        message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      });

      return {
        title,
        message,
        variables: template.variables
      };
    } catch (error) {
      console.error('Failed to render template:', error);
      throw error;
    }
  }
}

module.exports = new NotificationManagementService();
