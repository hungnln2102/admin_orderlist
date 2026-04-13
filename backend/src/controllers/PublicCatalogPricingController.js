const { db } = require("../db");
const {
  calculateOrderPricingFromResolvedValues,
  roundToThousands,
} = require("../services/pricing/core");
const {
  TABLES,
  variantCols,
  supplyPriceCols,
  MARGIN_PIVOT_SQL,
} = require("./ProductsController/constants");
const { quoteIdent } = require("../utils/sql");

const MAX_IDS = 500;

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * POST /api/public/pricing/variants
 * Body: { variantIds: number[] } — results[i] matches variantIds[i] (null if missing).
 */
async function postVariantsPricing(req, res, next) {
  try {
    const raw = req.body?.variantIds ?? req.body?.variant_ids;
    if (!Array.isArray(raw)) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "variantIds must be an array",
      });
    }

    const orderedIds = raw
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (orderedIds.length > MAX_IDS) {
      return res.status(400).json({
        error: "BATCH_TOO_LARGE",
        message: `Maximum ${MAX_IDS} variant IDs`,
      });
    }

    if (orderedIds.length === 0) {
      return res.json({ ok: true, results: [] });
    }

    const ids = [...new Set(orderedIds)];
    const placeholders = ids.map(() => "?").join(", ");
    const vid = quoteIdent(variantCols.id);
    const spVid = quoteIdent(supplyPriceCols.variantId);
    const spPrice = quoteIdent(supplyPriceCols.price);

    const query = `
      SELECT
        v.${vid} AS id,
        COALESCE(margins.pct_ctv, 0) AS pct_ctv,
        COALESCE(margins.pct_khach, 0) AS pct_khach,
        margins.pct_promo AS pct_promo,
        margins.pct_stu AS pct_stu,
        COALESCE(spagg.max_supply_price, 0) AS max_supply_price
      FROM ${TABLES.variant} v
      LEFT JOIN LATERAL (${MARGIN_PIVOT_SQL}) margins ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(sp.${spPrice}) AS max_supply_price
        FROM ${TABLES.supplyPrice} sp
        WHERE sp.${spVid} = v.${vid}
      ) spagg ON TRUE
      WHERE v.${vid} IN (${placeholders})
    `;

    const result = await db.raw(query, ids);
    const rowById = new Map(
      (result.rows || []).map((row) => [Number(row.id), row]),
    );

    const computeOne = (id) => {
      const row = rowById.get(id);
      if (!row) return null;

      const pricingBase = toNum(row.max_supply_price);
      const pctCtv = toNum(row.pct_ctv);
      const pctKhach = toNum(row.pct_khach);
      const pctPromo = row.pct_promo == null ? null : toNum(row.pct_promo);
      const pctStu = row.pct_stu == null ? null : toNum(row.pct_stu);

      const r = calculateOrderPricingFromResolvedValues({
        pricingBase,
        importPrice: pricingBase,
        pctCtv,
        pctKhach,
        pctPromo,
        pctStu,
      });

      const costRounded = Math.max(0, roundToThousands(Math.round(pricingBase)));

      return {
        variantId: id,
        ctvPrice: r.resellPrice,
        retailPrice: r.customerPrice,
        promoPrice: r.promoPrice,
        studentPrice: r.meta?.studentPrice ?? r.customerPrice,
        cost: r.cost,
        costRounded,
      };
    };

    const results = orderedIds.map((id) => computeOne(id));

    return res.json({ ok: true, results });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  postVariantsPricing,
};
