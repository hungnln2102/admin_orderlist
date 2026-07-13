const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { eventBus, EVENTS } = require("../src/events");

// Đăng ký Subscriber
require("../src/events/index").registerAllSubscribers();

console.log("Bắt đầu giả lập phát sự kiện...");

// 1. Đơn mới
console.log("1. Test Đơn Mới (ORDER_CREATED)");
eventBus.emit(EVENTS.ORDER_CREATED, {
  id_order: "TEST-CREATE-001",
  idOrder: "TEST-CREATE-001", // duplicate for safety in test
  san_pham: "Netflix Premium 1 Tháng",
  sanPham: "Netflix Premium 1 Tháng",
  khach_hang: "Nguyễn Văn A"
});

// 2. Cần gia hạn
console.log("2. Test Đơn Cần Gia Hạn (DAILY_FOUR_DAYS_DUE)");
eventBus.emit(EVENTS.DAILY_FOUR_DAYS_DUE, [
  { id_order: "TEST-4D-001", san_pham: "Spotify 1 Năm", gia_ban: 300000 },
  { id_order: "TEST-4D-002", san_pham: "Youtube Premium", gia_ban: 150000 }
]);

// 3. Đã hết hạn
console.log("3. Test Đơn Hết Hạn (DAILY_ZERO_DAYS_DUE)");
eventBus.emit(EVENTS.DAILY_ZERO_DAYS_DUE, [
  { id_order: "TEST-0D-001", san_pham: "Canva Pro", gia_ban: 50000 }
]);

// 4. Gia hạn thành công
console.log("4. Test Gia Hạn Thành Công (ORDER_RENEWED)");
eventBus.emit(EVENTS.ORDER_RENEWED, {
  id_order: "TEST-RENEW-001",
  san_pham: "NordVPN",
  ngay_het_han_moi: "2026-08-11"
});

console.log("Đã phát tất cả sự kiện, xin chờ queue xử lý...");

// Chờ queue trong telegramClient gửi tin (1.5s / tin)
setTimeout(() => {
  console.log("Done!");
  process.exit(0);
}, 30000); // Đợi 30s để Telegram queue kịp chạy
