jest.mock("../../../src/config/loadEnv", () => ({
  loadBackendEnv: jest.fn(),
}));

describe("appConfig CORS origins", () => {
  const originalFrontendOrigins = process.env.FRONTEND_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();

    if (typeof originalNodeEnv === "string") {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (typeof originalFrontendOrigins === "string") {
      process.env.FRONTEND_ORIGINS = originalFrontendOrigins;
      return;
    }

    delete process.env.FRONTEND_ORIGINS;
  });

  it("normalizes configured origins and removes duplicates", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_ORIGINS = [
      "https://admin.mavrykpremium.com/",
      " https://www.mavrykpremium.com ",
      "https://www.mavrykpremium.com/",
      "https://mavrykpremium.com/path",
    ].join(",");

    const { allowedOrigins, normalizeOrigin } = require("../../../src/config/appConfig");

    expect(allowedOrigins).toEqual([
      "https://admin.mavrykpremium.com",
      "https://www.mavrykpremium.com",
      "https://mavrykpremium.com",
    ]);
    expect(normalizeOrigin("https://www.mavrykpremium.com/")).toBe(
      "https://www.mavrykpremium.com"
    );
  });

  it("in non-production, unions local storefront/admin dev origins for FRONTEND_ORIGINS", () => {
    jest.resetModules();
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_ORIGINS = "https://admin.example.test";

    const { allowedOrigins } = require("../../../src/config/appConfig");

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        "https://admin.example.test",
        "http://localhost:4001",
        "http://127.0.0.1:4001",
      ])
    );
  });
});
