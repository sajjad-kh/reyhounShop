const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../../../middleware/auth');
const loggingService = require('../../../services/loggingService');
const { createActivityLogger } = require('../../../middleware/logging');

const prisma = new PrismaClient();

const router = express.Router();

/**
 * GET /api/v1/admin/logs/activity
 * Get activity logs with filtering and search
 */
router.get('/activity', requireRole(['ADMIN']), createActivityLogger('admin.view_activity_logs', 'ActivityLog'), async (req, res) => {
  try {
    const {
      userId,
      action,
      entity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      search
    } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      action: search || action,
      entity,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 1000), // Max 1000 records
      offset: parseInt(offset)
    };

    const logs = await loggingService.getActivityLogs(filters);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: logs.length
        }
      }
    });
  } catch (error) {
    console.error('Failed to get activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/api
 * Get API logs with analytics and filtering
 */
router.get('/api', requireRole(['ADMIN']), createActivityLogger('admin.view_api_logs', 'ApiLog'), async (req, res) => {
  try {
    const {
      userId,
      method,
      endpoint,
      status,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      includeAnalytics = 'true'
    } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      method: method?.toUpperCase(),
      endpoint,
      status: status ? parseInt(status) : undefined,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset)
    };

    const result = await loggingService.getApiLogs(filters);

    const response = {
      success: true,
      data: {
        logs: result.logs,
        totalCount: result.totalCount,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: result.totalCount
        }
      }
    };

    if (includeAnalytics === 'true') {
      response.data.analytics = result.analytics;
    }

    res.json(response);
  } catch (error) {
    console.error('Failed to get API logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/errors
 * Get error logs with categorization and analytics
 */
router.get('/errors', requireRole(['ADMIN']), createActivityLogger('admin.view_error_logs', 'ErrorLog'), async (req, res) => {
  try {
    const {
      userId,
      endpoint,
      statusCode,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      includeAnalytics = 'true'
    } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      endpoint,
      statusCode: statusCode ? parseInt(statusCode) : undefined,
      severity,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset)
    };

    const result = await loggingService.getErrorLogs(filters);

    const response = {
      success: true,
      data: {
        logs: result.logs,
        totalCount: result.totalCount,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: result.totalCount
        }
      }
    };

    if (includeAnalytics === 'true') {
      response.data.analytics = result.analytics;
    }

    res.json(response);
  } catch (error) {
    console.error('Failed to get error logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve error logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/performance
 * Get performance metrics and slow queries
 */
router.get('/performance', requireRole(['ADMIN']), createActivityLogger('admin.view_performance_logs', 'Performance'), async (req, res) => {
  try {
    const {
      threshold = 1000,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset)
    };

    const [slowQueries, apiAnalytics] = await Promise.all([
      loggingService.getSlowQueries(parseInt(threshold), filters),
      loggingService.getApiAnalytics(filters)
    ]);

    res.json({
      success: true,
      data: {
        slowQueries,
        analytics: apiAnalytics,
        threshold: parseInt(threshold),
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: slowQueries.length
        }
      }
    });
  } catch (error) {
    console.error('Failed to get performance logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/search
 * Advanced log search across all log types
 */
router.get('/search', requireRole(['ADMIN']), createActivityLogger('admin.search_logs', 'Log'), async (req, res) => {
  try {
    const {
      query,
      type = 'all', // activity, api, error, all
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchFilters = {
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset)
    };

    const results = {};

    if (type === 'all' || type === 'activity') {
      results.activityLogs = await loggingService.getActivityLogs({
        ...searchFilters,
        action: query
      });
    }

    if (type === 'all' || type === 'api') {
      results.apiLogs = await loggingService.getApiLogs({
        ...searchFilters,
        endpoint: query
      });
    }

    if (type === 'all' || type === 'error') {
      results.errorLogs = await loggingService.getErrorLogs({
        ...searchFilters,
        endpoint: query
      });
    }

    res.json({
      success: true,
      data: {
        query,
        type,
        results,
        pagination: {
          limit: searchFilters.limit,
          offset: searchFilters.offset
        }
      }
    });
  } catch (error) {
    console.error('Failed to search logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/user/:userId
 * Get all logs for a specific user
 */
router.get('/user/:userId', requireRole(['ADMIN']), createActivityLogger('admin.view_user_logs', 'User'), async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      type = 'all',
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const filters = {
      userId: userIdInt,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset)
    };

    const results = {};

    if (type === 'all' || type === 'activity') {
      results.activityLogs = await loggingService.getActivityLogs(filters);
    }

    if (type === 'all' || type === 'api') {
      const apiResult = await loggingService.getApiLogs(filters);
      results.apiLogs = apiResult.logs;
      results.sessionAnalytics = await loggingService.getUserSessionAnalytics(userIdInt, filters);
    }

    if (type === 'all' || type === 'error') {
      const errorResult = await loggingService.getErrorLogs(filters);
      results.errorLogs = errorResult.logs;
    }

    res.json({
      success: true,
      data: {
        userId: userIdInt,
        type,
        results,
        pagination: {
          limit: filters.limit,
          offset: filters.offset
        }
      }
    });
  } catch (error) {
    console.error('Failed to get user logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user logs'
    });
  }
});

/**
 * GET /api/v1/admin/logs/analytics
 * Get comprehensive logging analytics dashboard
 */
router.get('/analytics', requireRole(['ADMIN']), createActivityLogger('admin.view_log_analytics', 'Analytics'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      period = '7d' // 1d, 7d, 30d
    } = req.query;

    // Calculate date range based on period if not provided
    let dateFilters = {};
    if (startDate && endDate) {
      dateFilters = { startDate, endDate };
    } else {
      const endTime = new Date();
      const startTime = new Date();
      
      switch (period) {
        case '1d':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
        default: // 7d
          startTime.setDate(startTime.getDate() - 7);
      }
      
      dateFilters = {
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString()
      };
    }

    const [
      apiAnalytics,
      errorAnalytics,
      activityCount,
      slowQueries
    ] = await Promise.all([
      loggingService.getApiAnalytics(dateFilters),
      loggingService.getErrorAnalytics(dateFilters),
      loggingService.getActivityLogs({ ...dateFilters, limit: 1 }).then(logs => logs.length),
      loggingService.getSlowQueries(1000, { ...dateFilters, limit: 10 })
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange: dateFilters,
        analytics: {
          api: apiAnalytics,
          errors: errorAnalytics,
          activityCount,
          slowQueries: {
            count: slowQueries.length,
            queries: slowQueries
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to get log analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve log analytics'
    });
  }
});

/**
 * DELETE /api/v1/admin/logs/cleanup
 * Clean up old logs based on retention policy
 */
router.delete('/cleanup', requireRole(['ADMIN']), createActivityLogger('admin.cleanup_logs', 'Log'), async (req, res) => {
  try {
    const {
      type = 'all', // activity, api, error, all
      olderThan = 90 // days
    } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

    const results = {};

    if (type === 'all' || type === 'activity') {
      const deletedActivity = await prisma.activityLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });
      results.activityLogs = deletedActivity.count;
    }

    if (type === 'all' || type === 'api') {
      const deletedApi = await prisma.apiLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      results.apiLogs = deletedApi.count;
    }

    if (type === 'all' || type === 'error') {
      const deletedError = await prisma.errorLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      results.errorLogs = deletedError.count;
    }

    // Log the cleanup activity
    await loggingService.logAdminActivity(
      'cleanup_logs',
      'Log',
      null,
      {
        type,
        olderThan: parseInt(olderThan),
        cutoffDate,
        deletedCounts: results
      },
      req
    );

    res.json({
      success: true,
      message: 'Log cleanup completed successfully',
      data: {
        type,
        olderThan: parseInt(olderThan),
        cutoffDate,
        deletedCounts: results
      }
    });
  } catch (error) {
    console.error('Failed to cleanup logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup logs'
    });
  }
});

module.exports = router;