const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const loyaltyService = require('./loyaltyService');
const { createLogger } = require('../utils/logger');
const dbUtils = require('../utils/database');

let _prisma = null;
function prisma() {
  if (!_prisma) {
    try { _prisma = dbUtils.getPrismaClient(); } catch (e) { _prisma = new PrismaClient(); }
  }
  return _prisma;
}
const logger = createLogger('LoyaltyScheduler');

const PENDING_FINALIZE_DAYS = 7;

class LoyaltyScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    try {
      this.tasks.push(
        cron.schedule('0 2 * * *', () => this.dailyJobs(), { scheduled: true, timezone: process.env.TZ || 'UTC' })
      );

      this.tasks.push(
        cron.schedule('*/30 * * * *', () => this.finalizePendingJobs(), { scheduled: true, timezone: process.env.TZ || 'UTC' })
      );

      this.isRunning = true;
      logger.info('Loyalty scheduler started');
      this.dailyJobs();
    } catch (error) {
      logger.error('Failed to start loyalty scheduler', { error: error.message });
    }
  }

  stop() {
    this.tasks.forEach((t) => t.stop());
    this.tasks = [];
    this.isRunning = false;
  }

  async dailyJobs() {
    try {
      const expired = await loyaltyService.expirePoints();
      logger.info('Loyalty expiry run', expired);
      const warned = await loyaltyService.sendExpiryWarnings(5);
      logger.info('Loyalty expiry warnings', warned);
      const birthdays = await this.runBirthdayCheck();
      logger.info('Loyalty birthday check', birthdays);
    } catch (e) {
      logger.error('Loyalty daily job error', { error: e.message });
    }
  }

  async finalizePendingJobs() {
    try {
      const cutoff = new Date(Date.now() - PENDING_FINALIZE_DAYS * 86400000);
      const orders = await prisma().order.findMany({
        where: {
          status: { in: ['DELIVERED', 'SHIPPED'] },
          updatedAt: { lte: cutoff }
        },
        select: { id: true }
      });
      for (const o of orders) {
        await loyaltyService.finalizeOrderPoints(o.id);
      }
    } catch (e) {
      logger.error('Loyalty finalize job error', { error: e.message });
    }
  }

  async runBirthdayCheck() {
    const now = new Date();
    const users = await prisma().user.findMany({
      where: { birthDate: { not: null }, isActive: true },
      select: { id: true, birthDate: true }
    });
    let awarded = 0;
    for (const u of users) {
      if (u.birthDate.getMonth() === now.getMonth() && u.birthDate.getDate() === now.getDate()) {
        const res = await loyaltyService.awardBirthday(u.id);
        if (res && res.points) awarded++;
      }
    }
    return { awarded };
  }
}

module.exports = new LoyaltyScheduler();
