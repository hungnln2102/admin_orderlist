const cron = require("node-cron");
const { updateOrderStatusTask } = require("./tasks/updateOrderStatusTask");
const { notifyZeroDaysTask } = require("./tasks/notifyZeroDaysTask");
const { notifyFourDaysTask } = require("./tasks/notifyFourDaysTask");
const { finalizeDailySummaryTask } = require("./tasks/finalizeDailySummaryTask");

const TIMEZONE = "Asia/Ho_Chi_Minh";

// 1. Cron 0h (00:00 hàng ngày) - Cập nhật trạng thái đơn hàng & Thông báo 0 ngày
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("[Scheduler] 🕒 Cron 00:00 (0h) được kích hoạt");
    try {
      await updateOrderStatusTask("cron_0h");
      await notifyZeroDaysTask("cron_0h");
    } catch (err) {
      console.error("[Scheduler] Lỗi trong Cron 0h:", err.message);
    }
  },
  { scheduled: true, timezone: TIMEZONE }
);

// 2. Cron 7h (07:00 hàng ngày) - Rà soát & Thông báo đơn hàng 4 ngày còn lại
cron.schedule(
  "0 7 * * *",
  async () => {
    console.log("[Scheduler] 🕒 Cron 07:00 (7h) được kích hoạt");
    try {
      await notifyFourDaysTask("cron_7h");
    } catch (err) {
      console.error("[Scheduler] Lỗi trong Cron 7h:", err.message);
    }
  },
  { scheduled: true, timezone: TIMEZONE }
);

// 3. Cron 23:55 hàng ngày - Chốt số liệu doanh thu / đơn hàng cuối ngày
cron.schedule(
  "55 23 * * *",
  async () => {
    console.log("[Scheduler] 🕒 Cron 23:55 được kích hoạt (Chốt số liệu ngày)");
    try {
      await finalizeDailySummaryTask("cron_2355");
    } catch (err) {
      console.error("[Scheduler] Lỗi trong Cron 23:55:", err.message);
    }
  },
  { scheduled: true, timezone: TIMEZONE }
);

console.log(`=================================`);
console.log(`⏰ Cron Scheduler V2 initialized:`);
console.log(` - Cron 00:00 (0h): Cập nhật trạng thái đơn & Thông báo 0 ngày`);
console.log(` - Cron 07:00 (7h): Thông báo nhắc gia hạn đơn 4 ngày`);
console.log(` - Cron 23:55: Chốt số liệu thống kê doanh thu cuối ngày`);
console.log(` - Timezone: ${TIMEZONE}`);
console.log(`=================================`);

module.exports = {
  updateOrderStatusTask,
  notifyZeroDaysTask,
  notifyFourDaysTask,
  finalizeDailySummaryTask,
};
