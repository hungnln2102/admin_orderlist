jest.mock("../../../../src/db", () => ({
  db: jest.fn(),
}));

jest.mock("../../../../src/domains/renew-adobe/services/systemEventLogService", () => ({
  writeUserEventLog: jest.fn(),
}));

jest.mock("../../../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe("wallet daily balance rules", () => {
  it("keeps the latest previous value per wallet for omitted columns", () => {
    const { __private } = require("../../../../src/domains/wallet/controller");

    const latestByWallet = __private.buildLatestBalancesByWallet([
      { wallet_id: 1, amount: "1000", record_date: "2026-04-27" },
      { wallet_id: 2, amount: "2000", record_date: "2026-04-27" },
      { wallet_id: 1, amount: "900", record_date: "2026-04-19" },
      { wallet_id: 3, amount: null, record_date: "2026-04-19" },
    ]);

    expect(latestByWallet.get(1)).toBe(1000);
    expect(latestByWallet.get(2)).toBe(2000);
    expect(latestByWallet.get(3)).toBe(0);
  });
});