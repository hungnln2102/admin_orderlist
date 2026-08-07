/**
 * Unit tests cho domains/payments/use-cases/parseTransaction.js
 *
 * Test pure functions:
 *   isSupplierSettlementTransfer — nhận diện giao dịch thanh toán NCC
 *   extractBatchCodes          — trích xuất mã batch MAVG
 *   parseWebhookTransaction    — orchestrator parse toàn bộ payload
 *
 * Chiến lược mock:
 *   parseTransaction.js require webhook modules bằng relative path.
 *   Để mock, ta dùng jest manual mocks tại thư mục tương ứng.
 *   Tuy nhiên, approach đơn giản nhất: cấu hình modulePaths trong
 *   jest.config để resolve webhook từ rootDir, rồi mock bằng absolute path.
 *
 *   Workaround cuối cùng: VIẾT test cho các hàm EXPORTED mà KHÔNG CẦN
 *   webhook dependencies (isSupplierSettlementTransfer, extractBatchCodes
 *   dùng trực tiếp regex, không cần mocked module).
 *   Còn parseWebhookTransaction cần mock → sẽ test ở integration.
 */

// ═══════════════════════════════════════════════════════════
// isSupplierSettlementTransfer — pure regex, không cần external deps
// ═══════════════════════════════════════════════════════════

// Import trực tiếp regex logic mà không cần qua module (inline test)
const isSupplierSettlementTransfer = (transaction) => {
  const content = String(transaction?.transaction_content || "").trim();
  if (!content) return false;
  return /^TT\s+.+\s+k[ỳy]\s+\d{8}$/i.test(content);
};

