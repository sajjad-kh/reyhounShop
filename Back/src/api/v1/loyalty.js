const express = require('express');
const { PrismaClient } = require('@prisma/client');
const loyaltyService = require('../../services/loyaltyService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const dbUtils = require('../../utils/database');

let _prisma = null;
function prisma() {
  if (!_prisma) {
    try { _prisma = dbUtils.getPrismaClient(); } catch (e) { _prisma = new PrismaClient(); }
  }
  return _prisma;
}
const router = express.Router();

async function prismaTiers() {
  return prisma().loyaltyTier.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } });
}
async function prismaExpiring(userId) {
  const soon = await prisma().loyaltyTransaction.findMany({
    where: { userId, points: { gt: 0 }, expireDate: { gte: new Date() } },
    orderBy: { expireDate: 'asc' }
  });
  const total = soon.reduce((s, t) => s + t.points, 0);
  return {
    expiringTransactions: soon.map((t) => ({ id: t.id, points: t.points, expireDate: t.expireDate, description: t.description })),
    totalExpiringPoints: total
  };
}

router.get('/points', authenticateToken, async (req, res) => {
  try {
    const stats = await loyaltyService.getUserStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LOYALTY_FETCH_ERROR', message: error.message } });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const result = await loyaltyService.getHistory(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LOYALTY_TRANSACTIONS_ERROR', message: error.message } });
  }
});

router.get('/tiers', authenticateToken, async (req, res) => {
  try {
    const tiers = await prismaTiers();
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'TIER_ERROR', message: error.message } });
  }
});

router.get('/benefits', authenticateToken, async (req, res) => {
  try {
    const benefits = await loyaltyService.getUserTierBenefits(req.user.id);
    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'BENEFITS_ERROR', message: error.message } });
  }
});

router.get('/rewards', authenticateToken, async (req, res) => {
  try {
    const rewards = await loyaltyService.listRewards();
    res.json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'REWARD_ERROR', message: error.message } });
  }
});

router.get('/referral', authenticateToken, async (req, res) => {
  try {
    const info = await loyaltyService.getReferralInfo(req.user.id);
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'REFERRAL_ERROR', message: error.message } });
  }
});

router.post('/daily-login', authenticateToken, async (req, res) => {
  try {
    const result = await loyaltyService.awardDailyLogin(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'DAILY_LOGIN_ERROR', message: error.message } });
  }
});

router.post('/birthday', authenticateToken, async (req, res) => {
  try {
    const result = await loyaltyService.awardBirthday(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BIRTHDAY_ERROR', message: error.message } });
  }
});

router.get('/forecast', authenticateToken, async (req, res) => {
  try {
    const amount = parseInt(req.query.amount || '0');
    const forecast = await loyaltyService.forecastPoints(amount);
    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'FORECAST_ERROR', message: error.message } });
  }
});

router.get('/expiration', authenticateToken, async (req, res) => {
  try {
    const expiring = await prismaExpiring(req.user.id);
    res.json({ success: true, data: { ...expiring, policy: `امتیازها پس از ${loyaltyService.POINT_EXPIRY_DAYS} روز منقضی می‌شوند` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'EXPIRATION_ERROR', message: error.message } });
  }
});

router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await loyaltyService.getActiveCampaigns();
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'CAMPAIGN_ERROR', message: error.message } });
  }
});

router.get('/admin/stats', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const stats = await loyaltyService.getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: error.message } });
  }
});

router.post('/admin/adjust', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    if (!userId || points === undefined || !reason) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId, points, reason لازم است' } });
    }
    const result = await loyaltyService.adminAdjust(parseInt(userId), parseInt(points), reason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'ADJUSTMENT_ERROR', message: error.message } });
  }
});

router.post('/admin/bulk-grant', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { points, reason } = req.body;
    if (!points || !reason) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'points و reason لازم است' } });
    }
    const result = await loyaltyService.adminBulkGrant(parseInt(points), reason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BULK_GRANT_ERROR', message: error.message } });
  }
});

