const {
  buildDailyRevenueSummaryBackfillQuery,
} = require("@/services/dashboard/dailyRevenueSummaryBackfill/queryRepository");

describe("dailyRevenueSummaryBackfill queryRepository", () => {
  test("builds SQL and bindings for backfill", () => {
    const query = buildDailyRevenueSummaryBackfillQuery({
      from: "2026-05-01",
      to: "2026-05-31",
      taxFrom: "2026-04-22",
      importSpreadDays: 30,
    });

    expect(query.sql).toContain("INSERT INTO");
    expect(query.sql).toContain("daily_revenue_summary");
    expect(query.sql).toContain("daily_earned");
    expect(query.sql).toContain("daily_refund");
    expect(query.bindings.slice(0, 4)).toEqual([
      "2026-05-01",
      "2026-05-31",
      "2026-04-22",
      30,
    ]);
    expect(query.bindings.length).toBeGreaterThan(4);
  });
});
