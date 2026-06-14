const { getPrismaClient } = require('../utils/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and token
   */
  async register(userData) {
    const { email, password, name, phone } = userData;

    // Check if user already exists
    const existingUser = await getPrismaClient().user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      if (existingUser.phone === phone) {
        throw new Error('PHONE_ALREADY_EXISTS');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await getPrismaClient().user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        // birthDate: birthDate ? new Date(birthDate) : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        loyaltyPoints: true,
        // birthDate: true,
        createdAt: true
      }
    });

    // Create empty cart for user
    await getPrismaClient().cart.create({
      data: {
        userId: user.id
      }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Log registration activity
    await this.logActivity(user.id, 'user.registered', 'User', user.id, {
      email: user.email,
      name: user.name
    });

    return {
      user,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  }

  async createBaleSession(loginId) {
    await getPrismaClient().authSession.create({
      data: {
        id: loginId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 1000 * 60 * 5) // 5 min
      }
    });

    return true;
  }

  async checkBaleSession(loginId) {
    const session = await getPrismaClient().authSession.findUnique({
      where: { id: loginId },
      include: { user: true }
    });

    if (!session) return null;

    // expired check
    if (session.expiresAt < new Date()) {
      await getPrismaClient().authSession.update({
        where: { id: loginId },
        data: { status: 'EXPIRED' }
      });

      return { status: 'EXPIRED' };
    }

    if (session.status !== 'APPROVED') {
      return { status: session.status };
    }

    // approved → generate token
    const token = generateToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role
      });

      return {
        status: 'APPROVED',
        token,
        user: session.user
      };
  }

  async processBaleLogin({ loginId, chatId, username, firstName }) {
    const prisma = getPrismaClient();

    try {
      // 1. پیدا کردن session
      const session = await prisma.authSession.findUnique({
        where: { id: loginId }
      });

      console.log('🔍 SESSION:', session);

      if (!session) throw new Error('SESSION_NOT_FOUND');
      if (session.status !== 'PENDING') return { status: session.status };

      // 2. پیدا کردن user یا ساخت user جدید
      let user = await prisma.user.findUnique({
        where: { baleChatId: String(chatId) }
      });

      console.log('👤 USER FOUND:', user);

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: firstName || username || 'Bale User',
            email: null,
            password: null,
            phone: null,
            baleChatId: String(chatId),
            baleUsername: username,
            baleFirstName: firstName,
            baleConnectedAt: new Date()
          }
        });
        console.log('✅ USER CREATED:', user.id);
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            baleUsername: username,
            baleFirstName: firstName,
            baleConnectedAt: new Date()
          }
        });
        console.log('✅ USER UPDATED:', user.id);
      }

      // 3. approve session
      await prisma.authSession.update({
        where: { id: loginId },
        data: { status: 'APPROVED', userId: user.id }
      });

      console.log('✅ SESSION APPROVED');
      return { success: true };

    } catch (err) {
      console.error('❌ processBaleLogin ERROR:', err.message);
      throw err;
    }
  }










/**
 * مرحله ۱: شروع لاگین از سمت وب - ساخت session
 */
async createTelegramSession(loginId) {
  await getPrismaClient().authSession.create({
    data: {
      id: loginId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000 * 60 * 5) // 5 دقیقه
    }
  });
  return true;
}

/**
 * مرحله ۲: کاربر در تلگرام /start <loginId> را زده
 * فقط chatId را به session متصل می‌کنیم و منتظر phone می‌مانیم
 */
async attachTelegramChat(loginId, chatId) {
  const prisma = getPrismaClient();

  const session = await prisma.authSession.findUnique({ where: { id: loginId } });

  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (session.expiresAt < new Date()) throw new Error('SESSION_EXPIRED');
  if (session.status !== 'PENDING') throw new Error('SESSION_NOT_PENDING');

  // اگه قبلاً یه chatId دیگه به این session وصل شده بود (کاربر چند بار /start زده)، آپدیتش کن
  await prisma.authSession.update({
    where: { id: loginId },
    data: { telegramChatId: String(chatId) }
  });

  return true;
}

/**
 * مرحله ۳: کاربر دکمه contact را زده و phone فرستاده
 * پیدا کردن session بر اساس chatId، ساخت/آپدیت یوزر، approve کردن session
 */
