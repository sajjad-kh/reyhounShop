const express = require('express');
const { getPrismaClient } = require('../../utils/database');
const { authenticateToken } = require('../../middleware/auth');
const loggingService = require('../../services/loggingService');

const router = express.Router();

/**
 * Get user notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const notificationManagementService = require('../../services/notificationManagementService');
    const preferences = await notificationManagementService.getUserPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences'
    });
  }
});

/**
 * Update user notification preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { emailEnabled, smsEnabled, orderUpdates, promotions } = req.body;

    // Validate input
    if (typeof emailEnabled !== 'boolean' || 
        typeof smsEnabled !== 'boolean' || 
        typeof orderUpdates !== 'boolean' || 
        typeof promotions !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'All preference fields must be boolean values'
      });
    }

    const notificationManagementService = require('../../services/notificationManagementService');
    const preferences = await notificationManagementService.updateUserPreferences(req.user.id, {
      emailEnabled,
      smsEnabled,
      orderUpdates,
      promotions
    });

    // Log activity
    await loggingService.logActivity('notification.preferences.updated', 'NotificationPreference', preferences.id, {
      emailEnabled,
      smsEnabled,
      orderUpdates,
      promotions
    }, req);

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

/**
 * Get user notification history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const channel = req.query.channel;
    const status = req.query.status;

    // Build filter conditions
    const filters = {};
    if (type) filters.type = type;
    if (channel) filters.channel = channel;
    if (status) filters.status = status;

    const notificationManagementService = require('../../services/notificationManagementService');
    const result = await notificationManagementService.getUserNotificationHistory(
      req.user.id,
      filters,
      { page, limit }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history'
    });
  }
});

/**
 * Get notification statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const notificationManagementService = require('../../services/notificationManagementService');
    const stats = await notificationManagementService.getUserNotificationStats(req.user.id);

    res.json({
      success: true,
      data: stats
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
 * Mark notification as read (for future use)
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    const notification = await getPrismaClient().notification.findFirst({
      where: {
        id: notificationId,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // For now, we'll just log this action since the schema doesn't have a 'read' field
    // In a future update, we could add a 'readAt' field to the Notification model
    await loggingService.logActivity('notification.read', 'Notification', notificationId, {
      type: notification.type,
      channel: notification.channel
    }, req);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * Schedule a custom notification
 */
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const { type, channel, title, message, scheduledAt, metadata, useTemplate, templateVariables } = req.body;

    // Validate required fields
    if (!type || !channel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, channel'
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

    let finalTitle = title;
    let finalMessage = message;

    // Use template if requested
    if (useTemplate && templateVariables) {
      const notificationManagementService = require('../../services/notificationManagementService');
      const rendered = notificationManagementService.renderTemplate(type, channel, templateVariables);
      finalTitle = rendered.title;
      finalMessage = rendered.message;
    } else if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, message (or use useTemplate with templateVariables)'
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

    const notificationManagementService = require('../../services/notificationManagementService');
    
    const notification = await notificationManagementService.scheduleNotification({
      userId: req.user.id,
      type,
      channel,
      title: finalTitle,
      message: finalMessage,
      metadata: metadata || {}
    }, scheduledDate);

    if (!notification) {
      return res.status(400).json({
        success: false,
        message: 'Failed to schedule notification (possibly blocked by user preferences)'
      });
    }

    // Log activity
    await loggingService.logActivity('notification.scheduled', 'Notification', notification.id, {
      type,
      channel,
      scheduledAt: scheduledDate || 'immediate',
      useTemplate: !!useTemplate
    }, req);

    res.json({
      success: true,
      message: 'Notification scheduled successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule notification'
    });
  }
});

/**
 * Get delivery status for a specific notification
 */
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    const notificationManagementService = require('../../services/notificationManagementService');
    const deliveryInfo = await notificationManagementService.getNotificationStatus(notificationId, req.user.id);

    res.json({
      success: true,
      data: deliveryInfo
    });
  } catch (error) {
    console.error('Error fetching notification status:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification status'
    });
  }
});

/**
 * Cancel a pending notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    const notificationManagementService = require('../../services/notificationManagementService');
    
    await notificationManagementService.cancelNotification(notificationId, req.user.id);

    // Log activity
    await loggingService.logActivity('notification.cancelled', 'Notification', notificationId, {
      userId: req.user.id
    }, req);

    res.json({
      success: true,
      message: 'Notification cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling notification:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Only pending notifications can be cancelled') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel notification'
    });
  }
});

/**
 * Get notification templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const notificationManagementService = require('../../services/notificationManagementService');
    const templates = notificationManagementService.getNotificationTemplates();

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

/**
 * Preview notification template with variables
 */
router.post('/templates/preview', authenticateToken, async (req, res) => {
  try {
    const { type, channel, variables } = req.body;

    if (!type || !channel || !variables) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, channel, variables'
      });
    }

    const notificationManagementService = require('../../services/notificationManagementService');
    const rendered = notificationManagementService.renderTemplate(type, channel, variables);

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    
    if (error.message.includes('Template not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to preview template'
    });
  }
});

module.exports = router;
