const {
  normalizeImportValue,
  normalizeMoney,
  fetchProductPricing,
  fetchSupplyPrice,
  fetchMaxSupplyPrice,
} = require("./utils");
const { ORDER_COLS } = require("./config");
const {
  calculateOrderPricingFromResolvedValues,
  resolveMoney,
  normalizePromoRatio,
} = require("../../src/services/pricing/core");
const { ORDER_PREFIXES } = require("../../src/utils/orderHelpers");
const { getTiers, getPrefixMap } = require("../../src/services/pricing/tierCache");
const logger = require("../../src/utils/logger");

const calculateRenewalPricing = async (
  client,
  { sanPham, supplierId, orderCode, fallbackCost, fallbackPrice, forceKhachLe }
) => {
  const { productId, variantId, pctCtv, pctKhach, pctPromo, pctStu } =
    await fetchProductPricing(client, sanPham);
  const giaNhapSource = await fetchSupplyPrice(
    client,
    { variantId, productId },
    supplierId
  );
  const maxPriceRow = await fetchMaxSupplyPrice(client, { variantId, productId });

  const normalizedNhap = normalizeImportValue(giaNhapSource, fallbackCost || undefined);
  const latestGiaNhap = resolveMoney(
    normalizedNhap?.value,
    giaNhapSource,
    fallbackCost
  );

  const normalizedPriceMax = normalizeImportValue(
    maxPriceRow,
    latestGiaNhap || fallbackCost || undefined
  );
  const priceMax = resolveMoney(
    normalizedPriceMax?.value,
    maxPriceRow,
    fallbackPrice,
    latestGiaNhap
  );
  const effectivePriceMax = resolveMoney(priceMax, fallbackPrice, latestGiaNhap);

  let tiers, prefixMap;
  try {
    [tiers, prefixMap] = await Promise.all([getTiers(), getPrefixMap()]);
  } catch {
    tiers = null;
    prefixMap = null;
  }

  const pricing = calculateOrderPricingFromResolvedValues({
    orderId: orderCode,
    pricingBase: effectivePriceMax,
    importPrice: latestGiaNhap,
    fallbackPrice,
    fallbackCost,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    forceKhachLe,
    roundCostToThousands: false,
    _tiers: tiers,
    _prefixMap: prefixMap,
  });

  return {
    pricing,
    productId,
    variantId,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    giaNhapSource,
    maxPriceRow,
    normalizedNhap,
    normalizedPriceMax,
    effectivePriceMax,
  };
};

/**
 * Tính lại giá bán và giá nhập theo giá hiện tại (product/supplier cost).
 * Dùng trước khi gửi thông báo Telegram "đơn cần gia hạn" để caption và QR dùng đúng giá mới.
 * Không ghi DB.
 * @param {object} client - pg client (từ pool.connect())
 * @param {object} orderRow - 1 row đơn hàng (có id_product, supply, cost, price)
 * @returns {{ price: number, cost: number }} - Giá bán và giá nhập đã tính (fallback về giá cũ nếu lỗi)
 */
const computeOrderCurrentPrice = async (client, orderRow) => {
  const fallbackPrice = normalizeMoney(orderRow?.[ORDER_COLS.price] ?? 0);
  const fallbackCost = normalizeMoney(orderRow?.[ORDER_COLS.cost] ?? 0);

  try {
    const sanPham = orderRow?.[ORDER_COLS.idProduct];
    const idSupplyRaw = orderRow?.[ORDER_COLS.idSupply];
    const supplierId = idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
      ? Number(idSupplyRaw) : null;
    const giaNhapCu = normalizeMoney(orderRow?.[ORDER_COLS.cost]);
    const giaBanCu = normalizeMoney(orderRow?.[ORDER_COLS.price]);

    if (!sanPham) {
      return { price: fallbackPrice, cost: fallbackCost };
    }

    const orderCode = String(orderRow?.[ORDER_COLS.idOrder] || "");
    let { pricing, pctCtv, pctKhach, pctPromo } = await calculateRenewalPricing(client, {
      sanPham,
      supplierId,
      orderCode,
      fallbackCost: giaNhapCu,
      fallbackPrice: giaBanCu,
      forceKhachLe: false,
    });

    const promoPrefix = String(ORDER_PREFIXES?.promo || "MAVK").toUpperCase();
    const isMavk = promoPrefix && orderCode.toUpperCase().startsWith(promoPrefix);
    const promoRatio = normalizePromoRatio(pctPromo);
    if (isMavk && promoRatio <= 0) {
      const khachLe = await calculateRenewalPricing(client, {
        sanPham,
        supplierId,
        orderCode,
        fallbackCost: giaNhapCu,
        fallbackPrice: giaBanCu,
        forceKhachLe: true,
      });
      pricing = khachLe.pricing;
      pctCtv = khachLe.pctCtv;
      pctKhach = khachLe.pctKhach;
    }

    const marginsLookValid = (pctCtv != null && pctCtv > 0 && pctCtv < 1) ||
                              (pctKhach != null && pctKhach > 0 && pctKhach < 1);

    if (!marginsLookValid && fallbackPrice > 0) {
      logger.warn("[Renewal] computeOrderCurrentPrice: margins missing/invalid, using stored price", {
        orderCode, pctCtv, pctKhach, computedPrice: pricing.price, storedPrice: fallbackPrice,
      });
      return { price: fallbackPrice, cost: pricing.cost > 0 ? pricing.cost : fallbackCost };
    }

    return { price: pricing.price, cost: pricing.cost };
    /* legacy pricing path removed
    const maxPriceRow = await fetchMaxSupplyPrice(client, { variantId, productId });

    const normalizedNhap = normalizeImportValue(giaNhapSource, giaNhapCu || undefined);
    const latestGiaNhap = resolveMoney(normalizedNhap?.value, giaNhapSource, giaNhapCu);

    const normalizedPriceMax = normalizeImportValue(
      maxPriceRow,
      latestGiaNhap || giaNhapCu || undefined
    );
    const priceMax = resolveMoney(
      normalizedPriceMax?.value,
      maxPriceRow,
      giaBanCu,
      latestGiaNhap
    );
    const effectivePriceMax = resolveMoney(priceMax, giaBanCu, latestGiaNhap);

    // Gói khuyến mãi (MAVK) hết hạn → thông báo theo giá khách lẻ
    const idOrderForPrice = String(orderRow?.[ORDER_COLS.idOrder] || "");
    const isPromoOrderForPrice =
      Boolean(ORDER_PREFIXES?.promo) &&
      idOrderForPrice.toUpperCase().startsWith(ORDER_PREFIXES.promo.toUpperCase());
    const finalGiaBanRaw = calcGiaBan({
      orderId: idOrderForPrice,
      giaNhap: latestGiaNhap,
      priceMax: effectivePriceMax,
      pctCtv,
      pctKhach,
      giaBanFallback: giaBanCu,
      forceKhachLe: isPromoOrderForPrice,
    });

    const finalGiaNhap = resolveMoney(latestGiaNhap, giaNhapCu);
    const finalGiaBan = resolveMoney(
      roundToThousands(finalGiaBanRaw || 0),
      effectivePriceMax,
      giaBanCu,
      latestGiaNhap
    );

    */
  } catch (err) {
    logger.warn("[Renewal] computeOrderCurrentPrice failed, using stored price", {
      orderCode: orderRow?.[ORDER_COLS.idOrder],
      error: err?.message,
    });
    return { price: fallbackPrice, cost: fallbackCost };
  }
};

module.exports = {
  calculateRenewalPricing,
  computeOrderCurrentPrice,
};
