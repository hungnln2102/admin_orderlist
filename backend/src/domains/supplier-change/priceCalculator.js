/**
 * Pure helpers tính giá nhập / hoàn theo số ngày còn lại khi đổi NCC.
 *
 * Không touch DB. Đầu vào là plain values; đầu ra số nguyên (đồng) đã
 * **làm tròn về bội số 1.000 VND** — đồng nhất với cách frontend hiển thị
 * tiền (`formatCurrency` ở `frontend/src/shared/utils/money.ts` cũng dùng
 * `roundGiaBanValue` = `Math.round(n / 1000) * 1000`).
 *
 * Lý do làm tròn ngay tại nguồn (thay vì chỉ làm tròn ở chỗ hiển thị):
 *   - `order.cost` lưu DB = giá trị này → trigger
 *     `fn_recalc_dashboard_total_import` cộng đúng bội số 1.000 vào
 *     `dashboard.dashboard_monthly_summary.total_import`.
 *   - Notification "BIẾN ĐỘNG THÁNG" (`telegramFinanceDeltaNotifier`) lấy
 *     delta từ snapshot tháng → cũng là bội số 1.000.
 *   - Frontend `SupplyOrderCostsPanel` hiển thị `formatCurrency(row.cost)`
 *     → idempotent, không đổi giá trị nữa.
 *   ⇒ 4 chỗ (DB, dashboard, Telegram, UI) cùng số.
 *
 * Quy ước:
 * - `totalDays`: tổng số ngày của đơn (order.days).
 * - `remainingDays`: số ngày còn lại của đơn (so_ngay_con_lai).
 * - Nếu totalDays/remainingDays không hợp lệ → trả 0 (không prorate được).
 */

const toFinitePositive = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const toNonNegative = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Đơn vị làm tròn (VND). Khớp `roundGiaBanValue` ở frontend. */
const PRICE_ROUND_UNIT = 1000;

/**
 * Làm tròn về bội số `PRICE_ROUND_UNIT` (1.000 VND), nửa lên.
 * @param {number} amount giá trị thô (đã là số hữu hạn, không âm).
 */
const roundToThousands = (amount) =>
  Math.round(amount / PRICE_ROUND_UNIT) * PRICE_ROUND_UNIT;

/**
 * Giá nhập NCC mới = full_price × (remaining / total), làm tròn về bội số
 * 1.000 VND để khớp UI/Dashboard/Telegram.
 * @param {{ fullPrice: number, totalDays: number, remainingDays: number }} args
 * @returns {number} VND nguyên, bội số 1.000.
 */
function computeProratedCostForNewSupplier({ fullPrice, totalDays, remainingDays }) {
  const price = toFinitePositive(fullPrice);
  const total = toFinitePositive(totalDays);
  const remaining = toNonNegative(remainingDays);
  if (price === 0 || total === 0 || remaining === 0) return 0;
  const effectiveRemaining = Math.min(remaining, total);
  return roundToThousands((price * effectiveRemaining) / total);
}

/**
 * Số tiền NCC CŨ cần hoàn = oldImportCost × (remaining / total), làm tròn
 * về bội số 1.000 VND (cùng convention với cost).
 * Dùng khi đơn đã chạy được "elapsed" ngày, NCC cũ chỉ phục vụ phần "elapsed",
 * phần "remaining" chưa phục vụ → hoàn lại.
 *
 * @param {{ oldImportCost: number, totalDays: number, remainingDays: number }} args
 * @returns {number}
 */
function computeRefundFromOldSupplier({ oldImportCost, totalDays, remainingDays }) {
  const cost = toFinitePositive(oldImportCost);
  const total = toFinitePositive(totalDays);
  const remaining = toNonNegative(remainingDays);
  if (cost === 0 || total === 0 || remaining === 0) return 0;
  const effectiveRemaining = Math.min(remaining, total);
  return roundToThousands((cost * effectiveRemaining) / total);
}

/**
 * Tính tuổi đơn theo ngày (today - order_date), tính bằng UTC YMD floor.
 * - Trả null nếu input không hợp lệ.
 * - Cùng ngày → 0; ngày kế tiếp → 1.
 *
 * @param {string|Date|null|undefined} orderDate
 * @param {string|Date|null|undefined} todayDate
 * @returns {number|null}
 */
function computeOrderAgeDays(orderDate, todayDate) {
  const toYmd = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, "0");
      const d = String(value.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(value).trim();
    const ymd = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    const dmy = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    return null;
  };

  const aYmd = toYmd(orderDate);
  const bYmd = toYmd(todayDate);
  if (!aYmd || !bYmd) return null;
  const [ay, am, ad] = aYmd.split("-").map(Number);
  const [by, bm, bd] = bYmd.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

/** Mốc phân nhánh Flow A vs Flow B (≤5 ngày là Flow A). */
const FLOW_A_AGE_THRESHOLD_DAYS = 5;

/**
 * @param {number|null} ageDays
 * @returns {'A'|'B'} A = ≤5 ngày, B = >5 ngày.
 */
function classifyFlowByAge(ageDays) {
  if (!Number.isFinite(ageDays)) return "A";
  return ageDays <= FLOW_A_AGE_THRESHOLD_DAYS ? "A" : "B";
}

const isMavrykSupplierName = (name) =>
  String(name ?? "").trim().toLowerCase() === "mavryk";

module.exports = {
  computeProratedCostForNewSupplier,
  computeRefundFromOldSupplier,
  computeOrderAgeDays,
  classifyFlowByAge,
  isMavrykSupplierName,
  FLOW_A_AGE_THRESHOLD_DAYS,
  PRICE_ROUND_UNIT,
};
