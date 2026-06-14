const express = require('express');
const dashboardRoutes = require('./dashboard');
const analyticsRoutes = require('./analytics');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const usersRoutes = require('./users');
const reportsRoutes = require('./reports');
const paymentRoutes = require('./payments');
const reviewRoutes = require('./reviews');
const notificationRoutes = require('./notifications');
const logsRoutes = require('./logs');
const basalamRoutes = require('./basalam');

const router = express.Router();

// Mount admin route modules
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/users', usersRoutes);
router.use('/reports', reportsRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/logs', logsRoutes);
router.use('/basalam', basalamRoutes);

// Admin API root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'E-commerce Platform Admin API v1',
    version: '1.0.0',
    endpoints: {
      dashboard: {
        stats: 'GET /api/v1/admin/dashboard'
      },
      analytics: {
        data: 'GET /api/v1/admin/analytics'
      },
      products: {
        list: 'GET /api/v1/admin/products',
        create: 'POST /api/v1/admin/products',
        update: 'PUT /api/v1/admin/products/:id',
        delete: 'DELETE /api/v1/admin/products/:id',
        bulkDelete: 'POST /api/v1/admin/products/bulk-delete'
      },
      payments: {
        list: 'GET /api/v1/admin/payments',
        details: 'GET /api/v1/admin/payments/:paymentId',
        refund: 'POST /api/v1/admin/payments/refund',
        statistics: 'GET /api/v1/admin/payments/statistics',
        failed: 'GET /api/v1/admin/payments/failed',
        retry: 'POST /api/v1/admin/payments/:paymentId/retry'
      },
      reviews: {
        list: 'GET /api/v1/admin/reviews',
        pending: 'GET /api/v1/admin/reviews/pending',
        moderate: 'PUT /api/v1/admin/reviews/:reviewId/moderate',
        delete: 'DELETE /api/v1/admin/reviews/:reviewId'
      },
      notifications: {
        list: 'GET /api/v1/admin/notifications',
        stats: 'GET /api/v1/admin/notifications/stats',
        retry: 'POST /api/v1/admin/notifications/:id/retry',
        cancel: 'POST /api/v1/admin/notifications/:id/cancel',
        test: 'POST /api/v1/admin/notifications/test',
        queueStatus: 'GET /api/v1/admin/notifications/queue/status',
        processQueue: 'POST /api/v1/admin/notifications/queue/process'
      },
      orders: {
        list: 'GET /api/v1/admin/orders',
        details: 'GET /api/v1/admin/orders/:orderId',
        updateStatus: 'PUT /api/v1/admin/orders/:orderId'
      },
      users: {
        list: 'GET /api/v1/admin/users',
        details: 'GET /api/v1/admin/users/:userId',
        updateStatus: 'PUT /api/v1/admin/users/:userId/status',
        updateRole: 'PUT /api/v1/admin/users/:userId/role'
      },
      reports: {
        sales: 'GET /api/v1/admin/reports/sales',
        inventory: 'GET /api/v1/admin/reports/inventory',
        customers: 'GET /api/v1/admin/reports/customers'
      },
      logs: {
        activity: 'GET /api/v1/admin/logs/activity',
        api: 'GET /api/v1/admin/logs/api',
        errors: 'GET /api/v1/admin/logs/errors',
        performance: 'GET /api/v1/admin/logs/performance',
        search: 'GET /api/v1/admin/logs/search',
        user: 'GET /api/v1/admin/logs/user/:userId',
        analytics: 'GET /api/v1/admin/logs/analytics',
        cleanup: 'DELETE /api/v1/admin/logs/cleanup'
      },
      basalam: {
        syncProduct: 'POST /api/v1/admin/basalam/sync-product'
      }
    }
  });
});

module.exports = router;