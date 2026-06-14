/**
 * Logger utility for the e-commerce platform
 * Provides structured logging with different levels
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(module = 'APP') {
    this.module = module;
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
  }

  /**
   * Format log message with timestamp and module
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Write log to file
   */
  writeToFile(level, formattedMessage) {
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    const logLine = formattedMessage + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const currentLevel = LOG_LEVELS[this.logLevel] || LOG_LEVELS.INFO;
    const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    return messageLevel <= currentLevel;
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    if (!this.shouldLog('ERROR')) return;

    const formattedMessage = this.formatMessage('ERROR', message, meta);
    console.error(`🔴 ${formattedMessage}`);
    this.writeToFile('ERROR', formattedMessage);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    if (!this.shouldLog('WARN')) return;

    const formattedMessage = this.formatMessage('WARN', message, meta);
    console.warn(`🟡 ${formattedMessage}`);
    this.writeToFile('WARN', formattedMessage);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    if (!this.shouldLog('INFO')) return;

    const formattedMessage = this.formatMessage('INFO', message, meta);
    console.log(`🔵 ${formattedMessage}`);
    this.writeToFile('INFO', formattedMessage);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    if (!this.shouldLog('DEBUG')) return;

    const formattedMessage = this.formatMessage('DEBUG', message, meta);
    console.log(`🟢 ${formattedMessage}`);
    this.writeToFile('DEBUG', formattedMessage);
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    };

    this.info('HTTP Request', meta);
  }

  /**
   * Log payment transaction
   */
  logPayment(action, paymentData, meta = {}) {
    const logData = {
      action,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      gateway: paymentData.gateway,
      status: paymentData.status,
      ...meta
    };

    this.info('Payment Transaction', logData);
  }

  /**
   * Log user activity
   */
  logActivity(userId, action, details = {}) {
    const meta = {
      userId,
      action,
      ...details
    };

    this.info('User Activity', meta);
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export logger class and default instance
module.exports = {
  Logger,
  logger: defaultLogger,
  createLogger: (module) => new Logger(module)
};