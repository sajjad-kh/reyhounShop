const express = require('express');
const adminService = require('../../../services/adminService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const dashboardStats = await adminService.getDashboardStats();

    // ساختار اصلی آبجکت خروجی
    const analyticsData = {
      stats: {
        totalRevenue: dashboardStats.revenueStats.total || 0,
        revenueGrowth: dashboardStats.growthRates.revenue || 0,
        totalOrders: dashboardStats.orderStats.total || 0,
        ordersGrowth: dashboardStats.growthRates.orders || 0,
        totalCustomers: dashboardStats.userStats.total || 0,
        customersGrowth: dashboardStats.growthRates.users || 0,
        totalProducts: dashboardStats.productStats.total || 0,
        productsGrowth: 0 
      },
      // اصلاح شده: پاس دادن کل دیتای سرویس به تابع
      salesData: generateSalesData(dashboardStats), 
      topProducts: formatTopProducts(dashboardStats.productStats.topSelling || []),
      recentOrders: formatRecentOrders(dashboardStats.recentActivity.orders || [])
    };

    // دقیقا همان ساختاری که فرستادید را در روت اصلی پخش می‌کنیم
    res.json({
      success: true,
      data: analyticsData,
      ...analyticsData.stats, // کپی کردن مستقیم استت‌ها در ریشه دیتا (مطابق ریسپانس شما)
      recentOrders: analyticsData.recentOrders,
      salesData: analyticsData.salesData,
      topProducts: analyticsData.topProducts
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve analytics data' }
    });
  }
});

/**
 * اصلاح شده: تولید داده‌های واقعی فروش به جای تقسیم بر ۳۰
 */
/**
 * Generate sales data for last 7 days accurately matching Service keys
 */
function generateSalesData(dashboardStats) {
  const salesData = [];
  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dbSalesMap = dashboardStats.dailySales || {};

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dateStr = `${months[date.getMonth()]} ${date.getDate()}`;
    const dayData = dbSalesMap[dateStr] || { revenue: 0, orders: 0 };
    
    salesData.push({
      date: dateStr,
      revenue: dayData.revenue,
      orders: dayData.orders
    });
  }
  
  return salesData;
}

function formatTopProducts(topSelling) {
  return topSelling.slice(0, 5).map(item => ({
    id: item.product.id,
    name: item.product.name,
    sales: item.totalSold,
    revenue: item.product.price * item.totalSold,
    image: item.product.mainImage || '/placeholder.png'
  }));
}

function formatRecentOrders(orders) {
  return orders.slice(0, 10).map(order => ({
    id: order.id,
    trackingCode: order.trackingCode || `ORD-${order.id}`,
    customerName: order.user?.name || 'Unknown',
    totalAmount: order.totalPrice || 0,
    status: order.status,
    paymentStatus: order.paymentStatus || 'PENDING',
    createdAt: order.createdAt
  }));
}

module.exports = router;