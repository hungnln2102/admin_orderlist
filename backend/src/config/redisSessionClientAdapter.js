function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * connect-redis@9 expects node-redis client API (set with options object,
 * scanIterator, mGet). This adapter translates those calls to ioredis API.
 */
function createConnectRedisClientAdapter(ioredisClient) {
  if (!ioredisClient) return null;

  return {
    async get(key) {
      return ioredisClient.get(key);
    },

    async set(key, value, options) {
      const ttl =
        options && typeof options === "object"
          ? toPositiveInt(options.expiration?.value, 0)
          : 0;
      if (ttl > 0) {
        return ioredisClient.set(key, value, "EX", ttl);
      }
      return ioredisClient.set(key, value);
    },

    async expire(key, seconds) {
      const ttl = toPositiveInt(seconds, 0);
      if (ttl <= 0) return 0;
      return ioredisClient.expire(key, ttl);
    },

    async del(keys) {
      if (Array.isArray(keys)) {
        if (keys.length === 0) return 0;
        return ioredisClient.del(...keys);
      }
      return ioredisClient.del(keys);
    },

    async mGet(keys) {
      if (!Array.isArray(keys) || keys.length === 0) return [];
      return ioredisClient.mget(...keys);
    },

    async *scanIterator({ MATCH, COUNT } = {}) {
      const pattern = String(MATCH || "*");
      const count = toPositiveInt(COUNT, 100);
      let cursor = "0";
      do {
        const [nextCursor, keys] = await ioredisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          count
        );
        cursor = String(nextCursor || "0");
        yield Array.isArray(keys) ? keys : [];
      } while (cursor !== "0");
    },
  };
}

module.exports = {
  createConnectRedisClientAdapter,
};
