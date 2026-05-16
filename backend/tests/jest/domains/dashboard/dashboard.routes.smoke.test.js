const express = require("express");
const request = require("supertest");

describe("dashboard routes smoke", () => {
  const buildApp = () => {
    jest.resetModules();

    const useCases = {
      fetchDashboardStats: jest.fn().mockResolvedValue({ ok: true }),
      fetchDashboardStatsForDateRange: jest.fn().mockResolvedValue({ range: true }),
      fetchDashboardYears: jest.fn().mockResolvedValue([2026, 2025]),
      fetchDashboardMonthlySummary: jest.fn().mockResolvedValue([]),
      fetchDashboardChartsFromSummary: jest.fn().mockResolvedValue({ months: [] }),
      fetchDashboardChartsForDateRange: jest.fn().mockResolvedValue({ months: [] }),
    };

    jest.doMock(
      "../../../../src/domains/dashboard/use-cases/dashboardMetricsUseCases",
      () => useCases
    );
    jest.doMock("../../../../src/utils/logger", () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const router = require("../../../../src/domains/dashboard/routes");
    const app = express();
    app.use(express.json());
    app.use("/", router);
    return { app, useCases };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns stats payload on GET /stats", async () => {
    const { app, useCases } = buildApp();
    const response = await request(app).get("/stats");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(useCases.fetchDashboardStats).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when from > to", async () => {
    const { app } = buildApp();
    const response = await request(app).get("/stats?from=2026-05-20&to=2026-05-10");
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: "Tham số from phải nhỏ hơn hoặc bằng to.",
      })
    );
  });

  it("returns years payload on GET /years", async () => {
    const { app, useCases } = buildApp();
    const response = await request(app).get("/years");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ years: [2026, 2025] });
    expect(useCases.fetchDashboardYears).toHaveBeenCalledTimes(1);
  });
});
