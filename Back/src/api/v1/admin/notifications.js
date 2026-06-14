const express = require('express');
const { getPrismaClient } = require('../../../utils/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const loggingService = require('../../../services/loggingService');
const notificationService = require('../../../services/notificationService');
const notificationQueue = require('../../../utils/notificationQueue');

const router = express.Router();

/**
 * Get all notifications with filtering and pagination
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;
    const channel = req.query.channel;
    const status = req.query.status;
    const userId = req.query.userId ? parseInt(req.query.userId) : undefined;

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where = {};

    if (type) where.type = type;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [notifications, total] = await Promise.all([
      getPrismaClient().notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      getPrismaClient().notification.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

/**
 * Get notification statistics
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const stats = await getPrismaClient().notification.groupBy({
      by: ['status', 'type', 'channel'],
      _count: {
        id: true
      }
    });

    // Get recent activity (last 24 hours)
    const recentActivity = await getPrismaClient().notification.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get failed notifications count
    const failedCount = await getPrismaClient().notification.count({
      where: { status: 'FAILED' }
    });

    // Get pending notifications count
    const pendingCount = await getPrismaClient().notification.count({
      where: { status: 'PENDING' }
    });

    // Process stats into a more readable format
    const processedStats = {
      byStatus: {},
      byType: {},
      byChannel: {},
      total: 0,
      recentActivity,
      failedCount,
      pendingCount
    };

    stats.forEach(stat => {
      const count = stat._count.id;
      processedStats.total += count;

      // Group by status
      if (!processedStats.byStatus[stat.status]) {
        processedStats.byStatus[stat.status] = 0;
      }
      processedStats.byStatus[stat.status] += count;

      // Group by type
      if (!processedStats.byType[stat.type]) {
        processedStats.byType[stat.type] = 0;
      }
      processedStats.byType[stat.type] += count;

      // Group by channel
      if (!processedStats.byChannel[stat.channel]) {
        processedStats.byChannel[stat.channel] = 0;
      }
      processedStats.byChannel[stat.channel] += count;
    });

    res.json({
      success: true,
      data: processedStats
    });
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

/**
 * Retry failed notification
 */
router.post('/:id/retry', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    const notification = await getPrismaClient().notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.status !== 'FAILED') {
      return res.status(400).json({
        success: false,
        message: 'Only failed notifications can be retried'
      });
    }

    // Reset notification status to pending
    await getPrismaClient().notification.update({
      where: { id: notificationId },
      data: {
        status: 'PENDING',
        failureReason: null,
        scheduledAt: new Date()
      }
    });

    // Process the notification
    await notificationService.processNotification(notificationId);

    // Log activity
    await loggingService.logActivity('notification.retry', 'Notification', notificationId, {
      adminId: req.user.id,
      originalStatus: notification.status
    }, req);

    res.json({
      success: true,
      message: 'Notification retry initiated'
    });
  } catch (error) {
    console.error('Error retrying notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry notification'
    });
  }
});

/**
 * Cancel pending notification
 */
router.post('/:id/cancel', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    const notification = await getPrismaClient().notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending notifications can be cancelled'
      });
    }

    // Update notification status to cancelled
    await getPrismaClient().notification.update({
      where: { id: notificationId },
      data: {
        status: 'CANCELLED'
      }
    });

    // Log activity
    await loggingService.logActivity('notification.cancel', 'Notification', notificationId, {
      adminId: req.user.id,
      originalStatus: notification.status
    }, req);

    res.json({
      success: true,
      message: 'Notification cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel notification'
    });
  }
});

/**
 * Send test notification
 */
router.post('/test', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId, type, channel, title, message } = req.body;

    if (!userId || !type || !channel || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, type, channel, title, message'
      });
    }

    // Validate user exists
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Schedule test notification
    const notification = await notificationService.scheduleNotification({
      userId,
      type,
      channel,
      title,
      message,
      metadata: {
        isTest: true,
        adminId: req.user.id
      }
    });

    // Log activity
    await loggingService.logActivity('notification.test.sent', 'Notification', notification?.id, {
      adminId: req.user.id,
      targetUserId: userId,
      type,
      channel
    }, req);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

/**
 * Get notification queue status
 */
router.get('/queue/status', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const queueStatus = notificationQueue.getStatus();
    
    // Get pending notifications count
    const pendingCount = await getPrismaClient().notification.count({
      where: { status: 'PENDING' }
    });

    res.json({
      success: true,
      data: {
        ...queueStatus,
        pendingNotifications: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue status'
    });
  }
});

/**
 * Process notification queue manually
 */
router.post('/queue/process', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await notificationQueue.processQueue();

    // Log activity
    await loggingService.logActivity('notification.queue.manual_process', 'System', null, {
      adminId: req.user.id
    }, req);

    res.json({
      success: true,
      message: 'Notification queue processed successfully'
    });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process notification queue'
    });
  }
});

