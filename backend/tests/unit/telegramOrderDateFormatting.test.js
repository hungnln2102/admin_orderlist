require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { formatDateDMY } = require("@/domains/notifications/telegram/builders/formatters");
const { buildOrderCreatedMessage } = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
const {
  normalizeDateOnly,
  calculateRemainingDaysVietnam,
  formatDateDisplay,
} = require("@/utils/time");

describe("Telegram & Backend DATE-only formatting (UTC+7)", () => {
  it("formatDateDMY giữ nguyên YYYY-MM-DD thuần và chuyển ISO UTC timestamp về Asia/Ho_Chi_Minh", () => {
    assert.strictEqual(formatDateDMY("2026-11-28"), "28/11/2026");
    assert.strictEqual(formatDateDMY("2027-11-27"), "27/11/2027");
    assert.strictEqual(formatDateDMY("2026-11-27T17:00:00.000Z"), "28/11/2026");
    assert.strictEqual(formatDateDMY("2027-11-26T17:00:00.000Z"), "27/11/2027");
    assert.strictEqual(formatDateDMY(new Date("2026-11-27T17:00:00.000Z")), "28/11/2026");
  });

  it("buildOrderCreatedMessage hiển thị đúng ngày Việt Nam và thời hạn 365 ngày cho đơn mẫu MAVLZYP4V", () => {
    const msgFromDateStr = buildOrderCreatedMessage({
      id_order: "MAVLZYP4V",
      productName: "Zoom 100 Người (12 tháng)",
      information_order: "nguyenngocdiu90@gmail.com",
      customer: "Dịu Nguyễn",
      order_date: "2026-11-28",
      expired_at: "2027-11-27",
      days: 365,
      price: 2800005,
    });
    assert.match(msgFromDateStr, /Ngày Bắt đầu: 28\/11\/2026/);
    assert.match(msgFromDateStr, /Thời hạn: 365 ngày/);
    assert.match(msgFromDateStr, /Ngày Hết hạn: 27\/11\/2027/);

    const msgFromIsoUtc = buildOrderCreatedMessage({
      id_order: "MAVLZYP4V",
      productName: "Zoom 100 Người (12 tháng)",
      information_order: "nguyenngocdiu90@gmail.com",
      customer: "Dịu Nguyễn",
      order_date: "2026-11-27T17:00:00.000Z",
      expired_at: "2027-11-26T17:00:00.000Z",
      days: 365,
      price: 2800005,
    });
    assert.match(msgFromIsoUtc, /Ngày Bắt đầu: 28\/11\/2026/);
    assert.match(msgFromIsoUtc, /Ngày Hết hạn: 27\/11\/2027/);
  });

  it("normalizeDateOnly & formatDateDisplay xử lý đồng nhất DATE thuần và ISO UTC timestamp", () => {
    assert.strictEqual(normalizeDateOnly("2026-11-28"), "2026-11-28");
    assert.strictEqual(normalizeDateOnly("2026-11-27T17:00:00.000Z"), "2026-11-28");
    assert.strictEqual(normalizeDateOnly("28/11/2026"), "2026-11-28");
    assert.strictEqual(normalizeDateOnly(""), null);
    assert.strictEqual(formatDateDisplay("2026-11-28"), "28/11/2026");
    assert.strictEqual(formatDateDisplay("2026-11-27T17:00:00.000Z"), "28/11/2026");
  });

  it("calculateRemainingDaysVietnam tính đúng số ngày còn lại theo lịch YYYY-MM-DD", () => {
    assert.strictEqual(
      calculateRemainingDaysVietnam("2027-11-27", new Date("2026-11-27T15:00:00+07:00")),
      365
    );
    assert.strictEqual(
      calculateRemainingDaysVietnam("2026-11-27T17:00:00.000Z", new Date("2026-11-27T01:00:00+07:00")),
      1
    );
    assert.strictEqual(
      calculateRemainingDaysVietnam("2026-11-26", new Date("2026-11-27T01:00:00+07:00")),
      0
    );
  });
});
