/**
 * Centralized logging utility using Winston
 * Replaces console.log/error throughout the application
 */

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for console output
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Safe JSON.stringify — bỏ qua circular refs để các log meta chứa Knex Raw,
 * Promise, EventEmitter… không làm crash printf formatter của Winston.
 */
function safeStringify(obj) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      if (typeof value === "function") return "[Function]";
      if (typeof value === "bigint") return value.toString();
      return value;
    });
  } catch (err) {
    return `[Unserializable: ${err?.message || "unknown"}]`;
  }
}

// Console format (more readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = "";
    if (Object.keys(meta).length > 0 && meta.stack === undefined) {
      metaStr = ` ${safeStringify(meta)}`;
    }
    if (meta.stack) {
      metaStr = `\n${meta.stack}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// Create transports
const transports = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel,
  }),
];

// File transports (only in production or if LOG_FILE is set)
if (process.env.NODE_ENV === "production" || process.env.LOG_FILE) {
  const maxSize = process.env.LOG_MAX_SIZE || "10m";
  const maxFiles = process.env.LOG_MAX_FILES || "5";

  // Daily rotate file for all logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize,
      maxFiles,
      format: logFormat,
      level: logLevel,
    })
  );

  // Separate file for errors
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize,
      maxFiles,
      format: logFormat,
      level: "error",
    })
  );
}


// Database transport for system logs (best-effort, skip if migration has not run yet)
try {
  const { pool } = require("@/config/database");
  const { SCHEMA_RENEW_ADOBE, RENEW_ADOBE_SCHEMA } = require("@/config/dbSchema");
  const eventLogDef = RENEW_ADOBE_SCHEMA.SYSTEM_EVENT_LOGS;
  const eventLogCols = eventLogDef.COLS;
  const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const eventLogTable = `${quoteIdent(SCHEMA_RENEW_ADOBE)}.${quoteIdent(eventLogDef.TABLE)}`;

  const DbSystemLogTransport = class extends winston.Transport {
    log(info, callback) {
      setImmediate(() => {
        const { level, message, timestamp, ...meta } = info || {};
        const metadata = { ...meta };
        if (timestamp) metadata.timestamp = timestamp;
        const values = [
          "system",
          String(level || "info").toLowerCase(),
          String(message || "System log"),
          metadata.source || "backend",
          JSON.stringify(metadata),
        ];
        const sql = `
          INSERT INTO ${eventLogTable} (
            ${eventLogCols.LOG_TYPE}, ${eventLogCols.LEVEL}, ${eventLogCols.MESSAGE},
            ${eventLogCols.SOURCE}, ${eventLogCols.METADATA}
          ) VALUES ($1, $2, $3, $4, $5::jsonb)
        `;
        pool.query(sql, values).catch((error) => {
          if (error?.code !== "42P01") {
            // Avoid recursive logger calls from inside logger transport.
            if (process.env.NODE_ENV !== "production") {
              console.warn("[DbSystemLogTransport] write failed:", error.message);
            }
          }
        });
      });
      callback();
    }
  };

  if (process.env.NODE_ENV !== "test" && process.env.DB_SYSTEM_LOGS_DISABLED !== "1") {
    transports.push(new DbSystemLogTransport({ level: logLevel }));
  }
} catch (err) {
  console.warn("[Logger] Could not load DB system log transport:", err.message);
}

// Telegram notification transport (error + warn)
try {
  const { notifyError, notifyWarn } = require("@/domains/notifications/telegram").systemNotifier;
  const splatKey = Symbol.for("splat");

  /**
   * Bỏ qua các log thuộc nhánh gửi Telegram nội bộ — nếu forward lại lên Telegram,
   * khi chính API Telegram timeout/đứng sẽ tạo vòng lặp + spam (warn + error + retry log
   * cho cùng 1 lần fail, mỗi lần lại push 1 message).
   */
  const SUPPRESS_FORWARD_PATTERNS = [
    /\[ErrorNotifier\]/i,
    /\[Order\]\[Telegram\]/i,
    /\[Renewal\]\[Telegram\]/i,
    /\[Telegram\]\[/i,
    /\[TelegramClient\]/i,
    /sendRenewalNotification/i,
    /TelegramFinanceDeltaNotifier/i,
  ];

  const shouldSuppressForward = (info) => {
    const msg = String(info?.message || "");
    if (!msg) return false;
    return SUPPRESS_FORWARD_PATTERNS.some((re) => re.test(msg));
  };

  const extractPayload = (info) => {
    const splatItems = Array.isArray(info[splatKey]) ? info[splatKey] : [];
    const splat = splatItems.find((item) => item && typeof item === "object") || {};
    const status = info.status ?? info.statusCode ?? splat.status;
    const body = info.body ?? splat.body;
    const contextKeys = [
      "email",
      "account",
      "username",
      "userId",
      "orderId",
      "orderCode",
      "paymentId",
      "supplyId",
    ];
    const extraParts = [];
    for (const key of contextKeys) {
      const value = info[key] ?? splat[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        extraParts.push(`${key}=${String(value).trim()}`);
      }
    }
    if (status != null) extraParts.push(`HTTP ${status}`);
    if (body != null && String(body).trim()) {
      const b = String(body).replace(/\s+/g, " ").trim();
      extraParts.push(b.length > 320 ? `${b.slice(0, 320)}…` : b);
    }
    if (!extraParts.length && splat.error) extraParts.push(String(splat.error));
    return {
      message: info.message,
      source: "backend",
      url: info.url || splat.url,
      method: info.method || splat.method,
      stack: info.stack || splat.stack,
      extra: extraParts.length ? extraParts.join(" — ") : undefined,
    };
  };

  const TelegramErrorTransport = class extends winston.Transport {
    log(info, callback) {
      setImmediate(() => {
        if (shouldSuppressForward(info)) return;
        notifyError(extractPayload(info));
      });
      callback();
    }
  };

  const TelegramWarnTransport = class extends winston.Transport {
    log(info, callback) {
      setImmediate(() => {
        if (shouldSuppressForward(info)) return;
        notifyWarn(extractPayload(info));
      });
      callback();
    }
  };

  transports.push(new TelegramErrorTransport({ level: "error" }));
  transports.push(new TelegramWarnTransport({ level: "warn" }));
} catch (err) {
  console.warn("[Logger] Could not load Telegram error notifier:", err.message);
}

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: logLevel,
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Create a child logger with default context
 * @param {Object} defaultContext - Default context to include in all logs
 * @returns {Object} Child logger instance
 */
logger.child = (defaultContext = {}) => {
  return {
    error: (message, context = {}) => logger.error(message, { ...defaultContext, ...context }),
    warn: (message, context = {}) => logger.warn(message, { ...defaultContext, ...context }),
    info: (message, context = {}) => logger.info(message, { ...defaultContext, ...context }),
    http: (message, context = {}) => logger.http(message, { ...defaultContext, ...context }),
    debug: (message, context = {}) => logger.debug(message, { ...defaultContext, ...context }),
  };
};

module.exports = logger;
