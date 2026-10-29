const test = require("node:test");
const assert = require("node:assert/strict");
const { ORDER_STATUS } = require("../../src/constants/orderStatus");

test.describe("Order Delete Status Transition Suite - Chỉ Đạo Của Master", () => {
  test("1. Đơn Cần Gia Hạn (RENEW_REQUIRED) khi bấm xóa phải chuyển thành Hết Hạn (EXPIRED), không được xóa vĩnh viễn", () => {
    // Giả lập logic kiểm tra trạng thái xóa
    const determineDeleteAction = (status) => {
      if (status === ORDER_STATUS.RENEW_REQUIRED || status === "Cần Gia Hạn") {
        return { action: "expired", targetStatus: ORDER_STATUS.EXPIRED, isHardDelete: false };
      }
      if (status === ORDER_STATUS.PAID || status === "Đã Thanh Toán") {
        return { action: "canceled", targetStatus: ORDER_STATUS.CANCELED, isHardDelete: false };
      }
      return { action: "deleted", isHardDelete: true };
    };

    const result = determineDeleteAction(ORDER_STATUS.RENEW_REQUIRED);
    assert.strictEqual(result.action, "expired");
    assert.strictEqual(result.targetStatus, ORDER_STATUS.EXPIRED);
    assert.strictEqual(result.isHardDelete, false, "Tuyệt đối không được Hard Delete đơn Cần Gia Hạn");

    const resultText = determineDeleteAction("Cần Gia Hạn");
    assert.strictEqual(resultText.action, "expired");
    assert.strictEqual(resultText.targetStatus, ORDER_STATUS.EXPIRED);
  });

  test("2. Đơn Đã Thanh Toán (PAID) khi bấm xóa phải chuyển thành Đã Hủy (CANCELED)", () => {
    const determineDeleteAction = (status) => {
      if (status === ORDER_STATUS.RENEW_REQUIRED || status === "Cần Gia Hạn") {
        return { action: "expired", targetStatus: ORDER_STATUS.EXPIRED, isHardDelete: false };
      }
      if (status === ORDER_STATUS.PAID || status === "Đã Thanh Toán") {
        return { action: "canceled", targetStatus: ORDER_STATUS.CANCELED, isHardDelete: false };
      }
      return { action: "deleted", isHardDelete: true };
    };

    const result = determineDeleteAction(ORDER_STATUS.PAID);
    assert.strictEqual(result.action, "canceled");
    assert.strictEqual(result.targetStatus, ORDER_STATUS.CANCELED);
    assert.strictEqual(result.isHardDelete, false);

    const resultText = determineDeleteAction("Đã Thanh Toán");
    assert.strictEqual(resultText.action, "canceled");
    assert.strictEqual(resultText.targetStatus, ORDER_STATUS.CANCELED);
  });

  test("3. Đơn Chưa Thanh Toán (UNPAID) mới được phép xóa vĩnh viễn (Hard Delete)", () => {
    const determineDeleteAction = (status) => {
      if (status === ORDER_STATUS.RENEW_REQUIRED || status === "Cần Gia Hạn") {
        return { action: "expired", targetStatus: ORDER_STATUS.EXPIRED, isHardDelete: false };
      }
      if (status === ORDER_STATUS.PAID || status === "Đã Thanh Toán") {
        return { action: "canceled", targetStatus: ORDER_STATUS.CANCELED, isHardDelete: false };
      }
      return { action: "deleted", isHardDelete: true };
    };

    const result = determineDeleteAction(ORDER_STATUS.UNPAID);
    assert.strictEqual(result.action, "deleted");
    assert.strictEqual(result.isHardDelete, true);
  });
});

