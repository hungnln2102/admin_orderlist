/**
 * time.js
 * Tiện ích chuẩn hóa thời gian cố định theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
 */

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo giờ Việt Nam (UTC+7)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
function getVietnamDateString(date = new Date()) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString("en-CA", { timeZone: VIETNAM_TZ });
  }
  return d.toLocaleDateString("en-CA", { timeZone: VIETNAM_TZ });
}

/**
 * Lấy chuỗi tháng YYYY-MM theo giờ Việt Nam (UTC+7)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM
 */
function getVietnamMonthString(date = new Date()) {
  const dateStr = getVietnamDateString(date);
  return dateStr.slice(0, 7);
}

/**
 * Lấy chuỗi ngày giờ đầy đủ YYYY-MM-DD HH:mm:ss theo giờ Việt Nam (UTC+7)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD HH:mm:ss
 */
function getVietnamDateTimeString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

/**
 * Cộng ngày hết hạn theo giờ Việt Nam
 * @param {Date|string|null} currentExpiry - Ngày hết hạn hiện tại
 * @param {number} daysToAdd - Số ngày cộng thêm
 * @returns {string} Ngày hết hạn mới dạng YYYY-MM-DD
 */
function addDaysVietnam(currentExpiry, daysToAdd = 30) {
  const days = Number(daysToAdd) || 0;
  const todayStr = getVietnamDateString(new Date());

  let baseDateStr = todayStr;
  if (currentExpiry) {
    const expiryStr = getVietnamDateString(currentExpiry);
    // Nếu hạn dùng cũ còn trong tương lai (> hôm nay) thì cộng tiếp từ ngày hết hạn cũ
    if (expiryStr > todayStr) {
      baseDateStr = expiryStr;
    }
  }

  const [y, m, d] = baseDateStr.split("-").map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return baseDate.toISOString().slice(0, 10);
}

module.exports = {
  VIETNAM_TZ,
  getVietnamDateString,
  getVietnamMonthString,
  getVietnamDateTimeString,
  addDaysVietnam,
};