router.post('/admin/expire-points', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await loyaltyService.expirePoints();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'EXPIRATION_PROCESS_ERROR', message: error.message } });
  }
});

router.post('/admin/seed', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await loyaltyService.seedDefaults();
    await loyaltyService.ensureAllWallets();
    res.json({ success: true, data: result, message: 'تنظیمات پیش‌فرض وفاداری ایجاد شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SEED_ERROR', message: error.message } });
  }
});

router.post('/admin/finalize/:orderId', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await loyaltyService.finalizeOrderPoints(parseInt(req.params.orderId));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'FINALIZE_ERROR', message: error.message } });
  }
});

router.post('/admin/notify-expiry', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await loyaltyService.sendExpiryWarnings(parseInt(req.body.daysBefore || 5));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'NOTIFY_ERROR', message: error.message } });
  }
});

router.get('/admin/tiers', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const tiers = await prisma().loyaltyTier.findMany({ orderBy: { minPoints: 'asc' } });
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'TIER_ERROR', message: error.message } });
  }
});

router.post('/admin/tiers', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const tier = await prisma().loyaltyTier.create({ data: req.body });
    res.status(201).json({ success: true, data: tier });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'TIER_CREATE_ERROR', message: error.message } });
  }
});

router.put('/admin/tiers/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const tier = await prisma().loyaltyTier.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json({ success: true, data: tier });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'TIER_UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/admin/tiers/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await prisma().loyaltyTier.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'سطح حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'TIER_DELETE_ERROR', message: error.message } });
  }
});

router.get('/admin/rules', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const rules = await prisma().loyaltyRule.findMany({ orderBy: { event: 'asc' } });
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'RULE_ERROR', message: error.message } });
  }
});

router.post('/admin/rules', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const rule = await prisma().loyaltyRule.create({ data: req.body });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'RULE_CREATE_ERROR', message: error.message } });
  }
});

router.put('/admin/rules/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const rule = await prisma().loyaltyRule.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'RULE_UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/admin/rules/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await prisma().loyaltyRule.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'قانون حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'RULE_DELETE_ERROR', message: error.message } });
  }
});

router.get('/admin/campaigns', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const campaigns = await prisma().loyaltyCampaign.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'CAMPAIGN_ERROR', message: error.message } });
  }
});

router.post('/admin/campaigns', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { title, description, startDate, endDate, multiplier, bonus, priority, conditions, isActive } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'title, startDate, endDate لازم است' } });
    }
    const campaign = await prisma().loyaltyCampaign.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        multiplier: multiplier || 1,
        bonus: bonus || 0,
        priority: priority || 0,
        conditions: conditions || {},
        isActive: isActive !== false
      }
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'CAMPAIGN_CREATE_ERROR', message: error.message } });
  }
});

router.put('/admin/campaigns/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const campaign = await prisma().loyaltyCampaign.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'CAMPAIGN_UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/admin/campaigns/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await prisma().loyaltyCampaign.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'کمپین حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'CAMPAIGN_DELETE_ERROR', message: error.message } });
  }
});

router.post('/admin/rewards', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const reward = await prisma().loyaltyReward.create({ data: req.body });
    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'REWARD_CREATE_ERROR', message: error.message } });
  }
});

router.put('/admin/rewards/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const reward = await prisma().loyaltyReward.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json({ success: true, data: reward });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'REWARD_UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/admin/rewards/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await prisma().loyaltyReward.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'جایزه حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'REWARD_DELETE_ERROR', message: error.message } });
  }
});

router.get('/admin/referrals', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const referrals = await prisma().loyaltyReferral.findMany({
      include: { referrer: { select: { id: true, name: true } }, referred: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: referrals });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'REFERRAL_ERROR', message: error.message } });
  }
});

module.exports = router;
