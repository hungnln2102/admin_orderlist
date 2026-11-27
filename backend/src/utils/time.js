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

function formatDateDisplay(dateVal) {
  if (!dateVal) return "";
  const ymd = getVietnamDateString(dateVal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return String(dateVal);
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Chuẩn hóa giá trị đầu vào thành chuỗi ngày thuần YYYY-MM-DD theo giờ Việt Nam (UTC+7).
 * Trả về null nếu rỗng hoặc không hợp lệ.
 */
function normalizeDateOnly(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: VIETNAM_TZ });
}

/**
 * Tính số ngày còn lại (>= 0) giữa ngày hết hạn và ngày tham chiếu theo lịch Việt Nam (YYYY-MM-DD).
 */
function calculateRemainingDaysVietnam(expiredAt, referenceDate = new Date()) {
  const expStr = normalizeDateOnly(expiredAt);
  if (!expStr) return 0;
  const todayStr = getVietnamDateString(referenceDate);
  const [ey, em, ed] = expStr.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const expUtc = Date.UTC(ey, em - 1, ed);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.floor((expUtc - todayUtc) / (1000 * 60 * 60 * 24)));
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
  formatDateDisplay,
  normalizeDateOnly,
  calculateRemainingDaysVietnam,
  addDaysVietnam,
};
