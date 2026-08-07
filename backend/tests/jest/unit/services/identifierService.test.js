/**
 * Unit tests cho services/identifierService.js (phần pure function)
 *
 * Test:
 *   generateOrderCode     — tạo mã đơn với prefix + suffix random
 *   generateTransactionCode — tạo mã giao dịch 8 ký tự
 *   normalizeTransactionCode — chuẩn hóa mã giao dịch
 *
 * Các function cần DB (nextId, generateUniqueOrderCode, ...) → integration test.
 */

jest.mock("@/db", () => ({ db: {} }));
jest.mock("@/config/dbSchema", () => ({
  tableName: jest.fn((t) => t),
  getDefinition: jest.fn(() => ({ tableName: "mock", columns: { id: "id" } })),
  PARTNER_SCHEMA: { SUPPLIER: { TABLE: "supplier" }, SUPPLIER_COST: { TABLE: "supplier_cost" } },
  PRODUCT_SCHEMA: {},
  SCHEMA_PRODUCT: "product",
  SCHEMA_SUPPLIER: "partner",
  SCHEMA_SUPPLIER_COST: "partner",
  ORDERS_SCHEMA: { ORDER_LIST: { TABLE: "order_list", COLS: { TRANSACTION: "transaction_code" } } },
  SCHEMA_ORDERS: "public",
}));
jest.mock("@/domains/orders/controller/constants", () => ({
  TABLES: { orderList: "order_list" },
  COLS: { ORDER: { ID_ORDER: "id_order" } },
}));
jest.mock("@/utils/logger", () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const {
  generateOrderCode,
  generateTransactionCode,
  normalizeTransactionCode,
  VALID_PREFIXES,
  TRANSACTION_CODE_LENGTH,
} = require("@/services/identifierService");

// ═══════════════════════════════════════════════════════════
// generateOrderCode
// ═══════════════════════════════════════════════════════════
describe("generateOrderCode", () => {
  it("trả mã bắt đầu bằng prefix truyền vào", () => {
    for (const prefix of VALID_PREFIXES) {
      const code = generateOrderCode(prefix);
      expect(code.startsWith(prefix)).toBe(true);
    }
  });

  it("suffix có đúng 5 ký tự", () => {
    const code = generateOrderCode("MAVC");
    const suffix = code.slice(4); // MAVC = 4 chars
    expect(suffix).toHaveLength(5);
  });

  it("mã chỉ chứa uppercase alphanumeric", () => {
    const code = generateOrderCode("MAVC");
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("prefix không hợp lệ → fallback MAVC", () => {
    const code = generateOrderCode("INVALID");
    expect(code.startsWith("MAVC")).toBe(true);
  });

  it("không truyền prefix → mặc định MAVC", () => {
    const code = generateOrderCode();
    expect(code.startsWith("MAVC")).toBe(true);
  });

  it("mỗi lần gọi tạo mã khác nhau (hầu hết)", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateOrderCode("MAVC"));
    }
    // Với 31^5 = ~28 triệu khả năng, 100 mã phải gần như đều khác nhau
    expect(codes.size).toBeGreaterThanOrEqual(95);
  });
});

// ═══════════════════════════════════════════════════════════
// generateTransactionCode
// ═══════════════════════════════════════════════════════════
describe("generateTransactionCode", () => {
  it(`trả mã có đúng ${TRANSACTION_CODE_LENGTH} ký tự`, () => {
    const code = generateTransactionCode();
    expect(code).toHaveLength(TRANSACTION_CODE_LENGTH);
  });

  it("mã chỉ chứa uppercase alphanumeric", () => {
    const code = generateTransactionCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("mỗi lần gọi tạo mã khác nhau (hầu hết)", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateTransactionCode());
    }
    expect(codes.size).toBeGreaterThanOrEqual(95);
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeTransactionCode
// ═══════════════════════════════════════════════════════════
describe("normalizeTransactionCode", () => {
  it("chuỗi hợp lệ → uppercase", () => {
    expect(normalizeTransactionCode("abcd1234")).toBe("ABCD1234");
  });

  it("trim whitespace", () => {
    expect(normalizeTransactionCode("  ABCD1234  ")).toBe("ABCD1234");
  });

  it('chuỗi sai độ dài → ""', () => {
    expect(normalizeTransactionCode("ABC")).toBe("");
    expect(normalizeTransactionCode("ABCDEFGHIJK")).toBe(""); // > 8
  });

  it('chuỗi có ký tự đặc biệt → ""', () => {
    expect(normalizeTransactionCode("ABCD-123")).toBe("");
  });

  it.each([null, undefined, ""])('input %s → ""', (val) => {
    expect(normalizeTransactionCode(val)).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════
// VALID_PREFIXES
// ═══════════════════════════════════════════════════════════
describe("VALID_PREFIXES", () => {
  it("bao gồm tất cả prefix chuẩn", () => {
    expect(VALID_PREFIXES).toContain("MAVC");
    expect(VALID_PREFIXES).toContain("MAVL");
    expect(VALID_PREFIXES).toContain("MAVK");
    expect(VALID_PREFIXES).toContain("MAVT");
    expect(VALID_PREFIXES).toContain("MAVN");
    expect(VALID_PREFIXES).toContain("MAVS");
  });

  it("có đúng 6 prefix", () => {
    expect(VALID_PREFIXES).toHaveLength(6);
  });
});
