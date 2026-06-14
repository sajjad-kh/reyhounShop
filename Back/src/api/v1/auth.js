const express = require('express');
const authService = require('../../services/authService');
const { validate, userRegistrationSchema, userLoginSchema } = require('../../utils/validation');
const { authenticateToken } = require('../../middleware/auth');
const Joi = require('joi');

const router = express.Router();

const { sendTelegramMessage, requestPhoneKeyboard, removeKeyboard } = require('../../utils/telegram');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegistration:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (min 8 chars, must contain uppercase, lowercase, number, special char)
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *         phone:
 *           type: string
 *           description: User's phone number (optional)
 *         birthDate:
 *           type: string
 *           format: date
 *           description: User's birth date (optional)
 *     
 *     UserBaleLogin:
 *       type: object
 *       properties:
 *         loginId:
 *           type: string
 *           description: Temporary login session id
 *         chatId:
 *           type: string
 *           description: Bale user chat id
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             name:
 *               type: string
 *             role:
 *               type: string
 *         token:
 *           type: string
 *         expiresIn:
 *           type: string
 *         requires2FA:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', validate(userRegistrationSchema), async (req, res) => {
  try {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists'
        }
      });
    }
    
    if (error.message === 'PHONE_ALREADY_EXISTS') {
      return res.status(400).json({
        error: {
          code: 'PHONE_ALREADY_EXISTS',
          message: 'An account with this phone number already exists'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Account disabled
 *       500:
 *         description: Internal server error
 */
router.post('/login', validate(userLoginSchema), async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const result = await authService.login(req.body, ip, userAgent);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }
    
    if (error.message === 'ACCOUNT_DISABLED') {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact support.'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to login'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/setup-2fa:
 *   post:
 *     summary: Setup two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                 qrCode:
 *                   type: string
 *                 manualEntryKey:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  try {
    const result = await authService.setup2FA(req.user.userId);
    
    res.json({
      success: true,
      message: '2FA setup initiated. Please scan the QR code or enter the manual key in your authenticator app.',
      data: result
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    
    res.status(500).json({
      error: {
        code: '2FA_SETUP_FAILED',
        message: 'Failed to setup 2FA'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/verify-2fa:
 *   post:
 *     summary: Verify and enable two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit 2FA token from authenticator app
 *     responses:
 *       200:
 *         description: 2FA verified and enabled
 *       400:
 *         description: Invalid 2FA token or 2FA not setup
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/verify-2fa', authenticateToken, validate(Joi.object({
  token: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.length': '2FA token must be 6 digits',
    'string.pattern.base': '2FA token must contain only numbers'
  })
})), async (req, res) => {
  try {
    await authService.verify2FA(req.user.userId, req.body.token);
    
    res.json({
      success: true,
      message: '2FA verified and enabled successfully'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    
    if (error.message === '2FA_NOT_SETUP') {
      return res.status(400).json({
        error: {
          code: '2FA_NOT_SETUP',
          message: 'Please setup 2FA first using /setup-2fa endpoint'
        }
      });
    }
    
    if (error.message === 'INVALID_2FA_TOKEN') {
      return res.status(400).json({
        error: {
          code: 'INVALID_2FA_TOKEN',
          message: 'Invalid 2FA token. Please try again.'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: '2FA_VERIFICATION_FAILED',
        message: 'Failed to verify 2FA token'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/bale/login:
 *   post:
 *     summary: Start Bale login flow
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Login link generated
 */
router.post('/bale/login', async (req, res) => {
  try {
    const crypto = require('crypto');
    const loginId = crypto.randomUUID();

    console.log("LOGIN ID:", loginId);

    // ✅ session را در DB ذخیره کن
    await authService.createBaleSession(loginId);


    return res.json({
      success: true,
      data: {
        loginId,
        url: `bale://bot?start=${loginId}`
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: {
        code: 'BALE_LOGIN_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/bale/status/:loginId/{loginId}:
 *   get:
 *     summary: Check Bale login status
 *     tags: [Authentication]
 */
router.get('/bale/status/:loginId', async (req, res) => {
  try {
    const session = await authService.checkBaleSession(req.params.loginId);

    if (!session) {
      return res.json({
        success: true,
        data: { status: 'PENDING' }
      });
    }

    if (session.status === 'APPROVED') {
      return res.json({
        success: true,
        data: {
          status: 'APPROVED',
          token: session.token,
          user: session.user
        }
      });
    }

    return res.json({
      success: true,
      data: { status: session.status }
    });

  } catch (error) {
    res.status(500).json({
      error: {
        code: 'BALE_STATUS_FAILED',
        message: 'Failed to check login status'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/bale/callback:
 *   post:
 *     summary: Bale bot callback (internal)
 *     tags: [Authentication]
 */
router.post('/bale/callback', async (req, res) => {
  try {
    const { loginId, chatId, username, firstName } = req.body;

    const result = await authService.processBaleLogin({
      loginId,
      chatId,
      username,
      firstName
    });

    // result باید شامل token باشه
    res.json({
      success: true,
      data: {
        status: 'APPROVED',
        token: result.token,
        user: result.user
      }
    });

  } catch (error) {
    console.error('Bale callback error:', error);

    res.status(500).json({
      error: {
        code: 'BALE_CALLBACK_FAILED',
        message: 'Failed to process Bale login'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/disable-2fa:
 *   post:
 *     summary: Disable two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit 2FA token for verification
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Invalid 2FA token or 2FA not enabled
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/disable-2fa', authenticateToken, validate(Joi.object({
  token: Joi.string().length(6).pattern(/^[0-9]+$/).required()
})), async (req, res) => {
  try {
    await authService.disable2FA(req.user.userId, req.body.token);
    
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    
    if (error.message === '2FA_NOT_ENABLED') {
      return res.status(400).json({
        error: {
          code: '2FA_NOT_ENABLED',
          message: '2FA is not enabled for this account'
        }
      });
    }
    
    if (error.message === 'INVALID_2FA_TOKEN') {
      return res.status(400).json({
        error: {
          code: 'INVALID_2FA_TOKEN',
          message: 'Invalid 2FA token. Please try again.'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: '2FA_DISABLE_FAILED',
        message: 'Failed to disable 2FA'
      }
    });
  }
});


/**
 * شروع لاگین - فرانت این رو call می‌کنه
 */
router.post('/telegram/login', async (req, res) => {
  try {
    const crypto = require('crypto');
    const loginId = crypto.randomUUID();

    await authService.createTelegramSession(loginId);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    return res.json({
      success: true,
      data: {
        loginId,
        url: `https://t.me/${botUsername}?start=${loginId}`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: { code: 'TELEGRAM_LOGIN_FAILED', message: error.message }
    });
  }
});

/**
 * Polling از فرانت
 */
router.get('/telegram/status/:loginId', async (req, res) => {
  try {
    const session = await authService.checkTelegramSession(req.params.loginId);

    if (!session) {
      return res.json({ success: true, data: { status: 'PENDING' } });
    }

    if (session.status === 'APPROVED') {
      return res.json({
        success: true,
        data: { status: 'APPROVED', token: session.token, user: session.user }
      });
    }

    return res.json({ success: true, data: { status: session.status } });
  } catch (error) {
    res.status(500).json({
      error: { code: 'TELEGRAM_STATUS_FAILED', message: 'Failed to check login status' }
    });
  }
});

/**
 * Webhook اصلی - تلگرام به اینجا پیام می‌فرسته
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    // 🔒 verify secret token
    const secret = req.get('X-Telegram-Bot-Api-Secret-Token');
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.sendStatus(403);
    }

    const message = req.body?.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const from = message.from;

    // ===== حالت ۱: /start <loginId> =====
    if (message.text && message.text.startsWith('/start')) {
      const parts = message.text.trim().split(' ');
      const loginId = parts[1];

      if (!loginId) {
        await sendTelegramMessage(chatId, 'سلام! لطفاً از طریق سایت وارد شوید.', removeKeyboard());
        return res.sendStatus(200);
      }

      try {
        await authService.attachTelegramChat(loginId, chatId);

        await sendTelegramMessage(
          chatId,
          '👋 برای تکمیل ورود، لطفاً شماره تماس خود را با دکمه زیر ارسال کنید.',
          requestPhoneKeyboard()
        );
      } catch (err) {
        if (err.message === 'SESSION_EXPIRED' || err.message === 'SESSION_NOT_FOUND') {
          await sendTelegramMessage(chatId, '⏰ این لینک منقضی شده. لطفاً دوباره از سایت اقدام کنید.', removeKeyboard());
        } else {
          await sendTelegramMessage(chatId, '❌ خطایی رخ داد. دوباره تلاش کنید.', removeKeyboard());
        }
      }

      return res.sendStatus(200);
    }

    // ===== حالت ۲: ارسال contact (شماره تلفن) =====
    if (message.contact) {
      // 🔒 امنیتی: مطمئن شو contact متعلق به همون کاربری هست که پیام فرستاده
      if (message.contact.user_id && message.contact.user_id !== from.id) {
        await sendTelegramMessage(chatId, '❌ لطفاً شماره تماس خودتان را ارسال کنید، نه شخص دیگری را.', removeKeyboard());
        return res.sendStatus(200);
      }

      try {
        const result = await authService.processTelegramContact({
          chatId,
          telegramId: from.id,
          username: from.username,
          firstName: from.first_name,
          lastName: from.last_name,
          phone: message.contact.phone_number
        });

        await sendTelegramMessage(
          chatId,
          `✅ ${result.userName} عزیز، ورود با موفقیت انجام شد!\nبه سایت برگردید.`,
          removeKeyboard()
        );
      } catch (err) {
        console.error('processTelegramContact error:', err);

        if (err.message === 'NO_PENDING_LOGIN' || err.message === 'SESSION_EXPIRED') {
          await sendTelegramMessage(chatId, '⏰ زمان ورود منقضی شده. لطفاً دوباره از سایت شروع کنید.', removeKeyboard());
        } else if (err.message === 'ACCOUNT_DISABLED') {
          await sendTelegramMessage(chatId, '🚫 حساب شما غیرفعال شده است.', removeKeyboard());
        } else {
          await sendTelegramMessage(chatId, '❌ خطایی رخ داد. دوباره تلاش کنید.', removeKeyboard());
        }
      }

      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(200); // همیشه 200 به تلگرام
  }
});


module.exports = router;