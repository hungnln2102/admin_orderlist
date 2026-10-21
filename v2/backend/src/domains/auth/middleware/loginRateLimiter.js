const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_FAILED_ATTEMPTS_PER_IP = 20;
const MAX_FAILED_ATTEMPTS_PER_USER = 20;

const getLimitForKey = (key) => {
  if (key.startsWith("ip:")) return MAX_FAILED_ATTEMPTS_PER_IP;
  if (key.includes("|ip:")) return MAX_FAILED_ATTEMPTS;
  return MAX_FAILED_ATTEMPTS_PER_USER;
};

const failedAttempts = new Map();

const getKeys = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const username = String(req.body?.username || "").trim().toLowerCase();
  return [`ip:${ip}`, `user:${username}|ip:${ip}`, `user:${username}`].filter((key) => !key.endsWith("user:"));
};

const getActiveEntry = (key, now) => {
  const entry = failedAttempts.get(key);
  if (!entry) return null;
  if (now - entry.firstAt > WINDOW_MS) {
    failedAttempts.delete(key);
    return null;
  }
  return entry;
};

const getRetryAfterSeconds = (req, now = Date.now()) => {
  let retryAfterMs = 0;
  for (const key of getKeys(req)) {
    const entry = getActiveEntry(key, now);
    if (entry && entry.count >= getLimitForKey(key)) {
      retryAfterMs = Math.max(retryAfterMs, WINDOW_MS - (now - entry.firstAt));
    }
  }
  return Math.ceil(retryAfterMs / 1000);
};

const recordFailedLogin = (req, now = Date.now()) => {
  for (const key of getKeys(req)) {
    const entry = getActiveEntry(key, now);
    if (entry) entry.count += 1;
    else failedAttempts.set(key, { count: 1, firstAt: now });
  }
};

const resetFailedLogins = (req) => {
  for (const key of getKeys(req)) {
    if (!key.startsWith("ip:")) failedAttempts.delete(key);
  }
};

function loginRateLimiter(req, res, next) {
  const retryAfterSeconds = getRetryAfterSeconds(req);
  if (retryAfterSeconds > 0) {
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(retryAfterSeconds / 60)} phút.`,
    });
  }
  return next();
}

const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failedAttempts) {
    if (now - entry.firstAt > WINDOW_MS) failedAttempts.delete(key);
  }
}, WINDOW_MS);
pruneTimer.unref();

module.exports = {
  MAX_FAILED_ATTEMPTS,
  WINDOW_MS,
  loginRateLimiter,
  recordFailedLogin,
  resetFailedLogins,
  getRetryAfterSeconds,
};