/**
 * Send bulk notifications
 */
router.post('/bulk', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userIds, type, channel, title, message, scheduledAt, metadata } = req.body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }

    if (!type || !channel || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, channel, title, message'
      });
    }

    // Validate notification type and channel
    const validTypes = ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PROMOTION', 'WELCOME', 'PASSWORD_RESET'];
    const validChannels = ['EMAIL', 'SMS'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type'
      });
    }

    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification channel'
      });
    }

    // Parse scheduled date if provided
    let scheduledDate = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scheduled date format'
        });
      }
      
      // Don't allow scheduling in the past
      if (scheduledDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot schedule notifications in the past'
        });
      }
    }

    // Validate that all users exist
    const users = await getPrismaClient().user.findMany({
      where: {
        id: { in: userIds },
        isActive: true
      },
      select: { id: true }
    });

    const foundUserIds = users.map(u => u.id);
    const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));

    if (missingUserIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Users not found or inactive: ${missingUserIds.join(', ')}`
      });
    }

    // Schedule notifications for all users
    const notifications = [];
    const failed = [];

    for (const userId of userIds) {
      try {
        const notification = await notificationService.scheduleNotification({
          userId,
          type,
          channel,
          title,
          message,
          metadata: {
            ...metadata,
            isBulk: true,
            adminId: req.user.id
          }
        }, scheduledDate);

        if (notification) {
          notifications.push(notification);
        } else {
          failed.push({ userId, reason: 'Blocked by user preferences' });
        }
      } catch (error) {
        failed.push({ userId, reason: error.message });
      }
    }

    // Log activity
    await loggingService.logActivity('notification.bulk.sent', 'System', null, {
      adminId: req.user.id,
      type,
      channel,
      totalUsers: userIds.length,
      successful: notifications.length,
      failed: failed.length,
      scheduledAt: scheduledDate || 'immediate'
    }, req);

    res.json({
      success: true,
      message: `Bulk notifications processed: ${notifications.length} successful, ${failed.length} failed`,
      data: {
        successful: notifications.length,
        failed: failed.length,
        failedDetails: failed
      }
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications'
    });
  }
});

/**
 * Get notification delivery analytics
 */
router.get('/analytics', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { startDate, endDate, type, channel } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (type) where.type = type;
    if (channel) where.channel = channel;

    // Get delivery statistics
    const [
      totalNotifications,
      sentNotifications,
      failedNotifications,
      pendingNotifications,
      cancelledNotifications,
      avgDeliveryTime
    ] = await Promise.all([
      getPrismaClient().notification.count({ where }),
      getPrismaClient().notification.count({ where: { ...where, status: 'SENT' } }),
      getPrismaClient().notification.count({ where: { ...where, status: 'FAILED' } }),
      getPrismaClient().notification.count({ where: { ...where, status: 'PENDING' } }),
      getPrismaClient().notification.count({ where: { ...where, status: 'CANCELLED' } }),
      getPrismaClient().notification.aggregate({
        where: {
          ...where,
          status: 'SENT',
          sentAt: { not: null },
          scheduledAt: { not: null }
        },
        _avg: {
          id: true // We'll calculate this manually since Prisma doesn't support date diff
        }
      })
    ]);

    // Calculate delivery rate
    const deliveryRate = totalNotifications > 0 ? (sentNotifications / totalNotifications * 100).toFixed(2) : 0;
    const failureRate = totalNotifications > 0 ? (failedNotifications / totalNotifications * 100).toFixed(2) : 0;

    // Get delivery time statistics (manual calculation)
    const deliveredNotifications = await getPrismaClient().notification.findMany({
      where: {
        ...where,
        status: 'SENT',
        sentAt: { not: null },
        scheduledAt: { not: null }
      },
      select: {
        sentAt: true,
        scheduledAt: true
      }
    });

    let avgDeliveryTimeSeconds = 0;
    if (deliveredNotifications.length > 0) {
      const totalDeliveryTime = deliveredNotifications.reduce((sum, notif) => {
        return sum + (new Date(notif.sentAt) - new Date(notif.scheduledAt));
      }, 0);
      avgDeliveryTimeSeconds = Math.round(totalDeliveryTime / deliveredNotifications.length / 1000);
    }

    // Get hourly distribution for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyStats = await getPrismaClient().notification.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: last24Hours }
      },
      _count: { id: true }
    });

    // Process hourly stats into a more usable format
    const hourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).getHours();
      hourlyDistribution[hour] = 0;
    }

    hourlyStats.forEach(stat => {
      const hour = new Date(stat.createdAt).getHours();
      hourlyDistribution[hour] += stat._count.id;
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalNotifications,
          sent: sentNotifications,
          failed: failedNotifications,
          pending: pendingNotifications,
          cancelled: cancelledNotifications,
          deliveryRate: parseFloat(deliveryRate),
          failureRate: parseFloat(failureRate),
          avgDeliveryTimeSeconds
        },
        hourlyDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification analytics'
    });
  }
});

/**
 * Retry multiple failed notifications
 */
router.post('/retry-failed', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { notificationIds, retryAll } = req.body;

    let where = { status: 'FAILED' };
    
    if (!retryAll && notificationIds && Array.isArray(notificationIds)) {
      where.id = { in: notificationIds };
    } else if (!retryAll) {
      return res.status(400).json({
        success: false,
        message: 'Either provide notificationIds array or set retryAll to true'
      });
    }

    // Get failed notifications
    const failedNotifications = await getPrismaClient().notification.findMany({
      where,
      select: { id: true }
    });

    if (failedNotifications.length === 0) {
      return res.json({
        success: true,
        message: 'No failed notifications found to retry',
        data: { retried: 0 }
      });
    }

    // Reset notifications to pending status
    await getPrismaClient().notification.updateMany({
      where: {
        id: { in: failedNotifications.map(n => n.id) }
      },
      data: {
        status: 'PENDING',
        failureReason: null,
        scheduledAt: new Date()
      }
    });

    // Process each notification
    let successCount = 0;
    for (const notification of failedNotifications) {
      try {
        await notificationService.processNotification(notification.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to retry notification ${notification.id}:`, error);
      }
    }

    // Log activity
    await loggingService.logActivity('notification.bulk.retry', 'System', null, {
      adminId: req.user.id,
      totalRetried: failedNotifications.length,
      successful: successCount
    }, req);

    res.json({
      success: true,
      message: `Retried ${failedNotifications.length} failed notifications`,
      data: {
        retried: failedNotifications.length,
        successful: successCount
      }
    });
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry notifications'
    });
  }
});