async processTelegramContact({ chatId, telegramId, username, firstName, lastName, phone }) {
  const prisma = getPrismaClient();

  // 1. پیدا کردن session معتبر بر اساس chatId
  const session = await prisma.authSession.findUnique({
    where: { telegramChatId: String(chatId) }
  });

  if (!session) throw new Error('NO_PENDING_LOGIN');
  if (session.expiresAt < new Date()) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' }
    });
    throw new Error('SESSION_EXPIRED');
  }
  if (session.status !== 'PENDING') throw new Error('SESSION_NOT_PENDING');

  const tgId = BigInt(telegramId);
  const normalizedPhone = normalizePhone(phone);

  // 2. پیدا کردن یوزر بر اساس telegramId
  let user = await prisma.user.findUnique({ where: { telegramId: tgId } });

  if (!user) {
    // 3. چک کن این شماره از قبل با اکانت دیگه‌ای (ایمیل/پسورد) ثبت شده یا نه
    const existingByPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

    if (existingByPhone) {
      // اتصال (merge) اکانت تلگرام به اکانت موجود
      user = await prisma.user.update({
        where: { id: existingByPhone.id },
        data: {
          telegramId: tgId,
          telegramUsername: username || null,
          telegramFirstName: firstName || null,
          telegramLastName: lastName || null,
          telegramConnectedAt: new Date()
        }
      });

      await this.logActivity(user.id, 'user.telegram_linked', 'User', user.id, { telegramId });
    } else {
      // 4. کاربر کاملاً جدید
      user = await prisma.user.create({
        data: {
          name: firstName || username || 'Telegram User',
          email: null,
          password: null,
          phone: normalizedPhone,
          authProvider: 'TELEGRAM',
          telegramId: tgId,
          telegramUsername: username || null,
          telegramFirstName: firstName || null,
          telegramLastName: lastName || null,
          telegramConnectedAt: new Date()
        }
      });

      await prisma.cart.create({ data: { userId: user.id } });
      await this.logActivity(user.id, 'user.registered_via_telegram', 'User', user.id, { telegramId, phone: normalizedPhone });
    }
  } else {
    // یوزر تلگرامی از قبل بود؛ phone را sync کن اگه نداشت یا فرق داشت
    if (!user.isActive) {
      throw new Error('ACCOUNT_DISABLED');
    }

    const updateData = {
      telegramUsername: username || null,
      telegramFirstName: firstName || null,
      telegramLastName: lastName || null,
      telegramConnectedAt: new Date()
    };

    if (!user.phone) {
      updateData.phone = normalizedPhone;
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
  }

  // 5. approve کردن session
  await prisma.authSession.update({
    where: { id: session.id },
    data: { status: 'APPROVED', userId: user.id, telegramChatId: null } // پاکسازی chatId
  });

  await this.logActivity(user.id, 'user.login_telegram_bot', 'User', user.id, { telegramId, phone: normalizedPhone });

  return { success: true, userName: user.name };
}

/**
 * مرحله ۴: فرانت polling می‌زنه روی این (مشابه checkBaleSession)
 */
async checkTelegramSession(loginId) {
  const session = await getPrismaClient().authSession.findUnique({
    where: { id: loginId },
    include: { user: true }
  });

  if (!session) return null;

  if (session.expiresAt < new Date() && session.status === 'PENDING') {
    await getPrismaClient().authSession.update({
      where: { id: loginId },
      data: { status: 'EXPIRED', telegramChatId: null }
    });
    return { status: 'EXPIRED' };
  }

  if (session.status !== 'APPROVED') {
    return { status: session.status };
  }

  const token = generateToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role
  });

  return {
    status: 'APPROVED',
    token,
    user: session.user
  };
}























  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @param {string} ip - User IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} User and token
   */
  async login(credentials, ip, userAgent) {
    const { email, password } = credentials;

    // Find user by email
    const user = await getPrismaClient().user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        loyaltyPoints: true,
        // birthDate: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_DISABLED');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Generate refresh token (for now, using same token - should be separate in production)
    const refreshToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh'
    });

    // Log login activity
    await this.logActivity(user.id, 'user.login', 'User', user.id, {
      ip,
      userAgent,
      timestamp: new Date()
    }, ip, userAgent);

    return {
      user: userWithoutPassword,
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      requires2FA: user.is2FAEnabled
    };
  }

  /**
   * Setup 2FA for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} 2FA setup data
   */
  async setup2FA(userId) {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `E-commerce Platform (${userId})`,
      issuer: 'E-commerce Platform'
    });

    // Save secret to user
    await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        twoFASecret: secret.base32,
        is2FAEnabled: false // Will be enabled after verification
      }
    });

    // Log 2FA setup activity
    await this.logActivity(userId, 'user.2fa_setup_initiated', 'User', userId);

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Verify 2FA token and enable 2FA
   * @param {number} userId - User ID
   * @param {string} token - 2FA token
   * @returns {Promise<boolean>} Verification result
   */
  async verify2FA(userId, token) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { twoFASecret: true, is2FAEnabled: true }
    });

    if (!user || !user.twoFASecret) {
      throw new Error('2FA_NOT_SETUP');
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    if (!verified) {
      throw new Error('INVALID_2FA_TOKEN');
    }

    // Enable 2FA if not already enabled
    if (!user.is2FAEnabled) {
      await getPrismaClient().user.update({
        where: { id: userId },
        data: { is2FAEnabled: true }
      });

      // Log 2FA enabled activity
      await this.logActivity(userId, 'user.2fa_enabled', 'User', userId);
    }

    return true;
  }

  /**
   * Disable 2FA for user
   * @param {number} userId - User ID
   * @param {string} token - 2FA token for verification
   * @returns {Promise<boolean>} Disable result
   */
  async disable2FA(userId, token) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { twoFASecret: true, is2FAEnabled: true }
    });

    if (!user || !user.is2FAEnabled) {
      throw new Error('2FA_NOT_ENABLED');
    }

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      throw new Error('INVALID_2FA_TOKEN');
    }

    // Disable 2FA
    await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        is2FAEnabled: false,
        twoFASecret: null
      }
    });

    // Log 2FA disabled activity
    await this.logActivity(userId, 'user.2fa_disabled', 'User', userId);

    return true;
  }

  /**
   * Log user activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Additional details
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent
   */
  async logActivity(userId, action, entity, entityId, details = {}, ip = null, userAgent = null) {
    try {
      await getPrismaClient().activityLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          details,
          ip,
          userAgent
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }




}

function normalizePhone(phone) {
  if (!phone) return null;
  // +989123456789 -> 09123456789
  if (phone.startsWith('+98')) return '0' + phone.slice(3);
  if (phone.startsWith('0098')) return '0' + phone.slice(4);
  if (phone.startsWith('98') && phone.length === 12) return '0' + phone.slice(2);
  return phone;
}

module.exports = new AuthService();
