const { STATUS } = require("../../../utils/statuses");

const TZ = "Asia/Ho_Chi_Minh";
/** Trùng backend listRoutes + taxApi (danh sách đơn lên form thuế). */
const TAX_ORDER_LIST_FROM_DEFAULT = "2026-04-22";
const IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT = 30;

const orderCountedStatuses = [
  STATUS.PROCESSING,
  STATUS.PAID,
  STATUS.PENDING_REFUND,
  STATUS.REFUNDED,
  STATUS.RENEWAL,
  STATUS.EXPIRED,
];
const refundCountedStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];

const toSqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;
const orderCountedSql = orderCountedStatuses.map(toSqlLiteral).join(", ");
const refundCountedSql = refundCountedStatuses.map(toSqlLiteral).join(", ");

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${s}`);
  }
  return `"${s}"`;
};

function vnTodayYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function defaultFrom22nd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);
  const day = Number(parts.find((p) => p.type === "day").value);
  if (day >= 22) {
    return `${y}-${String(m).padStart(2, "0")}-22`;
  }
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}-22`;
}

module.exports = {
  TZ,
  TAX_ORDER_LIST_FROM_DEFAULT,
  IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT,
  orderCountedSql,
  refundCountedSql,
  ident,
  defaultFrom22nd,
  vnTodayYmd,
  refundCountedStatuses,
};
