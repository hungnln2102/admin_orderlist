describe("appConfig CORS origins", () => {
  const originalFrontendOrigins = process.env.FRONTEND_ORIGINS;

  afterEach(() => {
    jest.resetModules();

    if (typeof originalFrontendOrigins === "string") {
      process.env.FRONTEND_ORIGINS = originalFrontendOrigins;
      return;
    }

    delete process.env.FRONTEND_ORIGINS;
  });

  it("normalizes configured origins and removes duplicates", () => {
    process.env.FRONTEND_ORIGINS = [
      "https://admin.mavrykpremium.store/",
      " https://www.mavrykpremium.store ",
      "https://www.mavrykpremium.store/",
      "https://mavrykpremium.store/path",
    ].join(",");

    const { allowedOrigins, normalizeOrigin } = require("../../config/appConfig");

    expect(allowedOrigins).toEqual([
      "https://admin.mavrykpremium.store",
      "https://www.mavrykpremium.store",
      "https://mavrykpremium.store",
    ]);
    expect(normalizeOrigin("https://www.mavrykpremium.store/")).toBe(
      "https://www.mavrykpremium.store"
    );
  });
});
