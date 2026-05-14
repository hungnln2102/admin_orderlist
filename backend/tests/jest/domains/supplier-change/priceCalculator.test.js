const {
  computeProratedCostForNewSupplier,
  computeRefundFromOldSupplier,
  computeOrderAgeDays,
  classifyFlowByAge,
  isMavrykSupplierName,
  FLOW_A_AGE_THRESHOLD_DAYS,
} = require("../../../../src/domains/supplier-change/priceCalculator");

describe("supplier-change / priceCalculator", () => {
  describe("computeProratedCostForNewSupplier", () => {
    test("Prorate: 30 ngày tổng, còn 15 ngày, giá full 100k → 50k", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 30,
          remainingDays: 15,
        })
      ).toBe(50000);
    });

    test("Prorate làm tròn về bội số 1.000: 100k / 365 × 100 = 27 397 → 27 000", () => {
      // Lý do: cost lưu DB / hiển thị UI / delta dashboard / Telegram đều
      // dùng cùng đơn vị 1.000 VND (xem `roundGiaBanValue` ở frontend).
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 365,
          remainingDays: 100,
        })
      ).toBe(27000);
    });

    test("Prorate làm tròn nửa lên về bội 1.000: 100k / 7 × 1 = 14 285,7 → 14 000", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 7,
          remainingDays: 1,
        })
      ).toBe(14000);
    });

    test("Prorate làm tròn nửa lên về bội 1.000: 100k / 7 × 4 = 57 142,8 → 57 000", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 7,
          remainingDays: 4,
        })
      ).toBe(57000);
    });

    test("Prorate gần bội 1.000 (case bug NCC=Ades 33 871 → 34 000)", () => {
      // Lặp lại tình huống từ ảnh báo cáo: NCC mới Ades, prorate ra 33 871
      // → phải lưu 34 000 để khớp với UI/Dashboard/Telegram.
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 35000,
          totalDays: 31,
          remainingDays: 30,
        })
      ).toBe(34000);
    });

    test("remainingDays = 0 → 0", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 30,
          remainingDays: 0,
        })
      ).toBe(0);
    });

    test("remainingDays > totalDays → cap về totalDays (full price)", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 30,
          remainingDays: 60,
        })
      ).toBe(100000);
    });

    test("Input không hợp lệ → 0", () => {
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: null,
          totalDays: 30,
          remainingDays: 10,
        })
      ).toBe(0);
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: 100000,
          totalDays: 0,
          remainingDays: 10,
        })
      ).toBe(0);
      expect(
        computeProratedCostForNewSupplier({
          fullPrice: -10000,
          totalDays: 30,
          remainingDays: 10,
        })
      ).toBe(0);
    });
  });

  describe("computeRefundFromOldSupplier", () => {
    test("NCC cũ đã nhận 90k cho 30 ngày, còn 10 ngày → hoàn 30k", () => {
      expect(
        computeRefundFromOldSupplier({
          oldImportCost: 90000,
          totalDays: 30,
          remainingDays: 10,
        })
      ).toBe(30000);
    });

    test("Cùng đầu vào nhưng đã hết hạn → hoàn 0", () => {
      expect(
        computeRefundFromOldSupplier({
          oldImportCost: 90000,
          totalDays: 30,
          remainingDays: 0,
        })
      ).toBe(0);
    });

    test("Cost cũ = 0 → hoàn 0", () => {
      expect(
        computeRefundFromOldSupplier({
          oldImportCost: 0,
          totalDays: 30,
          remainingDays: 10,
        })
      ).toBe(0);
    });

    test("Refund làm tròn về bội số 1.000: 33 871 × 10/30 = 11 290,3 → 11 000", () => {
      // Cùng convention với cost: số tiền hoàn cũng phải là bội số 1.000 để
      // dashboard.total_refund / log NCC / Telegram khớp với UI.
      expect(
        computeRefundFromOldSupplier({
          oldImportCost: 33871,
          totalDays: 30,
          remainingDays: 10,
        })
      ).toBe(11000);
    });
  });

  describe("computeOrderAgeDays", () => {
    test("Cùng ngày → 0", () => {
      expect(computeOrderAgeDays("2026-05-11", "2026-05-11")).toBe(0);
    });

    test("Hôm sau → 1", () => {
      expect(computeOrderAgeDays("2026-05-10", "2026-05-11")).toBe(1);
    });

    test("Đơn tạo cách 5 ngày → 5", () => {
      expect(computeOrderAgeDays("2026-05-06", "2026-05-11")).toBe(5);
    });

    test("Đơn tạo cách 6 ngày → 6 (Flow B)", () => {
      expect(computeOrderAgeDays("2026-05-05", "2026-05-11")).toBe(6);
    });

    test("Định dạng DMY cũng hỗ trợ", () => {
      expect(computeOrderAgeDays("01/05/2026", "11/05/2026")).toBe(10);
    });

    test("Input null → null", () => {
      expect(computeOrderAgeDays(null, "2026-05-11")).toBeNull();
      expect(computeOrderAgeDays("2026-05-11", undefined)).toBeNull();
    });
  });

  describe("classifyFlowByAge", () => {
    test("0 ngày → A", () => {
      expect(classifyFlowByAge(0)).toBe("A");
    });

    test(`${FLOW_A_AGE_THRESHOLD_DAYS} ngày (mốc) → A`, () => {
      expect(classifyFlowByAge(FLOW_A_AGE_THRESHOLD_DAYS)).toBe("A");
    });

    test(`${FLOW_A_AGE_THRESHOLD_DAYS + 1} ngày → B`, () => {
      expect(classifyFlowByAge(FLOW_A_AGE_THRESHOLD_DAYS + 1)).toBe("B");
    });

    test("Tuổi không xác định → A (fallback an toàn)", () => {
      expect(classifyFlowByAge(null)).toBe("A");
    });
  });

  describe("isMavrykSupplierName", () => {
    test("'Mavryk' → true (không phân biệt hoa thường, có khoảng trắng)", () => {
      expect(isMavrykSupplierName("Mavryk")).toBe(true);
      expect(isMavrykSupplierName("  mavryk  ")).toBe(true);
      expect(isMavrykSupplierName("MAVRYK")).toBe(true);
    });

    test("Tên khác → false", () => {
      expect(isMavrykSupplierName("Shop")).toBe(false);
      expect(isMavrykSupplierName("Adobe")).toBe(false);
      expect(isMavrykSupplierName("")).toBe(false);
      expect(isMavrykSupplierName(null)).toBe(false);
    });
  });
});
