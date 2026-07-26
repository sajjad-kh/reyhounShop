const { PrismaClient } = require('@prisma/client');
const dbUtils = require('../utils/database');

let _prisma = null;
function resolvePrisma() {
  if (_prisma) return _prisma;
  try {
    _prisma = dbUtils.getPrismaClient();
  } catch (e) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

const prisma = new Proxy({}, {
  get: (_, prop) => resolvePrisma()[prop]
});

const POINT_EXPIRY_DAYS = 365;
const ORDER_PENDING_DAYS = 7;

// Conversion rate: 1 loyalty point = POINT_TO_RIAL rials.
// 100 points = 100,000 rials (10,000 toman). Adjust as a business rule.
const POINT_TO_RIAL = 1000;

const pointsToRial = (points) => Math.max(0, Math.floor(points)) * POINT_TO_RIAL;
const rialToPoints = (rial) => Math.floor(Math.max(0, Math.floor(rial)) / POINT_TO_RIAL);

const DEFAULT_TIERS = [
  {
    name: 'BRONZE', label: 'برنز', minPoints: 0, maxPoints: 999, color: '#cd7f32',
    benefits: { discountPercent: 0, freeShipping: false, freeShippingMinOrder: 0, giftWrappingFree: false, birthdayPointsBonus: 0, returnDays: 7, annualGift: false, pointsMultiplier: 1 }
  },
  {
    name: 'SILVER', label: 'نقره‌ای', minPoints: 1000, maxPoints: 2999, color: '#c0c0c0',
    benefits: { discountPercent: 2, freeShipping: false, freeShippingMinOrder: 500000, giftWrappingFree: false, birthdayPointsBonus: 50, returnDays: 10, annualGift: false, pointsMultiplier: 1.1 }
  },
  {
    name: 'GOLD', label: 'طلایی', minPoints: 3000, maxPoints: 6999, color: '#ffd700',
    benefits: { discountPercent: 5, freeShipping: false, freeShippingMinOrder: 300000, giftWrappingFree: true, birthdayPointsBonus: 100, returnDays: 14, annualGift: false, pointsMultiplier: 1.25 }
  },
  {
    name: 'PLATINUM', label: 'پلاتین', minPoints: 7000, maxPoints: 14999, color: '#e5e4e2',
    benefits: { discountPercent: 8, freeShipping: true, freeShippingMinOrder: 0, giftWrappingFree: true, birthdayPointsBonus: 200, returnDays: 21, annualGift: true, pointsMultiplier: 1.5 }
  },
  {
    name: 'DIAMOND', label: 'الماس', minPoints: 15000, maxPoints: null, color: '#b9f2ff',
    benefits: { discountPercent: 12, freeShipping: true, freeShippingMinOrder: 0, giftWrappingFree: true, birthdayPointsBonus: 400, returnDays: 30, annualGift: true, pointsMultiplier: 2 }
  }
];

const DEFAULT_RULES = [
  { name: 'امتیاز خرید', event: 'ORDER_COMPLETED', points: 1, multiplierApplies: true, conditions: { amountPerPoint: 10000 } },
  { name: 'امتیاز نظر', event: 'REVIEW', points: 20, multiplierApplies: false, conditions: {} },
  { name: 'ورود روزانه', event: 'DAILY_LOGIN', points: 2, multiplierApplies: false, conditions: {} },
  { name: 'تولد', event: 'BIRTHDAY', points: 200, multiplierApplies: false, conditions: {} },
  { name: 'دعوت (ثبت‌نام)', event: 'REFERRAL_SIGNUP', points: 100, multiplierApplies: false, conditions: {} },
  { name: 'دعوت (اولین خرید)', event: 'REFERRAL_FIRST_ORDER', points: 500, multiplierApplies: false, conditions: {} },
  { name: 'اولین سفارش', event: 'FIRST_ORDER', points: 500, multiplierApplies: false, conditions: {} },
  { name: 'تکمیل پروفایل', event: 'PROFILE_COMPLETED', points: 50, multiplierApplies: false, conditions: {} }
];

const DEFAULT_REWARDS = [
  { title: '۱۰٪ تخفیف', description: 'تبادل ۵۰۰ امتیاز با ۱۰٪ تخفیف', requiredPoints: 500, rewardType: 'DISCOUNT', rewardValue: 10, rewardValueType: 'PERCENT', active: true },
  { title: 'ارسال رایگان', description: 'تبادل ۲۰۰۰ امتیاز با ارسال رایگان', requiredPoints: 2000, rewardType: 'FREE_SHIPPING', rewardValue: 0, rewardValueType: 'FIXED', active: true },
  { title: '۱۰۰,۰۰۰ تومان اعتبار', description: 'تبادل ۵۰۰۰ امتیاز با ۱۰۰,۰۰۰ تومان اعتبار', requiredPoints: 5000, rewardType: 'CREDIT', rewardValue: 100000, rewardValueType: 'FIXED', active: true }
];

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function genReferralCode(userId) {
  return 'REY' + (userId * 797 + 12345).toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

class LoyaltyService {
  async ensureWallet(userId) {
    let wallet = await prisma.loyaltyWallet.findUnique({ where: { userId }, include: { tier: true } });
    if (!wallet) {
      wallet = await prisma.loyaltyWallet.create({
        data: { userId, tierId: (await this._tierForPoints(0))?.id || null },
        include: { tier: true }
      });
    }
    return wallet;
  }

  async _tierForPoints(points) {
    const tiers = await prisma.loyaltyTier.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } });
    let matched = tiers.find((t) => points >= t.minPoints && (t.maxPoints === null || points <= t.maxPoints));
    return matched || tiers[0] || null;
  }

  async computeTierInfo(lifetimeEarned) {
    const tiers = await prisma.loyaltyTier.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } });
    const current = tiers.find((t) => lifetimeEarned >= t.minPoints && (t.maxPoints === null || lifetimeEarned <= t.maxPoints)) || tiers[0];
    const idx = tiers.findIndex((t) => t.id === current?.id);
    const next = idx >= 0 ? tiers[idx + 1] : null;
    const pointsToNext = next ? next.minPoints - lifetimeEarned : 0;
    return { current, next, pointsToNext };
  }

  async recalcTier(userId) {
    const wallet = await prisma.loyaltyWallet.findUnique({ where: { userId } });
    if (!wallet) return null;
    const { current } = await this.computeTierInfo(wallet.lifetimeEarned);
    return prisma.loyaltyWallet.update({
      where: { userId },
      data: { tierId: current?.id || null },
      include: { tier: true }
    });
  }

  async _notify(userId, { type, title, message, channel = 'EMAIL', metadata = {} }) {
    try {
      setImmediate(() => {
        const prisma = resolvePrisma();
        prisma.notification.create({
          data: { userId, type, channel, title, message, status: 'PENDING', metadata }
        }).catch(() => {});
        if (channel !== 'IN_APP') {
          prisma.notification.create({
            data: { userId, type, channel: 'IN_APP', title, message, status: 'SENT', metadata }
          }).catch(() => {});
        }
      });
    } catch (e) {
      console.error('Loyalty notify failed:', e.message);
    }
  }

  async _earn(tx, userId, { points, type, source, description, reference, referenceId, orderId, ruleId, campaignId, pending = false, expireDate = null }) {
    if (points <= 0) return null;
    const data = pending
      ? { pendingPoints: { increment: points }, lifetimeEarned: { increment: points } }
      : { availablePoints: { increment: points }, lifetimeEarned: { increment: points } };

    const wallet = await tx.loyaltyWallet.update({ where: { userId }, data });

    const ledger = await tx.loyaltyTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        points,
        balanceAfter: wallet.availablePoints,
        type,
        source,
        description,
        reference,
        referenceId,
        orderId,
        ruleId,
        campaignId,
        expireDate: expireDate || new Date(Date.now() + POINT_EXPIRY_DAYS * 86400000)
      }
    });

    const tiers = await tx.loyaltyTier.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } });
    const tier = tiers.find((t) => wallet.lifetimeEarned >= t.minPoints && (t.maxPoints === null || wallet.lifetimeEarned <= t.maxPoints)) || tiers[0];
    if (tier && tier.id !== wallet.tierId) {
      await tx.loyaltyWallet.update({ where: { userId }, data: { tierId: tier.id } });
    }
    return { wallet, ledger };
  }

  async _spend(tx, userId, { points, type, source, description, reference, referenceId, orderId, rewardId }) {
    if (points <= 0) return null;
    const wallet = await tx.loyaltyWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.availablePoints < points) {
      throw new Error('امتیاز کافی نیست');
    }
    const updated = await tx.loyaltyWallet.update({
      where: { userId },
      data: { availablePoints: { decrement: points }, lifetimeSpent: { increment: points } }
    });
    const ledger = await tx.loyaltyTransaction.create({
      data: {
        userId,
        walletId: updated.id,
        points: -points,
        balanceAfter: updated.availablePoints,
        type,
        source,
        description,
        reference,
        referenceId,
        orderId,
        expireDate: null
      }
    });
    return { wallet: updated, ledger };
  }

  async getActiveCampaigns() {
    const now = new Date();
    return prisma.loyaltyCampaign.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { priority: 'desc' }
    });
  }

  _campaignMatches(campaign, ctx) {
    const c = campaign.conditions || {};
    if (c.minAmount && ctx.amount < c.minAmount) return false;
    if (c.productIds && c.productIds.length) {
      const has = (ctx.productIds || []).some((id) => c.productIds.includes(id));
      if (!has) return false;
    }
    if (c.categoryIds && c.categoryIds.length) {
      const has = (ctx.categoryIds || []).some((id) => c.categoryIds.includes(id));
      if (!has) return false;
    }
    return true;
  }

  async evaluateCampaigns(ctx) {
    const campaigns = await this.getActiveCampaigns();
    let multiplier = 1;
    let bonus = 0;
    const applied = [];
    for (const campaign of campaigns) {
      if (this._campaignMatches(campaign, ctx)) {
        multiplier *= campaign.multiplier;
        bonus += campaign.bonus;
        applied.push({ id: campaign.id, title: campaign.title, multiplier: campaign.multiplier, bonus: campaign.bonus });
      }
    }
    return { multiplier, bonus, applied };
  }

  async getRule(event) {
    return prisma.loyaltyRule.findFirst({ where: { event, isActive: true }, orderBy: { priority: 'desc' } });
  }

  async awardOrderPoints(orderId, userId, amount, ctx = {}, pending = true) {
    const existing = await prisma.loyaltyTransaction.findFirst({ where: { orderId, type: 'EARN', source: 'ORDER' } });
    if (existing) return { skipped: true, reason: 'already_awarded' };

    const rule = await this.getRule('ORDER_COMPLETED');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    const per = rule.conditions?.amountPerPoint || 10000;
    let points = Math.floor(amount / per) * rule.points;
    if (points <= 0) return { skipped: true, reason: 'below_threshold' };

    const { multiplier, bonus, applied } = await this.evaluateCampaigns({
      amount,
      productIds: ctx.productIds || [],
      categoryIds: ctx.categoryIds || []
    });
    if (rule.multiplierApplies) points = points * multiplier;
    points += bonus;

    const wallet = await prisma.loyaltyWallet.findUnique({ where: { userId }, include: { tier: true } });
    const tierMultiplier = wallet?.tier?.benefits?.pointsMultiplier || 1;
    if (tierMultiplier > 1) points = Math.floor(points * tierMultiplier);

    return prisma.$transaction(async (tx) => {
      const campaignId = applied[0]?.id || null;
      const res = await this._earn(tx, userId, {
        points,
        type: 'EARN',
        source: 'ORDER',
        description: `امتیاز سفارش #${orderId}${applied.length ? ' (کمپین: ' + applied.map((a) => a.title).join('، ') + ')' : ''}`,
        reference: `ORDER:${orderId}`,
        referenceId: String(orderId),
        orderId,
        ruleId: rule.id,
        campaignId,
        pending
      });
      const orderCode = (await tx.order.findUnique({ where: { id: orderId }, select: { orderCode: true } }))?.orderCode;
      const orderLabel = orderCode || ('#' + orderId);
      await this._notify(userId, {
        type: 'LOYALTY_EARNED',
        title: 'امتیاز جدید',
        message: `${points} امتیاز برای سفارش ${orderLabel} دریافت کردید${pending ? ' (در انتظار تایید مرجوعی).' : '.'}`,
        metadata: { orderId }
      });
      return { points, pending, applied, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async finalizeOrderPoints(orderId) {
    const pending = await prisma.loyaltyTransaction.findMany({
      where: { orderId, type: 'EARN', source: 'ORDER', points: { gt: 0 } }
    });
    if (!pending.length) return { finalized: 0 };

    return prisma.$transaction(async (tx) => {
      let total = 0;
      for (const txn of pending) {
        const wallet = await tx.loyaltyWallet.findUnique({ where: { userId: txn.userId } });
        if (!wallet) continue;
        if (wallet.pendingPoints < txn.points) continue;
        await tx.loyaltyWallet.update({
          where: { userId: txn.userId },
          data: { pendingPoints: { decrement: txn.points }, availablePoints: { increment: txn.points } }
        });
        total += txn.points;
      }
      return { finalized: total };
    });
  }

  async processRefund(orderId, userId) {
    const earned = await prisma.loyaltyTransaction.findMany({
      where: { orderId, points: { gt: 0 }, type: { in: ['EARN', 'CAMPAIGN', 'BONUS'] } }
    });
    if (!earned.length) return { refunded: 0 };

    return prisma.$transaction(async (tx) => {
      let total = 0;
      for (const txn of earned) {
        const wallet = await tx.loyaltyWallet.findUnique({ where: { userId: txn.userId } });
        if (!wallet) continue;
        const avail = Math.min(txn.points, wallet.availablePoints);
        const pend = txn.points - avail;
        const dec = {};
        if (avail > 0) dec.availablePoints = { decrement: avail };
        if (pend > 0) dec.pendingPoints = { decrement: pend };
        if (Object.keys(dec).length) {
          await tx.loyaltyWallet.update({ where: { userId: txn.userId }, data: dec });
          await tx.loyaltyTransaction.create({
            data: {
              userId: txn.userId,
              walletId: wallet.id,
              points: -txn.points,
              balanceAfter: wallet.availablePoints - avail,
              type: 'REFUND',
              source: 'ORDER',
              description: `برگشت امتیاز سفارش #${orderId}`,
              reference: `ORDER:${orderId}`,
              referenceId: String(orderId),
              orderId,
              expireDate: null
            }
          });
          total += txn.points;
        }
      }
      return { refunded: total };
    });
  }

  async awardReview(userId, orderId, productId) {
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: { userId, type: 'REVIEW', referenceId: `${orderId}:${productId}` }
    });
    if (existing) return { skipped: true };

    const rule = await this.getRule('REVIEW');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    return prisma.$transaction(async (tx) => {
      const res = await this._earn(tx, userId, {
        points: rule.points,
        type: 'REVIEW',
        source: 'REVIEW',
        description: 'امتیاز ثبت نظر',
        reference: `REVIEW:${orderId}:${productId}`,
        referenceId: `${orderId}:${productId}`,
        orderId,
        ruleId: rule.id
      });
      await this._notify(userId, { type: 'LOYALTY_EARNED', title: '🎉 امتیاز نظر', message: `${rule.points} امتیاز بابت ثبت نظر دریافت کردید.` });
      return { points: rule.points, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async awardDailyLogin(userId) {
    const date = todayStr();
    const existing = await prisma.loyaltyDailyLogin.findUnique({ where: { userId_date: { userId, date } } });
    if (existing) return { skipped: true, reason: 'already_today' };

    const rule = await this.getRule('DAILY_LOGIN');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyDailyLogin.create({ data: { userId, date, points: rule.points } });
      const res = await this._earn(tx, userId, {
        points: rule.points,
        type: 'LOGIN',
        source: 'LOGIN',
        description: 'امتیاز ورود روزانه',
        reference: `LOGIN:${date}`,
        referenceId: date,
        ruleId: rule.id
      });
      await this._notify(userId, { type: 'LOYALTY_EARNED', title: '🎉 حضور روزانه', message: `${rule.points} امتیاز ورود روزانه دریافت کردید.` });
      return { points: rule.points, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async awardBirthday(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.birthDate) return { skipped: true, reason: 'no_birthdate' };
    const now = new Date();
    if (now.getMonth() !== user.birthDate.getMonth() || now.getDate() !== user.birthDate.getDate()) {
      return { skipped: true, reason: 'not_birthday' };
    }
    const year = now.getFullYear();
    const existing = await prisma.loyaltyBirthdayGrant.findUnique({ where: { userId_year: { userId, year } } });
    if (existing) return { skipped: true, reason: 'already_this_year' };

    const rule = await this.getRule('BIRTHDAY');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyBirthdayGrant.create({ data: { userId, year, points: rule.points } });
      const res = await this._earn(tx, userId, {
        points: rule.points,
        type: 'BIRTHDAY',
        source: 'BIRTHDAY',
        description: 'امتیاز تولد',
        reference: `BIRTHDAY:${year}`,
        referenceId: String(year),
        ruleId: rule.id
      });
      const wallet = await this.ensureWallet(userId);
      const benefits = wallet?.tier?.benefits;
      const bonusPoints = benefits?.birthdayPointsBonus || 0;
      if (bonusPoints > 0) {
        await this._earn(tx, userId, {
          points: bonusPoints,
          type: 'BONUS',
          source: 'TIER',
          description: `پاداش تولد سطح ${wallet?.tier?.label || ''}`,
          reference: `TIER_BIRTHDAY_BONUS:${year}`,
          referenceId: String(year)
        });
      }
      const totalPoints = rule.points + bonusPoints;
      await this._notify(userId, { type: 'LOYALTY_BIRTHDAY', title: '🎂 تولد مبارک', message: `${totalPoints} امتیاز تولد دریافت کردید. سال خوبی داشته باشید!` });
      return { points: totalPoints, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async awardFirstOrder(userId, orderId, pending = true) {
    const rule = await this.getRule('FIRST_ORDER');
    if (!rule) return { skipped: true, reason: 'no_rule' };
    const prior = await prisma.order.count({ where: { userId, status: { not: 'CANCELLED' } } });
    if (prior > 1) return { skipped: true, reason: 'not_first' };

    return prisma.$transaction(async (tx) => {
      const res = await this._earn(tx, userId, {
        points: rule.points,
        type: 'FIRST_ORDER',
        source: 'ORDER',
        description: 'امتیاز اولین سفارش',
        reference: `FIRST_ORDER:${orderId}`,
        referenceId: String(orderId),
        orderId,
        ruleId: rule.id,
        pending
      });
      await this._notify(userId, { type: 'LOYALTY_EARNED', title: '🎉 اولین سفارش', message: `${rule.points} امتیاز بابت اولین سفارش دریافت کردید.` });
      return { points: rule.points, pending, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async awardProfileCompleted(userId) {
    const rule = await this.getRule('PROFILE_COMPLETED');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    const prior = await prisma.loyaltyTransaction.findFirst({
      where: { userId, type: 'PROFILE_COMPLETED' }
    });
    if (prior) return { skipped: true, reason: 'already_awarded' };

    return prisma.$transaction(async (tx) => {
      const res = await this._earn(tx, userId, {
        points: rule.points,
        type: 'PROFILE_COMPLETED',
        source: 'PROFILE',
        description: 'امتیاز تکمیل پروفایل',
        reference: 'PROFILE_COMPLETED',
        referenceId: 'PROFILE_COMPLETED'
      });
      await this._notify(userId, { type: 'LOYALTY_EARNED', title: '👤 تکمیل پروفایل', message: `${rule.points} امتیاز بابت تکمیل پروفایل دریافت کردید.` });
      return { points: rule.points, wallet: res.wallet, transaction: res.ledger };
    });
  }

  async createReferralCode(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.referralCode) return user.referralCode;
    let code = genReferralCode(userId);
    while (await prisma.user.findFirst({ where: { referralCode: code } })) {
      code = genReferralCode(userId) + Math.random().toString(36).slice(2, 4).toUpperCase();
    }
    await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
    return code;
  }

  async processReferralSignup(referredId, code) {
    const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!referrer) return { skipped: true, reason: 'invalid_code' };
    if (referrer.id === referredId) return { skipped: true, reason: 'self_referral' };

    const existing = await prisma.loyaltyReferral.findFirst({ where: { referrerId: referrer.id, referredId } });
    if (existing) return { skipped: true, reason: 'already_referred' };

    const rule = await this.getRule('REFERRAL_SIGNUP');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    const uniqueCode = `${code}-${referredId}`;

    return prisma.$transaction(async (tx) => {
      const referral = await tx.loyaltyReferral.create({
        data: { code: uniqueCode, referrerId: referrer.id, referredId, status: 'REGISTERED', registeredAt: new Date(), referredPoints: rule.points }
      });
      await tx.user.update({ where: { id: referredId }, data: { referredById: referrer.id } });
      const res = await this._earn(tx, referredId, {
        points: rule.points,
        type: 'REFERRAL',
        source: 'REFERRAL',
        description: 'امتیاز دعوت (ثبت‌نام)',
        reference: `REFERRAL:${referral.id}`,
        referenceId: String(referral.id),
        ruleId: rule.id
      });
      await this._notify(referredId, { type: 'LOYALTY_REFERRAL', title: '🎁 دعوت دوستان', message: `${rule.points} امتیاز بابت عضویت با کد دعوت دریافت کردید.` });
      return { points: rule.points, wallet: res.wallet };
    });
  }

  async processReferralFirstOrder(referredId, orderId) {
    const referral = await prisma.loyaltyReferral.findFirst({ where: { referredId, status: 'REGISTERED' } });
    if (!referral) return { skipped: true, reason: 'no_referral' };
    const rule = await this.getRule('REFERRAL_FIRST_ORDER');
    if (!rule) return { skipped: true, reason: 'no_rule' };

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyReferral.update({ where: { id: referral.id }, data: { status: 'FIRST_ORDER_COMPLETED', firstOrderAt: new Date() } });
      const res = await this._earn(tx, referral.referrerId, {
        points: rule.points,
        type: 'REFERRAL',
        source: 'REFERRAL',
        description: 'امتیاز دعوت (اولین خرید دوست)',
        reference: `REFERRAL_FIRST:${referral.id}`,
        referenceId: String(referral.id),
        orderId,
        ruleId: rule.id
      });
      await tx.loyaltyReferral.update({ where: { id: referral.id }, data: { referrerPoints: rule.points } });
      await this._notify(referral.referrerId, { type: 'LOYALTY_REFERRAL', title: '🤝 دعوت موفق', message: `دوستت اولین خریدش را انجام داد! ${rule.points} امتیاز دریافت کردید.` });
      return { points: rule.points, wallet: res.wallet };
    });
  }

  async getReferralInfo(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    const code = user.referralCode || (await this.createReferralCode(userId));
    const referrals = await prisma.loyaltyReferral.findMany({
      where: { referrerId: userId },
      include: { referred: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const stats = await prisma.loyaltyReferral.aggregate({ where: { referrerId: userId }, _count: true, _sum: { referrerPoints: true } });
    return {
      code,
      inviteUrl: `${process.env.FRONTEND_URL || ''}/register?ref=${code}`,
      referrals: referrals.map(r => ({
        name: r.referred?.name || 'ناشناخته',
        status: r.status,
        pointsEarned: r.referrerPoints || 0,
        createdAt: r.createdAt,
        registeredAt: r.registeredAt,
        firstOrderAt: r.firstOrderAt
      })),
      totalReferred: stats._count || 0,
      totalEarned: stats._sum.referrerPoints || 0
    };
  }

  async listRewards() {
    return prisma.loyaltyReward.findMany({ where: { active: true }, orderBy: { requiredPoints: 'asc' } });
  }

  async getReward(id) {
    return prisma.loyaltyReward.findUnique({ where: { id } });
  }

  async validateRedemption(userId, points) {
    const wallet = await this.ensureWallet(userId);
    if (points <= 0) return { valid: false, error: 'مقدار امتیاز نامعتبر است' };
    if (wallet.availablePoints < points) return { valid: false, error: 'امتیاز کافی نیست' };
    return { valid: true, points, remainingPoints: wallet.availablePoints - points };
  }

  // Spend loyalty points directly against an order inside an existing transaction.
  // Returns { pointsUsed, discount } where discount is in rials.
  async spendPointsOnOrder(tx, userId, pointsRequested, maxDiscountRial) {
    const safePoints = Math.floor(pointsRequested || 0);
    if (safePoints <= 0) return { pointsUsed: 0, discount: 0 };

    const wallet = await tx.loyaltyWallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('WALLET_NOT_FOUND');

    let points = safePoints;
    // Cap by available points
    if (points > wallet.availablePoints) {
      throw new Error('امتیاز کافی نیست');
    }
    // Cap by maxDiscountRial (don't let discount exceed order total)
    const maxPoints = rialToPoints(maxDiscountRial);
    if (maxPoints > 0 && points > maxPoints) {
      points = maxPoints;
    }
    if (points <= 0) return { pointsUsed: 0, discount: 0 };

    const discount = pointsToRial(points);

    await this._spend(tx, userId, {
      points,
      type: 'SPEND',
      source: 'ORDER',
      description: `استفاده از ${points} امتیاز در سفارش`,
      reference: 'ORDER',
      orderId: null
    });

    return { pointsUsed: points, discount };
  }

  async expirePoints() {
    const now = new Date();
    const expiredLedgers = await prisma.loyaltyTransaction.findMany({
      where: { points: { gt: 0 }, expireDate: { lt: now } },
      include: { user: { select: { id: true } } }
    });

    let processed = 0;
    let totalExpired = 0;

    const alreadyExpired = await prisma.loyaltyTransaction.findMany({
      where: { type: 'EXPIRE' },
      select: { referenceId: true }
    });
    const expiredRefs = new Set(alreadyExpired.map((e) => e.referenceId).filter(Boolean));

    const byUser = {};
    for (const txn of expiredLedgers) {
      if (expiredRefs.has(String(txn.id))) continue;
      byUser[txn.userId] = byUser[txn.userId] || [];
      byUser[txn.userId].push(txn);
    }

    for (const [userId, txns] of Object.entries(byUser)) {
      try {
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.loyaltyWallet.findUnique({ where: { userId: Number(userId) } });
          if (!wallet) return;
          let availToExpire = Math.min(
            txns.reduce((s, t) => s + t.points, 0),
            wallet.availablePoints
          );
          if (availToExpire <= 0) return;
          await tx.loyaltyWallet.update({
            where: { userId: Number(userId) },
            data: { availablePoints: { decrement: availToExpire }, lifetimeExpired: { increment: availToExpire } }
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: Number(userId),
              walletId: wallet.id,
              points: -availToExpire,
              balanceAfter: wallet.availablePoints - availToExpire,
              type: 'EXPIRE',
              source: 'ADMIN',
              description: 'انقضای امتیاز',
              reference: `EXPIRE_BATCH`,
              referenceId: txns.map((t) => String(t.id)).join(','),
              expireDate: null
            }
          });
          processed++;
          totalExpired += availToExpire;
        });
      } catch (e) {
        console.error('Expire error user', userId, e.message);
      }
    }

    return { processedUsers: processed, totalPointsExpired: totalExpired };
  }

  async sendExpiryWarnings(daysBefore = 5) {
    const target = new Date(Date.now() + daysBefore * 86400000);
    const ledgers = await prisma.loyaltyTransaction.findMany({
      where: { points: { gt: 0 }, expireDate: { gte: new Date(), lte: target } }
    });
    const byUser = {};
    for (const txn of ledgers) {
      byUser[txn.userId] = byUser[txn.userId] || { points: 0, soonest: txn.expireDate };
      byUser[txn.userId].points += txn.points;
      if (txn.expireDate < byUser[txn.userId].soonest) byUser[txn.userId].soonest = txn.expireDate;
    }
    for (const [userId, info] of Object.entries(byUser)) {
      await this._notify(Number(userId), {
        type: 'LOYALTY_EXPIRING',
        title: '⏰ انقضای امتیاز',
        message: `${info.points} امتیاز تا ${info.soonest.toLocaleDateString('fa-IR')} منقضی می‌شود.`
      });
    }
    return { notified: Object.keys(byUser).length };
  }

  async getUserTierBenefits(userId) {
    const wallet = await this.ensureWallet(userId);
    if (!wallet?.tier?.id) return null;
    const tier = await prisma.loyaltyTier.findUnique({ where: { id: wallet.tierId } });
    return tier?.benefits || null;
  }

  async getUserStats(userId) {
    const wallet = await this.ensureWallet(userId);
    const { current, next, pointsToNext } = await this.computeTierInfo(wallet.lifetimeEarned);
    const expiring = await prisma.loyaltyTransaction.aggregate({
      where: { userId, points: { gt: 0 }, expireDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } },
      _sum: { points: true }
    });
    const referral = await this.getReferralInfo(userId);
    return {
      availablePoints: wallet.availablePoints,
      pendingPoints: wallet.pendingPoints,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeSpent: wallet.lifetimeSpent,
      lifetimeExpired: wallet.lifetimeExpired,
      tier: current ? { name: current.name, label: current.label, color: current.color, benefits: current.benefits || null } : null,
      nextTier: next ? { name: next.name, label: next.label, minPoints: next.minPoints } : null,
      pointsToNext,
      expiringSoon: expiring._sum.points || 0,
      referral
    };
  }

  async getHistory(userId, { page = 1, limit = 20, type = null } = {}) {
    const where = { userId };
    if (type === 'earned') where.points = { gt: 0 };
    else if (type === 'redeemed') where.points = { lt: 0 };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where,
        include: { campaign: { select: { title: true } }, rule: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.loyaltyTransaction.count({ where })
    ]);
    return {
      transactions: items.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        source: t.source,
        description: t.description,
        reference: t.reference,
        orderId: t.orderId,
        campaign: t.campaign?.title || null,
        rule: t.rule?.name || null,
        balanceAfter: t.balanceAfter,
        expireDate: t.expireDate,
        createdAt: t.createdAt
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async forecastPoints(amount) {
    const rule = await this.getRule('ORDER_COMPLETED');
    if (!rule) return { points: 0, amount };
    const per = rule.conditions?.amountPerPoint || 10000;
    let points = Math.floor(amount / per) * rule.points;
    const { multiplier, bonus } = await this.evaluateCampaigns({ amount, productIds: [], categoryIds: [] });
    if (rule.multiplierApplies) points = points * multiplier;
    points += bonus;
    return { amount, basePoints: Math.floor(amount / per) * rule.points, multiplier, bonus, points };
  }

  async getSystemStats() {
    const [issued, redeemed, expired, activeUsers, txCount, pending] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({ where: { points: { gt: 0 } }, _sum: { points: true } }),
      prisma.loyaltyTransaction.aggregate({ where: { points: { lt: 0 }, type: { in: ['SPEND', 'EXPIRE'] } }, _sum: { points: true } }),
      prisma.loyaltyTransaction.aggregate({ where: { type: 'EXPIRE' }, _sum: { points: true } }),
      prisma.loyaltyWallet.count({ where: { availablePoints: { gt: 0 } } }),
      prisma.loyaltyTransaction.count(),
      prisma.loyaltyWallet.aggregate({ _sum: { pendingPoints: true } })
    ]);
    const tierDist = await prisma.loyaltyWallet.groupBy({ by: ['tierId'], _count: true });
    const tiers = await prisma.loyaltyTier.findMany();
    const tierDistribution = tierDist.map((d) => ({
      tier: tiers.find((t) => t.id === d.tierId)?.label || 'بدون سطح',
      count: d._count
    }));
    return {
      totalIssued: issued._sum.points || 0,
      totalRedeemed: Math.abs(redeemed._sum.points || 0),
      totalExpired: Math.abs(expired._sum.points || 0),
      activeUsers,
      totalTransactions: txCount,
      pendingPoints: pending._sum.pendingPoints || 0,
      tierDistribution
    };
  }

  async adminAdjust(userId, points, reason, adminId) {
    if (points === 0) throw new Error('مقدار نمی‌تواند صفر باشد');
    return prisma.$transaction(async (tx) => {
      const res = points > 0
        ? await this._earn(tx, userId, { points, type: 'ADJUSTMENT', source: 'ADMIN', description: `تنظیم ادمین: ${reason}` })
        : await this._spend(tx, userId, { points: Math.abs(points), type: 'ADJUSTMENT', source: 'ADMIN', description: `تنظیم ادمین: ${reason}` });
      await this._notify(userId, {
        type: points > 0 ? 'LOYALTY_EARNED' : 'LOYALTY_REDEEMED',
        title: '🔧 تنظیم امتیاز',
        message: `ادمین ${points > 0 ? 'افزود' : 'کاست'}: ${Math.abs(points)} امتیاز (${reason})`
      });
      return { wallet: res.wallet, transaction: res.ledger };
    });
  }

  // Grant points to all (active) users at once — used for seasonal campaigns.
  async adminBulkGrant(points, reason, adminId) {
    if (!points || points <= 0) throw new Error('مقدار امتیاز باید مثبت باشد');
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let granted = 0;
    for (const u of users) {
      await this.ensureWallet(u.id);
      await this._earn(prisma, u.id, {
        points,
        type: 'ADJUSTMENT',
        source: 'ADMIN',
        description: `اعطای دسته‌جمعی: ${reason}`,
      });
      await this._notify(u.id, {
        type: 'LOYALTY_EARNED',
        title: '🎁 امتیاز هدیه',
        message: `${points} امتیاز هدیه دریافت کردید (${reason})`,
      });
      granted++;
    }
    return { granted: granted, points };
  }

  async seedDefaults() {
    for (const t of DEFAULT_TIERS) {
      await prisma.loyaltyTier.upsert({ where: { name: t.name }, update: t, create: t });
    }
    for (const r of DEFAULT_RULES) {
      await prisma.loyaltyRule.upsert({
        where: { event: r.event },
        update: r,
        create: { ...r, name: r.name }
      });
    }
    const rewardCount = await prisma.loyaltyReward.count();
    if (rewardCount === 0) {
      for (const rw of DEFAULT_REWARDS) {
        await prisma.loyaltyReward.create({ data: rw });
      }
    }
    return { tiers: DEFAULT_TIERS.length, rules: DEFAULT_RULES.length, rewards: rewardCount === 0 ? DEFAULT_REWARDS.length : 0 };
  }

  async ensureAllWallets() {
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      await this.ensureWallet(u.id);
    }
    return users.length;
  }
}

module.exports = new LoyaltyService();
module.exports.POINT_EXPIRY_DAYS = POINT_EXPIRY_DAYS;
module.exports.ORDER_PENDING_DAYS = ORDER_PENDING_DAYS;