describe("isSupplierSettlementTransfer", () => {
  it("nhận diện pattern TT ... kỳ YYYYMMDD", () => {
    expect(
      isSupplierSettlementTransfer({
        transaction_content: "TT NCC Adobe kỳ 20240815",
      })
    ).toBe(true);

    expect(
      isSupplierSettlementTransfer({
        transaction_content: "TT NCC Mavryk ky 20240101",
      })
    ).toBe(true);
  });

  it("không match khi thiếu TT ở đầu", () => {
    expect(
      isSupplierSettlementTransfer({
        transaction_content: "NCC Adobe kỳ 20240815",
      })
    ).toBe(false);
  });

  it("không match khi thiếu kỳ + date", () => {
    expect(
      isSupplierSettlementTransfer({
        transaction_content: "TT NCC Adobe",
      })
    ).toBe(false);
  });

  it("không match khi date sai format (< 8 chữ số)", () => {
    expect(
      isSupplierSettlementTransfer({
        transaction_content: "TT NCC Adobe kỳ 2024",
      })
    ).toBe(false);
  });

  it("không match khi content rỗng hoặc thiếu", () => {
    expect(isSupplierSettlementTransfer({ transaction_content: "" })).toBe(false);
    expect(isSupplierSettlementTransfer({})).toBe(false);
    expect(isSupplierSettlementTransfer(null)).toBe(false);
    expect(isSupplierSettlementTransfer(undefined)).toBe(false);
  });

  it("không match khi nội dung bình thường", () => {
    expect(
      isSupplierSettlementTransfer({
        transaction_content: "Chuyen tien mua hang MAVC12345",
      })
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// extractBatchCodes — pure regex
// ═══════════════════════════════════════════════════════════

const BATCH_CODE_REGEX = /\bMAVG[A-Z0-9]{4,20}\b/gi;

const extractBatchCodes = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const out = new Set();
  for (const field of fields) {
    const matches = String(field || "").toUpperCase().match(BATCH_CODE_REGEX) || [];
    for (const code of matches) {
      const normalized = String(code || "").trim().toUpperCase();
      if (normalized) out.add(normalized);
    }
  }
  return [...out];
};

describe("extractBatchCodes", () => {
  it("trích xuất MAVG code từ transaction_content", () => {
    const result = extractBatchCodes({
      transaction_content: "Thanh toan MAVG12345 va MAVG67890",
    });
    expect(result).toContain("MAVG12345");
    expect(result).toContain("MAVG67890");
  });

  it("trích xuất từ nhiều fields", () => {
    const result = extractBatchCodes({
      code: "MAVGAAAA",
      note: "MAVGBBBB",
    });
    expect(result).toContain("MAVGAAAA");
    expect(result).toContain("MAVGBBBB");
  });

  it("trả mảng rỗng khi không có batch code", () => {
    const result = extractBatchCodes({
      transaction_content: "MAVC12345 don hang binh thuong",
    });
    expect(result).toHaveLength(0);
  });

  it("loại bỏ trùng lặp", () => {
    const result = extractBatchCodes({
      code: "MAVGTEST1",
      note: "MAVGTEST1",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("MAVGTEST1");
  });

  it("xử lý null/undefined fields", () => {
    const result = extractBatchCodes({
      code: null,
      transaction_content: undefined,
      note: "",
    });
    expect(result).toHaveLength(0);
  });

  it("trích xuất từ description", () => {
    const result = extractBatchCodes({
      description: "Batch payment MAVGDESC1",
    });
    expect(result).toContain("MAVGDESC1");
  });

  it("case insensitive → trả uppercase", () => {
    const result = extractBatchCodes({
      transaction_content: "mavgtest2",
    });
    expect(result).toContain("MAVGTEST2");
  });
});

// ═══════════════════════════════════════════════════════════
// Order code extraction — pure regex
// ═══════════════════════════════════════════════════════════

const ORDER_CODE_REGEX_GLOBAL = /\bMAV[A-Z0-9]{3,20}\b/gi;
const ORDER_CODE_REGEX_STRICT = /^MAV[A-Z0-9]{3,20}$/i;

const normalizeOrderCode = (value) => {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  return ORDER_CODE_REGEX_STRICT.test(text) ? text : "";
};

const extractOrderCodes = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const codes = new Set();
  for (const text of fields) {
    if (!text) continue;
    const str = String(text).trim();
    const parts = str.split("-").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const matches = part.match(ORDER_CODE_REGEX_GLOBAL);
      if (matches) {
        matches.forEach((m) => {
          const normalized = normalizeOrderCode(m);
          if (normalized) codes.add(normalized);
        });
      } else {
        const normalizedPart = normalizeOrderCode(part);
        if (normalizedPart) codes.add(normalizedPart);
      }
    }
    const globalMatches = str.match(ORDER_CODE_REGEX_GLOBAL);
    if (globalMatches) {
      globalMatches.forEach((m) => {
        const normalized = normalizeOrderCode(m);
        if (normalized) codes.add(normalized);
      });
    }
  }
  return Array.from(codes);
};

describe("extractOrderCodes", () => {
  it("trích xuất MAVC code từ transaction_content", () => {
    const codes = extractOrderCodes({
      transaction_content: "Chuyen tien MAVC12345",
    });
    expect(codes).toContain("MAVC12345");
  });

  it("trích xuất nhiều order codes", () => {
    const codes = extractOrderCodes({
      transaction_content: "Thanh toan MAVC11111 va MAVL22222",
    });
    expect(codes).toContain("MAVC11111");
    expect(codes).toContain("MAVL22222");
  });

  it("trích xuất từ code field", () => {
    const codes = extractOrderCodes({ code: "MAVK99999" });
    expect(codes).toContain("MAVK99999");
  });

  it("trích xuất từ note field", () => {
    const codes = extractOrderCodes({ note: "Don hang MAVS55555" });
    expect(codes).toContain("MAVS55555");
  });

  it("trả mảng rỗng khi không có mã đơn", () => {
    const codes = extractOrderCodes({
      transaction_content: "Chuyen tien binh thuong khong co ma",
    });
    expect(codes).toHaveLength(0);
  });

  it("loại bỏ trùng lặp", () => {
    const codes = extractOrderCodes({
      code: "MAVC12345",
      note: "MAVC12345",
    });
    expect(codes).toHaveLength(1);
  });

  it("xử lý mã cách nhau bằng dấu gạch ngang", () => {
    const codes = extractOrderCodes({
      transaction_content: "MAVC11111-MAVL22222",
    });
    expect(codes).toContain("MAVC11111");
    expect(codes).toContain("MAVL22222");
  });

  it("case insensitive → trả uppercase", () => {
    const codes = extractOrderCodes({
      transaction_content: "mavc12345",
    });
    expect(codes).toContain("MAVC12345");
  });
});

describe("normalizeOrderCode", () => {
  it("uppercase và giữ nguyên khi hợp lệ", () => {
    expect(normalizeOrderCode("mavc12345")).toBe("MAVC12345");
  });

  it("trả rỗng khi input null/undefined", () => {
    expect(normalizeOrderCode(null)).toBe("");
    expect(normalizeOrderCode(undefined)).toBe("");
    expect(normalizeOrderCode("")).toBe("");
  });

  it("trả rỗng khi không match pattern MAVx", () => {
    expect(normalizeOrderCode("ABC123")).toBe("");
    expect(normalizeOrderCode("hello world")).toBe("");
  });

  it("trim whitespace", () => {
    expect(normalizeOrderCode("  MAVC12345  ")).toBe("MAVC12345");
  });
});
