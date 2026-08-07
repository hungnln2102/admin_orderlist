/**
 * Unit tests cho utils/normalizers.js
 *
 * Test tất cả 14+ pure functions:
 *   normalizeDateInput, toNullableNumber, normalizeTextInput, trimToLength,
 *   todayYMDInVietnam, ymdInVietnamFromInstant, formatDateOutput, formatYMDToDMY,
 *   normalizeCheckFlagValue, normalizeStatusKey, normalizeSupplyStatus,
 *   parseDbBoolean, fromDbNumber, getRowId, hasMeaningfulValue, hasAccountStoragePayload
 */

const {
  normalizeDateInput,
  toNullableNumber,
  normalizeTextInput,
  trimToLength,
  todayYMDInVietnam,
  ymdInVietnamFromInstant,
  formatDateOutput,
  formatYMDToDMY,
  normalizeCheckFlagValue,
  normalizeStatusKey,
  normalizeSupplyStatus,
  parseDbBoolean,
  fromDbNumber,
  getRowId,
  hasMeaningfulValue,
  hasAccountStoragePayload,
} = require("@/utils/normalizers");

// ═══════════════════════════════════════════════════════════
// normalizeDateInput
// ═══════════════════════════════════════════════════════════
describe("normalizeDateInput", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(normalizeDateInput(val)).toBeNull();
  });

  it("trả null khi chuỗi rỗng", () => {
    expect(normalizeDateInput("")).toBeNull();
    expect(normalizeDateInput("   ")).toBeNull();
  });

  it("giữ nguyên YYYY-MM-DD", () => {
    expect(normalizeDateInput("2024-08-15")).toBe("2024-08-15");
  });

  it("giữ chỉ phần date khi YYYY-MM-DD có thêm thời gian", () => {
    expect(normalizeDateInput("2024-08-15T10:30:00")).toBe("2024-08-15");
  });

  it("chuyển YYYY/MM/DD → YYYY-MM-DD", () => {
    expect(normalizeDateInput("2024/08/15")).toBe("2024-08-15");
  });

  it("chuyển DD/MM/YYYY → YYYY-MM-DD", () => {
    expect(normalizeDateInput("15/08/2024")).toBe("2024-08-15");
  });

  it("chuyển DD-MM-YYYY → YYYY-MM-DD", () => {
    expect(normalizeDateInput("15-08-2024")).toBe("2024-08-15");
  });

  it("chuyển YYYYMMDD (compact) → YYYY-MM-DD", () => {
    expect(normalizeDateInput("20240815")).toBe("2024-08-15");
  });

  it("trả trimmed string khi không khớp pattern nào", () => {
    expect(normalizeDateInput("  random text  ")).toBe("random text");
  });
});

