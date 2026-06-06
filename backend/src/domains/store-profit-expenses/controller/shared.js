const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const {
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  tableName,
} = require("../../../config/dbSchema");
const { normalizeTextInput } = require("../../../utils/normalizers");
const { STATUS } = require("../../../utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("../../../utils/orderHelpers");
const {
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
} = require("../../orders/controller/finance/dashboardSummary");
const {
  storeProfitExpensesHasMavnColumns,
} = require("../../orders/controller/finance/storeProfitExpensesHasMavnColumns");

const TABLE = tableName(FINANCE_SCHEMA.com_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.com_PROFIT_EXPENSES.COLS;
const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const SUPPLIER_COLS = PARTNER_SCHEMA.SUPPLIER.COLS;
const VN_DATE_FROM_CREATED_AT_SQL =
  "to_char((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD')";

const ALLOWED_EXPENSE_TYPES = new Set([
  "withdraw_profit",
  "external_import",
  "mavn_import",
]);

const MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED = "MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED";

const normalizeExpenseType = (value) => {
  const normalized = normalizeTextInput(value || "").toLowerCase();
  if (ALLOWED_EXPENSE_TYPES.has(normalized)) {
    return normalized;
  }
  return "";
};

const normalizeExpenseTypeList = (value) => {
  if (value === undefined || value === null) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => ALLOWED_EXPENSE_TYPES.has(part));
};

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeExpenseMetaInput = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return value;
};

const ensureNotDuplicateMavnInternalExternalImport = async (trx, linkedOrderCode) => {
  const normalizedCode = String(linkedOrderCode || "").trim().toUpperCase();
  if (!normalizedCode) return;

  const order = await trx(`${ORDER_TABLE} as o`)
    .leftJoin(
      `${SUPPLIER_TABLE} as s`,
      "o." + ORDER_COLS.ID_SUPPLY,
      "s." + SUPPLIER_COLS.ID
    )
    .select(
      `o.${ORDER_COLS.ID_ORDER} as id_order`,
      `o.${ORDER_COLS.STATUS} as status`,
      `s.${SUPPLIER_COLS.SUPPLIER_NAME} as supplier_name`
    )
    .whereRaw(`UPPER(TRIM(COALESCE(o.${ORDER_COLS.ID_ORDER}::text, ''))) = ?`, [
      normalizedCode,
    ])
    .first();

  if (!order) return;
  if (!isMavnImportOrder(order)) return;
  if (String(order.status || "").trim() !== STATUS.PAID) return;
  if (!isMavrykShopSupplierName(order.supplier_name)) return;

  const existing = await trx(TABLE)
    .select(COLS.ID)
    .where(COLS.LINKED_ORDER_CODE, normalizedCode)
    .whereIn(COLS.EXPENSE_TYPE, ["external_import", "mavn_import"])
    .first();
  if (!existing) return;

  const err = new Error("Đơn MAVN NCC nội bộ đã có log linked; chặn tạo log trùng.");
  err.code = MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED;
  throw err;
};

const mapExpenseRow = (row) => {
  const meta =
    row.expense_meta && typeof row.expense_meta === "object" ? row.expense_meta : null;
  const traceCode = meta && typeof meta.trace_code === "string" ? meta.trace_code : "";
  return {
    id: Number(row.id),
    amount: parseAmount(row.amount),
    reason: row.reason || "",
    expenseDate: row.expense_date || null,
    expenseType: row.expense_type || "",
    linkedOrderCode: row.linked_order_code ?? null,
    expenseMeta: meta,
    traceCode: traceCode || null,
    createdAt: row.created_at || null,
  };
};

module.exports = {
  db,
  logger,
  STATUS,
  TABLE,
  COLS,
  VN_DATE_FROM_CREATED_AT_SQL,
  normalizeTextInput,
  normalizeExpenseType,
  normalizeExpenseTypeList,
  parseAmount,
  normalizeExpenseMetaInput,
  ensureNotDuplicateMavnInternalExternalImport,
  mapExpenseRow,
  storeProfitExpensesHasMavnColumns,
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
  MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED,
};