/**
 * Get notification templates (predefined message templates)
 */
router.get('/templates', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    // Return predefined notification templates
    const templates = {
      ORDER_CONFIRMATION: {
        email: {
          title: 'Order Confirmation #{orderId}',
          message: 'Dear {userName},\n\nThank you for your order! Here are the details:\n\nOrder #{orderId}\nTracking Code: {trackingCode}\nTotal: {totalPrice} IRR\n\nWe\'ll notify you when your order ships.'
        },
        sms: {
          title: 'Order #{orderId} Confirmed',
          message: 'Hi {userName}, your order #{orderId} is confirmed! Track: {trackingCode}'
        }
      },
      ORDER_STATUS_UPDATE: {
        email: {
          title: 'Order #{orderId} Status Update',
          message: 'Dear {userName},\n\nYour order #{orderId} status has been updated to {newStatus}.\n\nTracking Code: {trackingCode}\n\nThank you for your order!'
        },
        sms: {
          title: 'Order #{orderId} Update',
          message: 'Hi {userName}, your order #{orderId} status: {newStatus}. Track: {trackingCode}'
        }
      },
      PAYMENT_SUCCESS: {
        email: {
          title: 'Payment Confirmed for Order #{orderId}',
          message: 'Dear {userName},\n\nYour payment for order #{orderId} has been successfully processed.\n\nAmount: {totalPrice} IRR\nTracking Code: {trackingCode}\n\nYour order is now being processed.'
        },
        sms: {
          title: 'Payment Confirmed',
          message: 'Hi {userName}, payment for order #{orderId} confirmed. Amount: {totalPrice} IRR'
        }
      },
      PAYMENT_FAILED: {
        email: {
          title: 'Payment Failed for Order #{orderId}',
          message: 'Dear {userName},\n\nWe were unable to process your payment for order #{orderId}.\n\nAmount: {totalPrice} IRR\nTracking Code: {trackingCode}\n\nPlease try again or contact support.'
        },
        sms: {
          title: 'Payment Failed',
          message: 'Hi {userName}, payment for order #{orderId} failed. Please try again or contact support.'
        }
      },
      PROMOTION: {
        email: {
          title: 'Special Offer Just for You!',
          message: 'Dear {userName},\n\nWe have a special offer just for you!\n\n{promotionDetails}\n\nDon\'t miss out on this limited-time offer!'
        },
        sms: {
          title: 'Special Offer',
          message: 'Hi {userName}, special offer: {promotionDetails}. Limited time!'
        }
      },
      WELCOME: {
        email: {
          title: 'Welcome to Our Store!',
          message: 'Dear {userName},\n\nWelcome to our store! We\'re excited to have you as a customer.\n\nStart shopping now and enjoy our wide selection of products!'
        },
        sms: {
          title: 'Welcome!',
          message: 'Hi {userName}, welcome to our store! Start shopping now.'
        }
      }
    };

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification templates'
    });
  }
});

module.exports = router;
