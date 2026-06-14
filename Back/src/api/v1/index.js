const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const inventoryRoutes = require('./inventory');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const paymentRoutes = require('./payments');
const discountRoutes = require('./discounts');
const loyaltyRoutes = require('./loyalty');
const wishlistRoutes = require('./wishlist');
const notificationRoutes = require('./notifications');
const adminRoutes = require('./admin');
const testDataRoutes = require('./test-data');
const testingRoutes = require('./testing');
const monitoringRoutes = require('./monitoring');
const basalamRoutes = require('./basalam');
const shippingMethodRoutes = require('./shippingMethods');

const reviewRoutes = require('./reviews');

const bankAccountRoutes = require('./admin/bank-account');

const router = express.Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/discounts', discountRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/test-data', testDataRoutes);
router.use('/testing', testingRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/basalam', basalamRoutes);
router.use('/shipping-methods', shippingMethodRoutes);

router.use('/reviews', reviewRoutes);

router.use('/bank-accounts', bankAccountRoutes);
// API v1 root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'E-commerce Platform API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        setup2FA: 'POST /api/v1/auth/setup-2fa',
        verify2FA: 'POST /api/v1/auth/verify-2fa',
        disable2FA: 'POST /api/v1/auth/disable-2fa'
      },
      users: {
        profile: 'GET /api/v1/users/profile',
        updateProfile: 'PUT /api/v1/users/profile',
        addresses: 'GET /api/v1/users/addresses',
        addAddress: 'POST /api/v1/users/addresses',
        updateAddress: 'PUT /api/v1/users/addresses/:id',
        deleteAddress: 'DELETE /api/v1/users/addresses/:id',
        loyaltyPoints: 'GET /api/v1/users/loyalty-points'
      },
      products: {
        list: 'GET /api/v1/products',
        search: 'POST /api/v1/products/search',
        suggestions: 'GET /api/v1/products/suggestions',
        popular: 'GET /api/v1/products/popular',
        create: 'POST /api/v1/products',
        getById: 'GET /api/v1/products/:id',
        update: 'PUT /api/v1/products/:id',
        delete: 'DELETE /api/v1/products/:id',
        lowStock: 'GET /api/v1/products/low-stock',
        uploadImages: 'POST /api/v1/products/:id/images',
        getImages: 'GET /api/v1/products/:id/images',
        updateImage: 'PUT /api/v1/products/:productId/images/:imageId',
        deleteImage: 'DELETE /api/v1/products/:productId/images/:imageId',
        reorderImages: 'PUT /api/v1/products/:id/images/reorder',
        createReview: 'POST /api/v1/products/:id/reviews',
        getReviews: 'GET /api/v1/products/:id/reviews',
        getReviewSummary: 'GET /api/v1/products/:id/reviews/summary'
      },
      categories: {
        list: 'GET /api/v1/categories',
        tree: 'GET /api/v1/categories/tree',
        create: 'POST /api/v1/categories',
        getById: 'GET /api/v1/categories/:id',
        getPath: 'GET /api/v1/categories/:id/path',
        update: 'PUT /api/v1/categories/:id',
        delete: 'DELETE /api/v1/categories/:id'
      },
      inventory: {
        status: 'GET /api/v1/inventory',
        stats: 'GET /api/v1/inventory/stats',
        alerts: 'GET /api/v1/inventory/alerts',
        updateStock: 'PUT /api/v1/inventory/:productId/stock',
        bulkUpdate: 'PUT /api/v1/inventory/bulk-update',
        reserve: 'POST /api/v1/inventory/reserve',
        release: 'POST /api/v1/inventory/release',
        confirm: 'POST /api/v1/inventory/confirm'
      },
      cart: {
        get: 'GET /api/v1/cart',
        addItem: 'POST /api/v1/cart/items',
        updateItem: 'PUT /api/v1/cart/items/:id',
        removeItem: 'DELETE /api/v1/cart/items/:id',
        clear: 'DELETE /api/v1/cart/clear',
        validateDiscount: 'POST /api/v1/cart/validate-discount'
      },
      orders: {
        create: 'POST /api/v1/orders',
        list: 'GET /api/v1/orders',
        getById: 'GET /api/v1/orders/:id',
        cancel: 'PUT /api/v1/orders/:id/cancel',
        updateStatus: 'PUT /api/v1/orders/:id/status',
        track: 'GET /api/v1/orders/track/:trackingCode',
        resendProof: 'POST /api/v1/orders/:id/resend-proof',
        summary: 'GET /api/v1/orders/summary'
      },
      payments: {
        initiate: 'POST /api/v1/payments/initiate',
        verify: 'POST /api/v1/payments/verify',
        callback: 'GET /api/v1/payments/callback/:gateway',
        webhook: 'POST /api/v1/payments/webhook/stripe',
        status: 'GET /api/v1/payments/status/:orderId'
      },
      discounts: {
        create: 'POST /api/v1/discounts',
        list: 'GET /api/v1/discounts',
        getById: 'GET /api/v1/discounts/:id',
        update: 'PUT /api/v1/discounts/:id',
        delete: 'DELETE /api/v1/discounts/:id',
        validate: 'POST /api/v1/discounts/validate/:code',
        stats: 'GET /api/v1/discounts/stats'
      },
      loyalty: {
        points: 'GET /api/v1/loyalty/points',
        transactions: 'GET /api/v1/loyalty/transactions',
        redeem: 'POST /api/v1/loyalty/redeem',
        validateRedemption: 'POST /api/v1/loyalty/validate-redemption',
        calculateDiscount: 'POST /api/v1/loyalty/calculate-discount',
        expiration: 'GET /api/v1/loyalty/expiration',
        analytics: 'GET /api/v1/loyalty/analytics',
        adminStats: 'GET /api/v1/loyalty/admin/stats',
        adminAdjust: 'POST /api/v1/loyalty/admin/adjust',
        adminExpirePoints: 'POST /api/v1/loyalty/admin/expire-points'
      },
      wishlist: {
        add: 'POST /api/v1/wishlist',
        list: 'GET /api/v1/wishlist',
        remove: 'DELETE /api/v1/wishlist/:id',
        moveToCart: 'POST /api/v1/wishlist/:id/move-to-cart',
        clear: 'DELETE /api/v1/wishlist/clear'
      },
      notifications: {
        preferences: 'GET /api/v1/notifications/preferences',
        updatePreferences: 'PUT /api/v1/notifications/preferences',
        history: 'GET /api/v1/notifications/history',
        stats: 'GET /api/v1/notifications/stats',
        markRead: 'PUT /api/v1/notifications/:id/read'
      },
      admin: {
        payments: 'GET /api/v1/admin/payments',
        paymentDetails: 'GET /api/v1/admin/payments/:paymentId',
        refund: 'POST /api/v1/admin/payments/refund',
        paymentStats: 'GET /api/v1/admin/payments/statistics',
        failedPayments: 'GET /api/v1/admin/payments/failed',
        retryPayment: 'POST /api/v1/admin/payments/:paymentId/retry',
        reviewStats: 'GET /api/v1/admin/reviews/statistics',
        reviewDetails: 'GET /api/v1/admin/reviews/:reviewId',
        bulkModerateReviews: 'PUT /api/v1/admin/reviews/bulk-moderate',
        bulkDeleteReviews: 'DELETE /api/v1/admin/reviews/bulk-delete',
        reportedReviews: 'GET /api/v1/admin/reviews/reported',
        reviews: 'GET /api/v1/admin/reviews',
        pendingReviews: 'GET /api/v1/admin/reviews/pending',
        moderateReview: 'PUT /api/v1/admin/reviews/:reviewId/moderate',
        deleteReview: 'DELETE /api/v1/admin/reviews/:reviewId'
      },
      testing: {
        testData: 'GET /api/v1/test-data',
        scenarios: 'GET /api/v1/testing/scenarios',
        authDemo: 'POST /api/v1/testing/auth-demo',
        guide: 'GET /api/v1/testing/guide'
      },
      monitoring: {
        health: 'GET /api/v1/monitoring/health',
        detailedHealth: 'GET /api/v1/monitoring/health/detailed',
        metrics: 'GET /api/v1/monitoring/metrics',
        performance: 'GET /api/v1/monitoring/performance',
        database: 'GET /api/v1/monitoring/database',
        alerts: 'GET /api/v1/monitoring/alerts',
        system: 'GET /api/v1/monitoring/system',
        cleanup: 'POST /api/v1/monitoring/cleanup'
      },

      reviews: {
        myReviews: 'GET /api/v1/reviews/my'
      },
    },
    documentation: '/api-docs'
  });
});

module.exports = router;