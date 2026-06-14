/**
 * Production Environment Configuration
 * 
 * This module provides production-specific configuration settings
 * with enhanced security, performance optimizations, and monitoring.
 */

const path = require('path');

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    trustProxy: process.env.TRUST_PROXY === 'true',
    timeout: parseInt(process.env.SERVER_TIMEOUT) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000,
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT) || 6000
  },

  // Database Configuration
  database: {
    provider: process.env.DATABASE_PROVIDER || 'mysql',
    url: process.env.DATABASE_URL,
    connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT) || 10,
    timeout: parseInt(process.env.DATABASE_TIMEOUT) || 60000,
    retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY) || 1000,
    ssl: process.env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false
  },

  // Security Configuration
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      issuer: process.env.JWT_ISSUER || 'ecommerce-platform',
      audience: process.env.JWT_AUDIENCE || 'ecommerce-users'
    },
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 14
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    cors: {
      origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : false,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // SSL Configuration
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    cert: process.env.SSL_CERT_PATH,
    key: process.env.SSL_KEY_PATH,
    ca: process.env.SSL_CA_PATH,
    passphrase: process.env.SSL_PASSPHRASE
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'error',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || '/var/log/ecommerce/app.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
      datePattern: process.env.LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD'
    },
    database: {
      enabled: process.env.LOG_DATABASE_ENABLED !== 'false',
      batchSize: parseInt(process.env.LOG_DATABASE_BATCH_SIZE) || 100,
      flushInterval: parseInt(process.env.LOG_DATABASE_FLUSH_INTERVAL) || 5000
    }
  },

  // Cache Configuration
  cache: {
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ecommerce:',
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
      lazyConnect: true,
      keepAlive: 30000
    },
    ttl: {
      products: parseInt(process.env.CACHE_TTL_PRODUCTS) || 300, // 5 minutes
      categories: parseInt(process.env.CACHE_TTL_CATEGORIES) || 600, // 10 minutes
      users: parseInt(process.env.CACHE_TTL_USERS) || 180, // 3 minutes
      orders: parseInt(process.env.CACHE_TTL_ORDERS) || 60 // 1 minute
    }
  },

  // Payment Gateway Configuration
  payments: {
    zarinpal: {
      merchantId: process.env.ZARINPAL_MERCHANT_ID,
      sandbox: process.env.ZARINPAL_SANDBOX === 'true',
      callbackUrl: `${process.env.FRONTEND_URL}/payment/callback/zarinpal`
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16'
    },
    payir: {
      apiKey: process.env.PAYIR_API_KEY,
      sandbox: process.env.PAYIR_SANDBOX === 'true',
      callbackUrl: `${process.env.FRONTEND_URL}/payment/callback/payir`
    }
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true,
      maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS) || 5,
      maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES) || 100,
      rateDelta: parseInt(process.env.SMTP_RATE_DELTA) || 1000,
      rateLimit: parseInt(process.env.SMTP_RATE_LIMIT) || 5
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'E-commerce Platform',
      address: process.env.EMAIL_FROM_ADDRESS
    },
    templates: {
      path: path.join(__dirname, '../templates/email'),
      cache: true
    }
  },

  // SMS Configuration
  sms: {
    kavenegar: {
      apiKey: process.env.KAVENEGAR_API_KEY,
      sender: process.env.SMS_SENDER_NUMBER,
      template: {
        orderConfirmation: process.env.SMS_TEMPLATE_ORDER_CONFIRMATION,
        orderStatus: process.env.SMS_TEMPLATE_ORDER_STATUS,
        verification: process.env.SMS_TEMPLATE_VERIFICATION
      }
    }
  },

  // File Upload Configuration
  upload: {
    cloudinary: {
      enabled: process.env.CLOUDINARY_ENABLED !== 'false',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      folder: process.env.CLOUDINARY_FOLDER || 'ecommerce'
    },
    local: {
      enabled: process.env.LOCAL_UPLOAD_ENABLED === 'true',
      path: process.env.LOCAL_UPLOAD_PATH || './uploads',
      maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880, // 5MB
      allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp').split(',')
    }
  },

  // Monitoring Configuration
  monitoring: {
    sentry: {
      enabled: process.env.SENTRY_ENABLED === 'true',
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      path: process.env.HEALTH_CHECK_PATH || '/health',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      path: process.env.METRICS_PATH || '/metrics',
      collectDefaultMetrics: process.env.METRICS_COLLECT_DEFAULT !== 'false'
    }
  },

  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    s3: {
      enabled: process.env.BACKUP_S3_ENABLED === 'true',
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    local: {
      enabled: process.env.BACKUP_LOCAL_ENABLED !== 'false',
      path: process.env.BACKUP_LOCAL_PATH || './backups'
    }
  },

  // API Documentation
  swagger: {
    enabled: process.env.ENABLE_SWAGGER === 'true',
    path: process.env.SWAGGER_PATH || '/api-docs',
    title: process.env.SWAGGER_TITLE || 'E-commerce Platform API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    description: process.env.SWAGGER_DESCRIPTION || 'Comprehensive e-commerce platform API'
  },

  // Performance Configuration
  performance: {
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
    },
    clustering: {
      enabled: process.env.CLUSTERING_ENABLED === 'true',
      workers: parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length
    }
  },

  // Feature Flags
  features: {
    twoFactorAuth: process.env.FEATURE_2FA_ENABLED !== 'false',
    loyaltyPoints: process.env.FEATURE_LOYALTY_ENABLED !== 'false',
    reviews: process.env.FEATURE_REVIEWS_ENABLED !== 'false',
    wishlist: process.env.FEATURE_WISHLIST_ENABLED !== 'false',
    notifications: process.env.FEATURE_NOTIFICATIONS_ENABLED !== 'false',
    analytics: process.env.FEATURE_ANALYTICS_ENABLED === 'true'
  }
};