// ═══════════════════════════════════════════════════════════
// toNullableNumber
// ═══════════════════════════════════════════════════════════
describe("toNullableNumber", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(toNullableNumber(val)).toBeNull();
  });

  it("chuyển string số → number", () => {
    expect(toNullableNumber("123")).toBe(123);
    expect(toNullableNumber("0")).toBe(0);
    expect(toNullableNumber("-50.5")).toBe(-50.5);
  });

  it("trả null khi không phải số hợp lệ", () => {
    expect(toNullableNumber("abc")).toBeNull();
    expect(toNullableNumber(Infinity)).toBeNull();
    expect(toNullableNumber(NaN)).toBeNull();
  });

  it("giữ nguyên number hợp lệ", () => {
    expect(toNullableNumber(42)).toBe(42);
    expect(toNullableNumber(0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeTextInput
// ═══════════════════════════════════════════════════════════
describe("normalizeTextInput", () => {
  it.each([null, undefined])('trả "" khi input là %s', (val) => {
    expect(normalizeTextInput(val)).toBe("");
  });

  it("trim whitespace", () => {
    expect(normalizeTextInput("  hello  ")).toBe("hello");
  });

  it("giữ nguyên Unicode tiếng Việt", () => {
    expect(normalizeTextInput("  Nguyễn Văn A  ")).toBe("Nguyễn Văn A");
  });

  it("chuyển number → string", () => {
    expect(normalizeTextInput(123)).toBe("123");
  });
});

// ═══════════════════════════════════════════════════════════
// trimToLength
// ═══════════════════════════════════════════════════════════
describe("trimToLength", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(trimToLength(val)).toBeNull();
  });

  it("trả null khi chuỗi rỗng sau trim", () => {
    expect(trimToLength("   ")).toBeNull();
  });

  it("giữ nguyên chuỗi ngắn hơn maxLength", () => {
    expect(trimToLength("short", 255)).toBe("short");
  });

  it("cắt chuỗi dài hơn maxLength", () => {
    expect(trimToLength("abcdefghij", 5)).toBe("abcde");
  });

  it("dùng maxLength mặc định là 255", () => {
    const str = "a".repeat(300);
    expect(trimToLength(str)).toHaveLength(255);
  });
});

// ═══════════════════════════════════════════════════════════
// todayYMDInVietnam
// ═══════════════════════════════════════════════════════════
describe("todayYMDInVietnam", () => {
  it("trả format YYYY-MM-DD", () => {
    const result = todayYMDInVietnam();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ═══════════════════════════════════════════════════════════
// ymdInVietnamFromInstant
// ═══════════════════════════════════════════════════════════
describe("ymdInVietnamFromInstant", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(ymdInVietnamFromInstant(val)).toBeNull();
  });

  it("trả null khi date không hợp lệ", () => {
    expect(ymdInVietnamFromInstant("not-a-date")).toBeNull();
  });

  it("chuyển UTC midnight sang ngày Vietnam đúng (UTC+7)", () => {
    // 2024-08-14 23:00 UTC = 2024-08-15 06:00 Vietnam
    const utcDate = new Date("2024-08-14T23:00:00Z");
    expect(ymdInVietnamFromInstant(utcDate)).toBe("2024-08-15");
  });

  it("chuyển ISO string sang ngày Vietnam", () => {
    expect(ymdInVietnamFromInstant("2024-01-01T00:00:00Z")).toBe("2024-01-01");
  });

  it("xử lý Date object", () => {
    const d = new Date("2024-06-30T20:00:00Z"); // 2024-07-01 03:00 VN
    expect(ymdInVietnamFromInstant(d)).toBe("2024-07-01");
  });
});

// ═══════════════════════════════════════════════════════════
// formatDateOutput
// ═══════════════════════════════════════════════════════════
describe("formatDateOutput", () => {
  it("trả null khi input falsy", () => {
    expect(formatDateOutput(null)).toBeNull();
    expect(formatDateOutput("")).toBeNull();
    expect(formatDateOutput(undefined)).toBeNull();
  });

  it("giữ nguyên YYYY-MM-DD thuần", () => {
    expect(formatDateOutput("2024-08-15")).toBe("2024-08-15");
  });

  it("chuyển DD/MM/YYYY → YYYY-MM-DD", () => {
    expect(formatDateOutput("15/08/2024")).toBe("2024-08-15");
  });

  it("chuyển ISO string → ngày Vietnam", () => {
    // 2024-08-14 23:30 UTC = 2024-08-15 06:30 VN
    expect(formatDateOutput("2024-08-14T23:30:00Z")).toBe("2024-08-15");
  });

  it("xử lý Date object", () => {
    const d = new Date("2024-08-15T10:00:00Z"); // 2024-08-15 17:00 VN
    expect(formatDateOutput(d)).toBe("2024-08-15");
  });

  it("trả null khi Date invalid", () => {
    expect(formatDateOutput(new Date("invalid"))).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// formatYMDToDMY
// ═══════════════════════════════════════════════════════════
describe("formatYMDToDMY", () => {
  it('trả "" khi input falsy', () => {
    expect(formatYMDToDMY(null)).toBe("");
    expect(formatYMDToDMY("")).toBe("");
    expect(formatYMDToDMY(undefined)).toBe("");
  });

  it("chuyển YYYY-MM-DD → DD/MM/YYYY", () => {
    expect(formatYMDToDMY("2024-08-15")).toBe("15/08/2024");
  });

  it("chuyển YYYY/MM/DD → DD/MM/YYYY", () => {
    expect(formatYMDToDMY("2024/08/15")).toBe("15/08/2024");
  });

  it("chuyển YYYYMMDD → DD/MM/YYYY", () => {
    expect(formatYMDToDMY("20240815")).toBe("15/08/2024");
  });

  it('trả "" khi không khớp pattern', () => {
    expect(formatYMDToDMY("random")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeCheckFlagValue
// ═══════════════════════════════════════════════════════════
describe("normalizeCheckFlagValue", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(normalizeCheckFlagValue(val)).toBeNull();
  });

  it("giữ nguyên boolean", () => {
    expect(normalizeCheckFlagValue(true)).toBe(true);
    expect(normalizeCheckFlagValue(false)).toBe(false);
  });

  it("chuyển number: 1 → true, 0 → false, khác → null", () => {
    expect(normalizeCheckFlagValue(1)).toBe(true);
    expect(normalizeCheckFlagValue(0)).toBe(false);
    expect(normalizeCheckFlagValue(99)).toBeNull();
  });

  it.each(["true", "t", "1", "yes"])('chuỗi "%s" → true', (val) => {
    expect(normalizeCheckFlagValue(val)).toBe(true);
  });

  it.each(["false", "f", "0", "no"])('chuỗi "%s" → false', (val) => {
    expect(normalizeCheckFlagValue(val)).toBe(false);
  });

  it.each(["null", "undefined", ""])('chuỗi "%s" → null', (val) => {
    expect(normalizeCheckFlagValue(val)).toBeNull();
  });

  it("case insensitive", () => {
    expect(normalizeCheckFlagValue("TRUE")).toBe(true);
    expect(normalizeCheckFlagValue("FALSE")).toBe(false);
    expect(normalizeCheckFlagValue("  Yes  ")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeStatusKey
// ═══════════════════════════════════════════════════════════
describe("normalizeStatusKey", () => {
  it.each([null, undefined])('trả "" khi input là %s', (val) => {
    expect(normalizeStatusKey(val)).toBe("");
  });

  it("bỏ dấu tiếng Việt và lowercase", () => {
    expect(normalizeStatusKey("Đã Thanh Toán")).toBe("athanhtoan");
  });

  it("loại ký tự đặc biệt", () => {
    expect(normalizeStatusKey("Chưa Thanh Toán!@#")).toBe("chuathanhtoan");
  });

  it("giữ chữ và số", () => {
    expect(normalizeStatusKey("Test123")).toBe("test123");
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeSupplyStatus
// ═══════════════════════════════════════════════════════════
describe("normalizeSupplyStatus", () => {
  it.each([null, undefined])('trả "hoat dong" khi input là %s', (val) => {
    expect(normalizeSupplyStatus(val)).toBe("hoat dong");
  });

  it("boolean true → hoat dong, false → tam dung", () => {
    expect(normalizeSupplyStatus(true)).toBe("hoat dong");
    expect(normalizeSupplyStatus(false)).toBe("tam dung");
  });

  it("number 1 → hoat dong, 0 → tam dung", () => {
    expect(normalizeSupplyStatus(1)).toBe("hoat dong");
    expect(normalizeSupplyStatus(0)).toBe("tam dung");
  });

  it.each(["active", "dang hoat dong", "hoat dong", "running", "true", "yes"])(
    'chuỗi "%s" → hoat dong',
    (val) => {
      expect(normalizeSupplyStatus(val)).toBe("hoat dong");
    }
  );

  it.each(["inactive", "tam ngung", "tam dung", "pause", "paused", "false", "no"])(
    'chuỗi "%s" → tam dung',
    (val) => {
      expect(normalizeSupplyStatus(val)).toBe("tam dung");
    }
  );

  it('chuỗi rỗng → "hoat dong"', () => {
    expect(normalizeSupplyStatus("")).toBe("hoat dong");
    expect(normalizeSupplyStatus("   ")).toBe("hoat dong");
  });

  it("chuỗi không khớp → trả nguyên dạng normalized", () => {
    expect(normalizeSupplyStatus("custom status")).toBe("custom status");
  });
});

// ═══════════════════════════════════════════════════════════
// parseDbBoolean
// ═══════════════════════════════════════════════════════════
describe("parseDbBoolean", () => {
  it("giữ nguyên boolean", () => {
    expect(parseDbBoolean(true)).toBe(true);
    expect(parseDbBoolean(false)).toBe(false);
  });

  it("null/undefined → false", () => {
    expect(parseDbBoolean(null)).toBe(false);
    expect(parseDbBoolean(undefined)).toBe(false);
  });

  it.each(["true", "1", "t", "y", "yes"])('chuỗi "%s" → true', (val) => {
    expect(parseDbBoolean(val)).toBe(true);
  });

  it.each(["false", "0", "f", "n", "no", "", "random"])(
    'chuỗi "%s" → false',
    (val) => {
      expect(parseDbBoolean(val)).toBe(false);
    }
  );
});

// ═══════════════════════════════════════════════════════════
// fromDbNumber
// ═══════════════════════════════════════════════════════════
describe("fromDbNumber", () => {
  it.each([null, undefined])("trả null khi input là %s", (val) => {
    expect(fromDbNumber(val)).toBeNull();
  });

  it("chuyển string → number", () => {
    expect(fromDbNumber("500")).toBe(500);
    expect(fromDbNumber("0")).toBe(0);
    expect(fromDbNumber("-10.5")).toBe(-10.5);
  });

  it("trả null khi NaN", () => {
    expect(fromDbNumber("abc")).toBeNull();
    expect(fromDbNumber(NaN)).toBeNull();
    expect(fromDbNumber(Infinity)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// getRowId
// ═══════════════════════════════════════════════════════════
describe("getRowId", () => {
  it("trả null khi row null", () => {
    expect(getRowId(null, "id")).toBeNull();
  });

  it("lấy ID từ key đầu tiên tìm thấy", () => {
    expect(getRowId({ id: 42, pk: 99 }, "id", "pk")).toBe(42);
  });

  it("fallback sang key tiếp theo khi key đầu không có", () => {
    expect(getRowId({ pk: 99 }, "id", "pk")).toBe(99);
  });

  it("chuyển string ID → number", () => {
    expect(getRowId({ id: "123" }, "id")).toBe(123);
  });

  it("trả null khi không tìm thấy key hợp lệ", () => {
    expect(getRowId({ name: "test" }, "id", "pk")).toBeNull();
  });

  it("bỏ qua giá trị null/undefined trong row", () => {
    expect(getRowId({ id: null, pk: 5 }, "id", "pk")).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════
// hasMeaningfulValue
// ═══════════════════════════════════════════════════════════
describe("hasMeaningfulValue", () => {
  it("null/undefined → false", () => {
    expect(hasMeaningfulValue(null)).toBe(false);
    expect(hasMeaningfulValue(undefined)).toBe(false);
  });

  it('chuỗi rỗng / whitespace → false', () => {
    expect(hasMeaningfulValue("")).toBe(false);
    expect(hasMeaningfulValue("   ")).toBe(false);
  });

  it("chuỗi có nội dung → true", () => {
    expect(hasMeaningfulValue("abc")).toBe(true);
  });

  it("number (kể cả 0) → true", () => {
    expect(hasMeaningfulValue(0)).toBe(true);
    expect(hasMeaningfulValue(42)).toBe(true);
  });

  it("boolean → true", () => {
    expect(hasMeaningfulValue(false)).toBe(true);
    expect(hasMeaningfulValue(true)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// hasAccountStoragePayload
// ═══════════════════════════════════════════════════════════
describe("hasAccountStoragePayload", () => {
  it("object rỗng → false", () => {
    expect(hasAccountStoragePayload({})).toBe(false);
  });

  it("không truyền tham số → false", () => {
    expect(hasAccountStoragePayload()).toBe(false);
  });

  it.each(["accountUser", "accountPass", "accountMail", "accountNote"])(
    'có %s → true',
    (key) => {
      expect(hasAccountStoragePayload({ [key]: "value" })).toBe(true);
    }
  );

  it("có capacity → true", () => {
    expect(hasAccountStoragePayload({ capacity: 5 })).toBe(true);
    expect(hasAccountStoragePayload({ capacity: 0 })).toBe(true);
  });

  it("capacity null/undefined/rỗng → false", () => {
    expect(hasAccountStoragePayload({ capacity: null })).toBe(false);
    expect(hasAccountStoragePayload({ capacity: undefined })).toBe(false);
    expect(hasAccountStoragePayload({ capacity: "" })).toBe(false);
  });

  it("tất cả field rỗng / whitespace → false", () => {
    expect(
      hasAccountStoragePayload({
        accountUser: "",
        accountPass: "   ",
        accountMail: null,
        accountNote: undefined,
      })
    ).toBe(false);
  });
});
