const { ORDERS_SCHEMA } = require("@/config/dbSchema");
const { VALID_PREFIXES } = require("@/services/orderCodeService");
const { ORDER_PREFIXES } = require("@/utils/orderHelpers");
const { STATUS, COLS } = require("@/domains/orders/controller/constants");
const {
  sanitizeOrderWritePayload,
  normalizeTextInput,
} = require("@/domains/orders/controller/helpers");
const { normalizeMoney } = require("@/domains/orders/controller/finance/refundCredits");
const { ensureSupplierRecord, findSupplierById } = require("@/domains/supplies/services/supplierLookupService");
const { isMavrykShopSupplierName } = require("@/utils/orderHelpers");
const {
  ensureVariantRecord,
  resolveProductToVariantId,
} = require("@/domains/products/services/productVariantService");

const buildCreateOrderRequestContext = (body = {}) => {
  const payload = sanitizeOrderWritePayload(body);
  delete payload.id;

  const reservedOrderCodeRaw = String(body?.reserved_order_code || "")
    .trim()
    .toUpperCase();
  const requestedPrefixFromReserved =
    VALID_PREFIXES.find((prefix) => reservedOrderCodeRaw.startsWith(prefix)) || null;
  const provisionalIdOrder = String(
    payload[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER] || ""
  )
    .trim()
    .toUpperCase();
  const requestedPrefixFromClient =
    VALID_PREFIXES.find((prefix) => provisionalIdOrder.startsWith(prefix)) || null;
  const effectivePrefix = requestedPrefixFromReserved || requestedPrefixFromClient || "MAVC";
  const giftPrefix = String(ORDER_PREFIXES.gift || "MAVT").toUpperCase();
  const importPrefix = String(ORDER_PREFIXES.import || "MAVN").toUpperCase();

  return {
    payload,
    isEmptyPayload: Object.keys(payload).length === 0,
    requestedCreditNoteId: Number(body?.refund_credit_note_id),
    requestedCreditApplyAmount: normalizeMoney(body?.refund_credit_apply_amount),
    requestedCreditSourceOrderCode: String(body?.refund_credit_source_order_code || "").trim(),
    requestedCreditCode: String(body?.refund_credit_code || "").trim(),
    reservedOrderCodeRaw,
    requestedPrefixFromReserved,
    requestedPaymentMethod: String(body?.payment_method || "bank").trim().toLowerCase(),
    effectivePrefix,
    isGiftOrderCreate: effectivePrefix === giftPrefix,
    isMavnCreate: effectivePrefix === importPrefix,
  };
};

const prepareCreateOrderPayload = async ({ body = {}, context }) => {
  const ctx = context || buildCreateOrderRequestContext(body);
  const { payload } = ctx;
  const cols = ORDERS_SCHEMA.ORDER_LIST.COLS;
  const supplyIdCol = cols.ID_SUPPLY;
  const productIdCol = cols.ID_PRODUCT;
  const priceCol = cols.PRICE;
  const costCol = cols.COST;

  if (payload[productIdCol] == null && body?.variant_id != null) {
    const numericVariant = Number(body.variant_id);
    if (Number.isFinite(numericVariant) && numericVariant > 0) {
      payload[productIdCol] = numericVariant;
    }
  }

  const rawSupplyName = body?.supply ?? payload.supply;
  if (rawSupplyName != null && rawSupplyName !== "") {
    const name = normalizeTextInput(String(rawSupplyName));
    if (name) {
      payload[supplyIdCol] = await ensureSupplierRecord(name);
    }
    delete payload.supply;
  } else if (
    body?.id_supply != null ||
    body?.supply_id != null ||
    payload.id_supply != null ||
    payload.supply_id != null
  ) {
    payload[supplyIdCol] =
      Number(body?.id_supply ?? body?.supply_id ?? payload.id_supply ?? payload.supply_id) || null;
  }

  const rawProduct = payload[productIdCol];
  if (rawProduct != null) {
    const variantId = await resolveProductToVariantId(rawProduct);
    if (variantId != null) {
      payload[productIdCol] = variantId;
    } else if (typeof rawProduct === "string") {
      const trimmed = rawProduct.trim();
      payload[productIdCol] = trimmed ? await ensureVariantRecord(trimmed) : null;
    } else {
      payload[productIdCol] = Number(rawProduct) || null;
    }
  }

  let isInternalSupplier = false;
  if (payload[supplyIdCol] != null) {
    const supRow = await findSupplierById(payload[supplyIdCol]);
    isInternalSupplier = isMavrykShopSupplierName(supRow?.[COLS.SUPPLIER.SUPPLIER_NAME]);
  }

  if (ctx.isMavnCreate) {
    payload[priceCol] = 0;
  }
  if (ctx.isGiftOrderCreate) {
    payload[priceCol] = 0;
  }
  payload.status = ctx.isGiftOrderCreate || ctx.isMavnCreate ? STATUS.PAID : STATUS.UNPAID;

  return { ...ctx, payload, isInternalSupplier };
};

module.exports = {
  buildCreateOrderRequestContext,
  prepareCreateOrderPayload,
};
