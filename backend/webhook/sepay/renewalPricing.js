const { normalizeMoney } = require("./utils");
const { ORDER_COLS } = require("./config");
const { ORDER_PREFIXES } = require("../../src/utils/orderHelpers");
const {
  PricingHttpError,
  calculateOrderPricing,
  fetchVariantPricing,
} = require("../../src/services/pricing/orderPricingService");
const logger = require("../../src/utils/logger");

const resolveRenewalOrderPricing = async ({
  sanPham,
  supplierId,
  orderCode,
  forceKhachLe = false,
}) => {
  const normalizedCode = String(orderCode || "").trim();
  const customerPrefix = String(ORDER_PREFIXES?.customer || "MAVL").toUpperCase();

  return calculateOrderPricing({
    supplyId: supplierId,
    productKey: sanPham,
    orderId: normalizedCode,
    customerType: forceKhachLe ? customerPrefix : "",
  });
};

/** MAVK hết promo (không có giá tier promo) → gia hạn theo giá khách lẻ. */
const applyMavkKhachLeFallback = async ({
  sanPham,
  supplierId,
  orderCode,
  pricing,
}) => {
  const promoPrefix = String(ORDER_PREFIXES?.promo || "MAVK").toUpperCase();
  const code = String(orderCode || "").trim().toUpperCase();
  if (!promoPrefix || !code.startsWith(promoPrefix)) {
    return pricing;
  }

  const variantPricing = await fetchVariantPricing(sanPham);
  const promoPrice = Number(variantPricing?.tierPrices?.promo) || 0;
  if (promoPrice > 0) {
    return pricing;
  }

  return resolveRenewalOrderPricing({
    sanPham,
    supplierId,
    orderCode,
    forceKhachLe: true,
  });
};

const calculateRenewalPricing = async (
  client,
  { sanPham, supplierId, orderCode, fallbackCost, fallbackPrice, forceKhachLe }
) => {
  void client;

  let pricing = await resolveRenewalOrderPricing({
    sanPham,
    supplierId,
    orderCode,
    forceKhachLe,
  });

  if (!forceKhachLe) {
    pricing = await applyMavkKhachLeFallback({
      sanPham,
      supplierId,
      orderCode,
      pricing,
    });
  }

  const variantPricing = await fetchVariantPricing(sanPham);

  return {
    pricing,
    productId: variantPricing?.variantId ?? null,
    variantId: variantPricing?.variantId ?? null,
    pctCtv: null,
    pctKhach: null,
    pctPromo: null,
    pctStu: null,
    giaNhapSource: null,
    maxPriceRow: null,
    normalizedNhap: null,
    normalizedPriceMax: null,
    effectivePriceMax:
      normalizeMoney(pricing.price) || normalizeMoney(fallbackPrice),
  };
};

/**
 * Tính lại giá bán và giá nhập theo bảng giá hiện hành (tier price tuyệt đối).
 * Dùng trước khi gửi thông báo Telegram "đơn cần gia hạn" để caption và QR dùng đúng giá mới.
 * Không ghi DB.
 * @param {object} client - pg client (giữ signature; pricing dùng knex)
 * @param {object} orderRow - 1 row đơn hàng (có id_product, supply_id, cost, price)
 * @returns {{ price: number, cost: number }}
 */
const computeOrderCurrentPrice = async (client, orderRow) => {
  void client;

  const fallbackPrice = normalizeMoney(orderRow?.[ORDER_COLS.price] ?? 0);
  const fallbackCost = normalizeMoney(orderRow?.[ORDER_COLS.cost] ?? 0);
  const orderCode = String(orderRow?.[ORDER_COLS.idOrder] || "");

  try {
    const sanPham = orderRow?.[ORDER_COLS.idProduct];
    const idSupplyRaw = orderRow?.[ORDER_COLS.idSupply];
    const supplierId =
      idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
        ? Number(idSupplyRaw)
        : null;

    if (!sanPham) {
      return { price: fallbackPrice, cost: fallbackCost };
    }

    let pricing = await resolveRenewalOrderPricing({
      sanPham,
      supplierId,
      orderCode,
    });
    pricing = await applyMavkKhachLeFallback({
      sanPham,
      supplierId,
      orderCode,
      pricing,
    });

    const price = normalizeMoney(pricing.price);
    const cost = normalizeMoney(pricing.cost);

    if (price > 0) {
      return { price, cost: cost > 0 ? cost : fallbackCost };
    }

    if (fallbackPrice > 0) {
      logger.warn(
        "[Renewal] computeOrderCurrentPrice: chưa resolve được giá tier, dùng giá lưu DB",
        { orderCode, storedPrice: fallbackPrice }
      );
      return { price: fallbackPrice, cost: cost > 0 ? cost : fallbackCost };
    }

    return { price: fallbackPrice, cost: fallbackCost };
  } catch (err) {
    const message =
      err instanceof PricingHttpError ? err.message : err?.message;
    logger.warn("[Renewal] computeOrderCurrentPrice failed, using stored price", {
      orderCode,
      error: message,
    });
    return { price: fallbackPrice, cost: fallbackCost };
  }
};

module.exports = {
  calculateRenewalPricing,
  computeOrderCurrentPrice,
};
