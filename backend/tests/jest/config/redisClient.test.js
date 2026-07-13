describe("redisClient production session store hardening", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    jest.mock("../../../src/utils/logger", () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));
  });

  it("does not require persistent session store outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_ENABLED;

    const {
      assertProductionSessionStoreGuard,
      getSessionStoreGuardState,
    } = require("../../../src/config/redisClient");

    expect(() => assertProductionSessionStoreGuard()).not.toThrow();
    expect(getSessionStoreGuardState()).toMatchObject({
      production: false,
      persistentSessionStoreRequired: false,
      redisClientInitialized: false,
    });
  });

  it("fails fast in production when redis is disabled/unconfigured", () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_ENABLED = "false";
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;

    const { assertProductionSessionStoreGuard } = require("../../../src/config/redisClient");

    expect(() => assertProductionSessionStoreGuard()).toThrow(
      /Production requires persistent Redis session store/
    );
    expect(() => assertProductionSessionStoreGuard()).toThrow(/REDIS_ENABLED=false/);
  });

  it("passes guard in production when redis client is initialized", () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_ENABLED = "true";
    process.env.REDIS_URL = "redis://127.0.0.1:6379";

    jest.doMock("ioredis", () =>
      class RedisMock {
        on() {
          return this;
        }
      }
    );

    const {
      assertProductionSessionStoreGuard,
      getSessionStoreGuardState,
    } = require("../../../src/config/redisClient");

    const state = assertProductionSessionStoreGuard();

    expect(state.persistentSessionStoreRequired).toBe(true);
    expect(state.redisConfigured).toBe(true);
    expect(state.redisClientInitialized).toBe(true);
    expect(getSessionStoreGuardState().redisTarget).toBe("redis://127.0.0.1:6379");
  });
});
