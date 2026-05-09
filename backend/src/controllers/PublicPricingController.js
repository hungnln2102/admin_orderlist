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

  return {
    ctvPrice: toFiniteNumber(raw.ctvPrice ?? raw.ctv_price ?? raw.resellPrice ?? raw.resell_price),
    retailPrice: toFiniteNumber(
      raw.retailPrice ??
      raw.retail_price ??
      raw.customerPrice ??
      raw.customer_price ??
      raw.price
    ),
    promoPrice: toFiniteNumber(raw.promoPrice ?? raw.promo_price),
    cost: toFiniteNumber(raw.cost ?? raw.importPrice ?? raw.import_price),
    totalPrice: toFiniteNumber(raw.totalPrice ?? raw.total_price ?? raw.price),
  };
}

function mapResult(r) {
  const retail = r.retailPrice > 0 ? r.retailPrice : r.totalPrice;
  const promo = r.promoPrice > 0 ? r.promoPrice : retail;
  const ctv = r.ctvPrice > 0 ? r.ctvPrice : retail;
  const total = r.totalPrice > 0 ? r.totalPrice : retail;
  return {
    ctvPrice: ctv,
    retailPrice: retail,
    promoPrice: promo,
    cost: r.cost,
    totalPrice: total,
  };
}

/**
 * POST /api/public/pricing/calculate
 * Body: { items: [ { retailPrice, promoPrice?, ctvPrice?, cost? } ] }
 * Or single row without `items`.
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
        return mapResult(item);
      });

      return res.json({ ok: true, results });
    }

    const item = normalizeItem(body, 0);

    return res.json({ ok: true, result: mapResult(item) });
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
