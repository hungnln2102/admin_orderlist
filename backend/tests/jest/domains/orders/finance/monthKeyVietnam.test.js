jest.mock("../../../../../src/utils/normalizers", () => ({
  todayYMDInVietnam: jest.fn(),
  toNullableNumber: (v) => v,
}));

const { todayYMDInVietnam } = require("@/utils/normalizers");
const {
  monthKeyVietnamNow,
  monthKeyFromVietnamYmd,
} = require("@/domains/orders/controller/finance/dashboardSummary");

describe("monthKeyVietnam", () => {
  test("monthKeyVietnamNow lấy tháng từ ngày lịch VN, không phụ thuộc order_date tương lai", () => {
    todayYMDInVietnam.mockReturnValue("2026-05-30");
    expect(monthKeyVietnamNow()).toBe("2026-05");
  });

  test("monthKeyFromVietnamYmd từ chuỗi YMD", () => {
    expect(monthKeyFromVietnamYmd("2026-05-01")).toBe("2026-05");
    expect(monthKeyFromVietnamYmd("invalid")).toBeNull();
  });
});
