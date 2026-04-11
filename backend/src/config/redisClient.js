const logger = require("../utils/logger");

const REDIS_URL = process.env.REDIS_URL;

let redisClient = null;
let redisAvailable = false;

if (REDIS_URL) {
  let Redis;
  try {
    Redis = require("ioredis");
  } catch {
    logger.warn("[Redis] ioredis not installed — running without Redis");
  }

  if (!Redis) {
    // skip
  } else {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 10) {
        logger.error("[Redis] Max reconnect attempts reached, giving up");
        return null;
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ["READONLY", "ECONNRESET"];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  redisClient.on("connect", () => {
    logger.info("[Redis] Connected");
  });

  redisClient.on("ready", () => {
    redisAvailable = true;
    logger.info("[Redis] Ready to accept commands");
  });

  redisClient.on("error", (err) => {
    redisAvailable = false;
    logger.error(`[Redis] Error: ${err.message}`);
  });

  redisClient.on("close", () => {
    redisAvailable = false;
    logger.warn("[Redis] Connection closed");
  });
  }
} else {
  logger.info("[Redis] REDIS_URL not set — running without Redis");
}

const isRedisAvailable = () => redisAvailable && redisClient !== null;

module.exports = { redisClient, isRedisAvailable };
