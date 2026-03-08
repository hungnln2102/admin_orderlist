/**
 * Re-export Telegram order notification từ module telegramOrderNotification (đã tách component).
 * Giữ tên file để không phá require() từ controllers, routes, scheduler.
 */

module.exports = require("./telegramOrderNotificationLib");
