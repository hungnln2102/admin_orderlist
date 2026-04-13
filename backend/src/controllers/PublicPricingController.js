const { calculateOrderPricingFromResolvedValues } = require("../services/pricing/core");

const MAX_BATCH = 200;

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItem(raw, index) {
  if (!raw || typeof raw !== "object") {
    const err = new Error(`Invalid item at index ${index}`);
    err.status = 400;
    throw err;
  }

  const pricingBase = toFiniteNumber(
    raw.pricingBase ?? raw.priceMax ?? raw.price_max,
    NaN,
  );
  if (!Number.isFinite(pricingBase) || pricingBase < 0) {
    const err = new Error(`Invalid pricingBase / priceMax at index ${index}`);
    err.status = 400;
    throw err;
  }

  const pctCtv = raw.pctCtv ?? raw.pct_ctv;
  const pctKhach = raw.pctKhach ?? raw.pct_khach;
  const pctPromo = raw.pctPromo ?? raw.pct_promo ?? null;
  const pctStu = raw.pctStu ?? raw.pct_stu ?? null;

  return {
    pricingBase,
    importPrice: raw.importPrice ?? raw.import_price,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    orderId: raw.orderId ?? raw.order_id ?? "",
    customerType: raw.customerType ?? raw.customer_type ?? "",
    forceKhachLe: Boolean(raw.forceKhachLe ?? raw.force_khach_le),
  };
}

function mapResult(r) {
  return {
    ctvPrice: r.resellPrice,
    retailPrice: r.customerPrice,
    promoPrice: r.promoPrice,
    cost: r.cost,
    totalPrice: r.totalPrice,
  };
}

/**
 * POST /api/public/pricing/calculate
 * Body: { items: [ { pricingBase|priceMax, pctCtv, pctKhach, pctPromo?, ... } ] }
 * Or single row: { pricingBase, pctCtv, pctKhach, ... } without `items`
 */
function postCalculate(req, res, next) {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (Array.isArray(body.items)) {
      if (body.items.length > MAX_BATCH) {
        return res.status(400).json({
          error: "BATCH_TOO_LARGE",
          message: `Maximum ${MAX_BATCH} items per request`,
        });
      }

      const results = body.items.map((raw, i) => {
        const item = normalizeItem(raw, i);
        const r = calculateOrderPricingFromResolvedValues({
          pricingBase: item.pricingBase,
          importPrice: item.importPrice,
          pctCtv: item.pctCtv,
          pctKhach: item.pctKhach,
          pctPromo: item.pctPromo,
          pctStu: item.pctStu,
          orderId: item.orderId,
          customerType: item.customerType,
          forceKhachLe: item.forceKhachLe,
        });
        return mapResult(r);
      });

      return res.json({ ok: true, results });
    }

    const item = normalizeItem(body, 0);
    const r = calculateOrderPricingFromResolvedValues({
      pricingBase: item.pricingBase,
      importPrice: item.importPrice,
      pctCtv: item.pctCtv,
      pctKhach: item.pctKhach,
      pctPromo: item.pctPromo,
      pctStu: item.pctStu,
      orderId: item.orderId,
      customerType: item.customerType,
      forceKhachLe: item.forceKhachLe,
    });

    return res.json({ ok: true, result: mapResult(r) });
  } catch (e) {
    if (e.status === 400) {
      return res.status(400).json({ error: "INVALID_INPUT", message: e.message });
    }
    return next(e);
  }
}

module.exports = {
  postCalculate,
};
