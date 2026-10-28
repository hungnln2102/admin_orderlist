require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateNewExpiry,
  resolveMonthsToAdd,
  isRenewalOrder,
} = require("@/domains/orders/services/orderPaymentService");
const { ORDER_STATUS } = require("@/constants/orderStatus");

describe("Renewal Date Calculation - Logic Chuẩn Hóa Theo Chỉ Đạo Của Master", () => {
  it("1. Đơn 1 tháng (--1m): Ngày bắt đầu mới = expired_at + 1 ngày, Ngày hết hạn mới = tháng + 1 và ngày giữ nguyên", async () => {
    // Ví dụ mẫu của Master: 12/10/2026 - 11/11/2026
    const order = {
      order_date: "2026-10-12",
      expired_at: "2026-11-11",
      display_name: "Adobe_Renew2--1m",
      days: 30,
      status: ORDER_STATUS.RENEW_REQUIRED,
    };

    const renewal = await calculateNewExpiry(order);

    // Ngày bắt đầu mới: 12/11/2026 (2026-11-12)
    assert.strictEqual(renewal.newOrderDate, "2026-11-12", "Ngày bắt đầu mới phải là 12/11/2026");
    // Ngày hết hạn mới: 11/12/2026 (2026-12-11)
    assert.strictEqual(renewal.newExpiredAt, "2026-12-11", "Ngày hết hạn mới phải là 11/12/2026 (ngày 11 giữ nguyên)");
    assert.strictEqual(renewal.monthsAdded, 1, "Số tháng cộng phải là 1");
    assert.strictEqual(renewal.days, 30, "Số ngày chu kỳ mới (12/11 đến 11/12) phải là 30 ngày");
  });

  it("2. Đơn 3 tháng (--3m): Ngày bắt đầu mới = expired_at + 1 ngày, Ngày hết hạn mới = tháng + 3 và ngày giữ nguyên", async () => {
    const order = {
      order_date: "2026-10-12",
      expired_at: "2026-11-11",
      display_name: "Youtube_Add--3m",
      days: 92,
      status: ORDER_STATUS.RENEW_REQUIRED,
    };

    const renewal = await calculateNewExpiry(order);

    assert.strictEqual(renewal.newOrderDate, "2026-11-12");
    // Tháng 11 + 3 = Tháng 2 năm sau (2027)
    assert.strictEqual(renewal.newExpiredAt, "2027-02-11", "Hạn mới phải là 11/02/2027 (ngày 11 giữ nguyên)");
    assert.strictEqual(renewal.monthsAdded, 3);
  });

  it("3. Đơn 6 tháng (--6m): Ngày bắt đầu mới = expired_at + 1 ngày, Ngày hết hạn mới = tháng + 6 và ngày giữ nguyên", async () => {
    const order = {
      order_date: "2026-10-12",
      expired_at: "2026-11-11",
      display_name: "Adobe_Renew--6m",
      days: 182,
      status: ORDER_STATUS.RENEW_REQUIRED,
    };

    const renewal = await calculateNewExpiry(order);

    assert.strictEqual(renewal.newOrderDate, "2026-11-12");
    // Tháng 11 + 6 = Tháng 5 năm sau (2027)
    assert.strictEqual(renewal.newExpiredAt, "2027-05-11", "Hạn mới phải là 11/05/2027 (ngày 11 giữ nguyên)");
    assert.strictEqual(renewal.monthsAdded, 6);
  });

  it("4. Đơn 12 tháng (--12m): Ngày bắt đầu mới = expired_at + 1 ngày, Ngày hết hạn mới = tháng + 12 và ngày giữ nguyên", async () => {
    const order = {
      order_date: "2026-10-12",
      expired_at: "2026-11-11",
      display_name: "Canva_Per--12m",
      days: 365,
      status: ORDER_STATUS.RENEW_REQUIRED,
    };

    const renewal = await calculateNewExpiry(order);

    assert.strictEqual(renewal.newOrderDate, "2026-11-12");
    // Tháng 11 + 12 = Tháng 11 năm sau (2027)
    assert.strictEqual(renewal.newExpiredAt, "2027-11-11", "Hạn mới phải là 11/11/2027 (ngày 11 giữ nguyên)");
    assert.strictEqual(renewal.monthsAdded, 12);
  });

  it("5. Xử lý an toàn ngày cuối tháng (Edge Case: 31/01 -> 28/02 không bị tràn sang tháng 3)", async () => {
    const order = {
      expired_at: "2026-01-31",
      display_name: "Capcut_Per--1m",
      days: 30,
    };

    const renewal = await calculateNewExpiry(order);

    assert.strictEqual(renewal.newOrderDate, "2026-02-01");
    // Năm 2026 không nhuận, tháng 2 có 28 ngày
    assert.strictEqual(renewal.newExpiredAt, "2026-02-28", "Tháng 2 phải chốt 28 ngày, không tràn sang tháng 3");
  });

  it("6. Tự động nhận diện pattern gạch ngang khác: em-dash (—12m), single dash (-1m), hoặc chữ 'tháng'", async () => {
    const orderEmDash = { expired_at: "2026-11-11", display_name: "Cursor_Pro—12m" };
    const renewalEmDash = await calculateNewExpiry(orderEmDash);
    assert.strictEqual(renewalEmDash.monthsAdded, 12);

    const orderText = { expired_at: "2026-11-11", variant_name: "Gói 6 tháng cá nhân" };
    const renewalText = await calculateNewExpiry(orderText);
    assert.strictEqual(renewalText.monthsAdded, 6);
  });

  it("7. Fallback theo order.days nếu không có text biến thể", async () => {
    const order365 = { expired_at: "2026-11-11", days: 365 };
    assert.strictEqual((await calculateNewExpiry(order365)).monthsAdded, 12);

    const order180 = { expired_at: "2026-11-11", days: 182 };
    assert.strictEqual((await calculateNewExpiry(order180)).monthsAdded, 6);

    const order90 = { expired_at: "2026-11-11", days: 91 };
    assert.strictEqual((await calculateNewExpiry(order90)).monthsAdded, 3);

    const order30 = { expired_at: "2026-11-11", days: 30 };
    assert.strictEqual((await calculateNewExpiry(order30)).monthsAdded, 1);
  });

  it("8. Backward compatibility: Nhận tham số chuỗi string/Date trực tiếp", async () => {
    const renewal = await calculateNewExpiry("2026-11-11", { months: 1 });
    assert.strictEqual(renewal.newOrderDate, "2026-11-12");
    assert.strictEqual(renewal.newExpiredAt, "2026-12-11");
    assert.strictEqual(String(renewal), "2026-12-11");
  });
});
