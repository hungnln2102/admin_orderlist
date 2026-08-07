/**
 * Unit tests cho utils/orderHelpers.js
 *
 * Test pure functions:
 *   monthsFromString, daysFromMonths, roundGiaBanValue, convertDMYToYMD,
 *   calculatePeriods, isMavnImportOrder, isGiftOrder, isDashboardSalesOrder,
 *   isMavrykShopSupplierName, isMavrykSupplierStrictForNccLog
 *
 * Lưu ý: getOrderPrefixes() cần async + DB → test ở integration.
 * Ở đây chỉ test logic dựa trên hardcode ORDER_PREFIXES.
 */

jest.mock("@/services/pricing/tierCache", () => ({
  getPrefixMap: jest.fn().mockRejectedValue(new Error("mock")),
}));

const {
  monthsFromString,
  daysFromMonths,
  roundGiaBanValue,
  convertDMYToYMD,
  calculatePeriods,
  isMavnImportOrder,
  isGiftOrder,
  isDashboardSalesOrder,
  isMavrykShopSupplierName,
  isMavrykSupplierStrictForNccLog,
} = require("@/utils/orderHelpers");

// ═══════════════════════════════════════════════════════════
// monthsFromString
// ═══════════════════════════════════════════════════════════
describe("monthsFromString", () => {
  it("trích xuất số tháng từ pattern --Xm", () => {
    expect(monthsFromString("Adobe CC --12m")).toBe(12);
    expect(monthsFromString("Product --6m")).toBe(6);
    expect(monthsFromString("--1m")).toBe(1);
  });

  it("trả 0 khi không có pattern", () => {
    expect(monthsFromString("no match")).toBe(0);
    expect(monthsFromString("12 months")).toBe(0);
  });

  it.each([null, undefined, "", 123])("trả 0 khi input là %s", (val) => {
    expect(monthsFromString(val)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// daysFromMonths
// ═══════════════════════════════════════════════════════════
describe("daysFromMonths", () => {
  it("12 tháng → 365 ngày", () => {
    expect(daysFromMonths(12)).toBe(365);
  });

  it("24 tháng → 730 ngày", () => {
    expect(daysFromMonths(24)).toBe(730);
  });

  it("số tháng khác → tháng × 30", () => {
    expect(daysFromMonths(6)).toBe(180);
    expect(daysFromMonths(1)).toBe(30);
    expect(daysFromMonths(3)).toBe(90);
  });

  it("0 → 0", () => {
    expect(daysFromMonths(0)).toBe(0);
  });

  it("số âm → 0", () => {
    expect(daysFromMonths(-1)).toBe(0);
  });

  it("NaN / Infinity → 0", () => {
    expect(daysFromMonths(NaN)).toBe(0);
    expect(daysFromMonths(Infinity)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// roundGiaBanValue
// ═══════════════════════════════════════════════════════════
describe("roundGiaBanValue", () => {
  it("làm tròn số dương: 0.5 → lên", () => {
    expect(roundGiaBanValue(100.5)).toBe(101);
    expect(roundGiaBanValue(100.4)).toBe(100);
    expect(roundGiaBanValue(100.6)).toBe(101);
  });

  it("làm tròn số âm (symmetric)", () => {
    expect(roundGiaBanValue(-100.5)).toBe(-101);
    expect(roundGiaBanValue(-100.4)).toBe(-100);
  });

  it("0 → 0", () => {
    expect(roundGiaBanValue(0)).toBe(0);
  });

  it("string number → chuyển rồi làm tròn", () => {
    expect(roundGiaBanValue("250000.7")).toBe(250001);
  });

  it("non-number → 0", () => {
    expect(roundGiaBanValue("abc")).toBe(0);
    expect(roundGiaBanValue(null)).toBe(0);
    expect(roundGiaBanValue(undefined)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// convertDMYToYMD
// ═══════════════════════════════════════════════════════════
describe("convertDMYToYMD", () => {
  it("chuyển DD/MM/YYYY → YYYY-MM-DD", () => {
    expect(convertDMYToYMD("15/08/2024")).toBe("2024-08-15");
    expect(convertDMYToYMD("01/01/2000")).toBe("2000-01-01");
  });

  it("trả nguyên khi không có /", () => {
    expect(convertDMYToYMD("2024-08-15")).toBe("2024-08-15");
  });

  it.each([null, undefined, "", "short"])("trả nguyên khi input là %s", (val) => {
    expect(convertDMYToYMD(val)).toBe(val);
  });

  it("trả nguyên khi chuỗi < 10 ký tự", () => {
    expect(convertDMYToYMD("15/08/24")).toBe("15/08/24");
  });
});

// ═══════════════════════════════════════════════════════════
// calculatePeriods
// ═══════════════════════════════════════════════════════════
describe("calculatePeriods", () => {
  afterEach(() => {
    delete process.env.MOCK_DATE;
    delete process.env.APP_TIMEZONE;
  });

  it("trả object với 4 trường currentStart/End, previousStart/End", () => {
    const result = calculatePeriods();
    expect(result).toHaveProperty("currentStart");
    expect(result).toHaveProperty("currentEnd");
    expect(result).toHaveProperty("previousStart");
    expect(result).toHaveProperty("previousEnd");
  });

  it("tất cả trường đều có format YYYY-MM-DD", () => {
    const result = calculatePeriods();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(result.currentStart).toMatch(dateRegex);
    expect(result.currentEnd).toMatch(dateRegex);
    expect(result.previousStart).toMatch(dateRegex);
    expect(result.previousEnd).toMatch(dateRegex);
  });

  it("currentStart luôn là ngày 1 của tháng hiện tại", () => {
    const result = calculatePeriods();
    expect(result.currentStart).toMatch(/-01$/);
  });

  it("previousStart luôn là ngày 1 của tháng trước", () => {
    const result = calculatePeriods();
    expect(result.previousStart).toMatch(/-01$/);
  });

  it("hỗ trợ MOCK_DATE env", () => {
    process.env.MOCK_DATE = "2024-03-15T10:00:00Z";
    const result = calculatePeriods();
    expect(result.currentStart).toBe("2024-03-01");
    expect(result.currentEnd).toBe("2024-03-15");
    expect(result.previousStart).toBe("2024-02-01");
  });
});

// ═══════════════════════════════════════════════════════════
// isMavnImportOrder
// ═══════════════════════════════════════════════════════════
describe("isMavnImportOrder", () => {
  it("MAVN prefix → true", () => {
    expect(isMavnImportOrder({ id_order: "MAVN12345" })).toBe(true);
    expect(isMavnImportOrder({ idOrder: "MAVN12345" })).toBe(true);
  });

  it("MAVC / MAVL prefix → false", () => {
    expect(isMavnImportOrder({ id_order: "MAVC12345" })).toBe(false);
    expect(isMavnImportOrder({ id_order: "MAVL12345" })).toBe(false);
  });

  it("case insensitive", () => {
    expect(isMavnImportOrder({ id_order: "mavn12345" })).toBe(true);
  });

  it("null / undefined row → false", () => {
    expect(isMavnImportOrder(null)).toBe(false);
    expect(isMavnImportOrder(undefined)).toBe(false);
    expect(isMavnImportOrder({})).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// isGiftOrder
// ═══════════════════════════════════════════════════════════
describe("isGiftOrder", () => {
  it("MAVT prefix → true", () => {
    expect(isGiftOrder({ id_order: "MAVT12345" })).toBe(true);
  });

  it("MAVC / MAVN prefix → false", () => {
    expect(isGiftOrder({ id_order: "MAVC12345" })).toBe(false);
    expect(isGiftOrder({ id_order: "MAVN12345" })).toBe(false);
  });

  it("null row → false", () => {
    expect(isGiftOrder(null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// isDashboardSalesOrder
// ═══════════════════════════════════════════════════════════
describe("isDashboardSalesOrder", () => {
  it.each(["MAVC", "MAVL", "MAVK", "MAVS"])(
    "prefix %s → true (đơn tính doanh thu)",
    (prefix) => {
      expect(isDashboardSalesOrder({ id_order: `${prefix}12345` })).toBe(true);
    }
  );

  it.each(["MAVT", "MAVN"])(
    "prefix %s → false (đơn quà tặng / nhập hàng)",
    (prefix) => {
      expect(isDashboardSalesOrder({ id_order: `${prefix}12345` })).toBe(false);
    }
  );

  it("null / rỗng → false", () => {
    expect(isDashboardSalesOrder(null)).toBe(false);
    expect(isDashboardSalesOrder({})).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// isMavrykShopSupplierName
// ═══════════════════════════════════════════════════════════
describe("isMavrykShopSupplierName", () => {
  it.each(["mavryk", "Mavryk", "MAVRYK", "  Mavryk  "])(
    '"%s" → true',
    (name) => {
      expect(isMavrykShopSupplierName(name)).toBe(true);
    }
  );

  it.each(["shop", "Shop", "SHOP", "  Shop  "])(
    '"%s" → true (Shop cũng là internal)',
    (name) => {
      expect(isMavrykShopSupplierName(name)).toBe(true);
    }
  );

  it.each(["abc", "", null, undefined])('"%s" → false', (name) => {
    expect(isMavrykShopSupplierName(name)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// isMavrykSupplierStrictForNccLog
// ═══════════════════════════════════════════════════════════
describe("isMavrykSupplierStrictForNccLog", () => {
  it('"mavryk" → true (strict match)', () => {
    expect(isMavrykSupplierStrictForNccLog("mavryk")).toBe(true);
    expect(isMavrykSupplierStrictForNccLog("  MAVRYK  ")).toBe(true);
  });

  it('"Shop" → false (khác với isMavrykShopSupplierName)', () => {
    expect(isMavrykSupplierStrictForNccLog("Shop")).toBe(false);
    expect(isMavrykSupplierStrictForNccLog("shop")).toBe(false);
  });

  it.each(["abc", "", null, undefined])('"%s" → false', (name) => {
    expect(isMavrykSupplierStrictForNccLog(name)).toBe(false);
  });
});
