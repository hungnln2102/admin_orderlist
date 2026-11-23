const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const { ORDER_STATUS } = require("@/constants/orderStatus");

const O = COLS.ORDER_LIST;
const R = COLS.PORTAL_SLOT_ROUTING_RULES;
const K = COLS.ACTIVATION_KEYS;

function adobeOrderRules({ variantId, supplierId }, connection) {
  return connection(TABLES.PORTAL_SLOT_ROUTING_RULES)
    .where({ [R.VARIANT_ID]: Number(variantId), [R.SUPPLIER_ID]: Number(supplierId), [R.IS_ACTIVE]: true });
}

async function findAdobeStatusProvider({ variantId, supplierId }, connection = db) {
  if (!Number(variantId) || !Number(supplierId)) return null;
  const rule = await adobeOrderRules({ variantId, supplierId }, connection)
    .where({ [R.SLOT_KEY]: "adobe_check", [R.PROVIDER_KEY]: "fix_ades_status" })
    .first(R.PROVIDER_KEY);
  return rule?.[R.PROVIDER_KEY] || null;
}

async function findDirectAdobeSource({ variantId, supplierId }, connection = db) {
  if (!Number(variantId) || !Number(supplierId)) return null;
  const rules = await adobeOrderRules({ variantId, supplierId }, connection)
    .whereIn([R.SLOT_KEY, R.PROVIDER_KEY], [
      ["adobe_account", "yuna_2fa"],
      ["adobe_check", "fix_ades_status"],
    ])
    .select(R.SLOT_KEY);
  const sources = new Set(rules.map((rule) => rule[R.SLOT_KEY] === "adobe_account" ? "yuna" : "ades"));
  if (sources.size > 1) throw new Error("Đơn có nhiều cấu hình nguồn Adobe.");
  return sources.values().next().value || null;
}

async function resolveAdobeRecoveryOrder({ code, contact }) {
  const input = String(code || "").trim();
  if (!input) return null;
  const normalized = input.toLowerCase();
  const internalKey = await db(TABLES.ACTIVATION_KEYS)
    .whereRaw("LOWER(BTRIM(??)) = ?", [K.KEY_CODE, normalized]).first(K.ID);
  if (internalKey) return null;

  const orders = await db(TABLES.ORDER_LIST)
    .whereIn(O.STATUS, [ORDER_STATUS.PAID, ORDER_STATUS.RENEW_REQUIRED])
    .where(O.EXPIRED_AT, ">", db.fn.now())
    .where((query) => query
      .whereRaw("LOWER(BTRIM(??)) = ?", [O.ID_ORDER, normalized])
      .orWhereRaw("BTRIM(??) = ?", [O.INFORMATION_ORDER, input])
      .orWhereRaw("LOWER(BTRIM(??)) = ?", [O.INFORMATION_ORDER, normalized]))
    .select(O.ID_ORDER, O.ID_PRODUCT, O.SUPPLY_ID, O.INFORMATION_ORDER, O.CONTACT)
    .limit(2);
  if (orders.length > 1) throw new Error("Có nhiều đơn hàng khớp thông tin đã nhập.");
  const [order] = orders;
  if (!order) return null;
  const linkedInternalKey = await db(TABLES.ACTIVATION_KEYS)
    .where(K.ID_ORDER, order[O.ID_ORDER]).first(K.ID);
  if (linkedInternalKey) return null;
  const source = await findDirectAdobeSource({
    variantId: order[O.ID_PRODUCT], supplierId: order[O.SUPPLY_ID],
  });
  if (!source) return null;

  const providerInput = String(order[O.INFORMATION_ORDER] || "").trim();
  if (source === "ades" || providerInput !== input) {
    const providedContact = String(contact || "").trim().toLowerCase();
    if (!providedContact) return { contactRequired: true };
    if (providedContact !== String(order[O.CONTACT] || "").trim().toLowerCase()) {
      throw new Error("Không xác minh được quyền sử dụng tài khoản.");
    }
  }
  if (!providerInput || (source === "ades" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerInput))) {
    throw new Error("Thiếu thông tin tài khoản Adobe trên đơn.");
  }
  return { source, providerKey: source === "yuna" ? "yuna_2fa" : "fix_ades_status", providerInput };
}

module.exports = { findAdobeStatusProvider, findDirectAdobeSource, resolveAdobeRecoveryOrder };
