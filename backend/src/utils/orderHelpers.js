/**
 * Shared helpers for orders: prefixes, date/duration, rounding.
 * Used by Order controller, Dashboard, webhook/sepay.
 */

const { getPrefixMap } = require("../services/pricing/tierCache");

/**
 * Hardcode fallback — dùng khi tierCache chưa load xong (module init time).
 * Sau khi DB sẵn sàng, tất cả callers nên dùng getPrefixMap() async.
 */
const ORDER_PREFIXES = {
  ctv: "MAVC",
  customer: "MAVL",
  promo: "MAVK",
  gift: "MAVT",
  import: "MAVN",
  student: "MAVS",
};

/**
 * Async version — đọc từ DB pricing_tier (cached 10 phút).
 * Caller nên dùng hàm này thay vì ORDER_PREFIXES trực tiếp.
 */
async function getOrderPrefixes() {
  try {
    return await getPrefixMap();
  } catch {
    return ORDER_PREFIXES;
  }
}

function monthsFromString(text) {
  if (!text || typeof text !== "string") return 0;
  const m = text.match(/--(\d+)m/i);
  return m ? Number(m[1] || 0) : 0;
}

function daysFromMonths(months) {
  if (!Number.isFinite(months) || months <= 0) return 0;
  if (months === 12) return 365;
  if (months === 24) return 730;
  return months * 30;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function roundGiaBanValue(value) {
  const numeric = toFiniteNumber(value);
  if (numeric >= 0) {
    return Math.floor(numeric + 0.5);
  }
  return -Math.floor(Math.abs(numeric) + 0.5);
}

function convertDMYToYMD(dmyString) {
  if (
    !dmyString ||
    typeof dmyString !== "string" ||
    dmyString.length < 10 ||
    dmyString.indexOf("/") === -1
  ) {
    return dmyString;
  }
  const parts = dmyString.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dmyString;
}

function calculatePeriods() {
  const resolveTimezone = () => {
    const candidate = process.env.APP_TIMEZONE;
    if (
      typeof candidate === "string" &&
      candidate &&
      /^[A-Za-z0-9_\/+-]+$/.test(candidate)
    ) {
      return candidate;
    }
    return "Asia/Ho_Chi_Minh";
  };

  const getDatePartsInTimezone = (date, timeZone) => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const year = Number(parts.find((p) => p.type === "year")?.value);
      const month = Number(parts.find((p) => p.type === "month")?.value);
      const day = Number(parts.find((p) => p.type === "day")?.value);
      if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
      ) {
        return null;
      }
      return { year, month, day };
    } catch {
      return null;
    }
  };

  const now = new Date();
  if (process.env.MOCK_DATE) {
    const mockDate = new Date(process.env.MOCK_DATE);
    if (!isNaN(mockDate)) {
      now.setTime(mockDate.getTime());
    }
  }

  const tz = resolveTimezone();
  const tzParts = getDatePartsInTimezone(now, tz);
  const currentYear = tzParts?.year ?? now.getFullYear();
  const currentMonth = tzParts?.month ?? now.getMonth() + 1;
  const currentDay = tzParts?.day ?? now.getDate();

  const formatDate = (year, month, day) => {
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonthLastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const prevEndDay = Math.min(currentDay, prevMonthLastDay);

  return {
    currentStart: formatDate(currentYear, currentMonth, 1),
    currentEnd: formatDate(currentYear, currentMonth, currentDay),
    previousStart: formatDate(prevYear, prevMonth, 1),
    previousEnd: formatDate(prevYear, prevMonth, prevEndDay),
  };
}

/** NCC tên Mavryk hoặc Shop — cửa hàng nội bộ, không cộng/trừ payment_supply. */
function isMavrykShopSupplierName(name) {
  const raw = String(name ?? "").trim().toLowerCase();
  return raw === "mavryk" || raw === "shop";
}

/**
 * Khớp `partner.fn_supplier_order_cost_log_on_success` (v_is_mavryk): chỉ
 * `LOWER(TRIM(supplier_name)) = 'mavryk'`. Tên `'shop'` **không** vào nhánh này trên DB —
 * vẫn INSERT log khi Đã TT; app không được cộng `importDelta` thêm.
 */
function isMavrykSupplierStrictForNccLog(name) {
  return String(name ?? "").trim().toLowerCase() === "mavryk";
}

/** Đơn mã MAVN (nhập hàng). */
function isMavnImportOrder(row) {
  const prefix = String(ORDER_PREFIXES.import || "MAVN").toUpperCase();
  const code = String(row?.id_order ?? row?.idOrder ?? "").trim().toUpperCase();
  return Boolean(prefix && code.startsWith(prefix));
}

/** Đơn quà tặng (MAVT): giá bán = 0, vào thẳng Đang xử lý + cộng nhập NCC khi tạo. */
function isGiftOrder(row) {
  const prefix = String(ORDER_PREFIXES.gift || "MAVT").toUpperCase();
  const code = String(row?.id_order ?? row?.idOrder ?? "").trim().toUpperCase();
  return Boolean(prefix && code.startsWith(prefix));
}

/** Đơn tính doanh thu + số đơn dashboard: MAVC, MAVL, MAVK, MAVS (prefix theo tier). */
function isDashboardSalesOrder(row) {
  const prefixes = [
    String(ORDER_PREFIXES.ctv || "MAVC").toUpperCase(),
    String(ORDER_PREFIXES.customer || "MAVL").toUpperCase(),
    String(ORDER_PREFIXES.promo || "MAVK").toUpperCase(),
    String(ORDER_PREFIXES.student || "MAVS").toUpperCase(),
  ];
  const code = String(row?.id_order ?? row?.idOrder ?? "").trim().toUpperCase();
  return prefixes.some((p) => p && code.startsWith(p));
}

module.exports = {
  ORDER_PREFIXES,
  getOrderPrefixes,
  monthsFromString,
  daysFromMonths,
  roundGiaBanValue,
  convertDMYToYMD,
  calculatePeriods,
  isMavnImportOrder,
  isGiftOrder,
  isDashboardSalesOrder,
  isMavrykShopSupplierName,
  isMavrykSupplierStrictForNccLog,
};
