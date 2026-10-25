const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;
const requests = new Map();

function getKey(req) {
  const userId = req.session?.user?.id || "unknown";
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `${userId}:${ip}`;
}

function sensitiveOperationRateLimiter(req, res, next) {
  const now = Date.now();
  const key = getKey(req);
  const entry = requests.get(key);
  const active = entry && now - entry.startedAt < WINDOW_MS ? entry : { count: 0, startedAt: now };
  active.count += 1;
  requests.set(key, active);

  if (active.count > MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - active.startedAt)) / 1000);
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ error: "Too many sensitive operations. Try again shortly." });
  }

  return next();
}

const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requests) {
    if (now - entry.startedAt >= WINDOW_MS) requests.delete(key);
  }
}, WINDOW_MS);
pruneTimer.unref();

module.exports = { sensitiveOperationRateLimiter };
