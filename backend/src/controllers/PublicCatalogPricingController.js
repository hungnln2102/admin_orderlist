const { db } = require("../db");
const { roundToThousands } = require("../services/pricing/core");
const {
  TABLES,
  variantCols,
  supplyPriceCols,
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
        MAX(CASE WHEN pt.key = 'ctv' THEN vp.price END) AS ctv_price,
        MAX(CASE WHEN pt.key = 'customer' THEN vp.price END) AS customer_price,
        MAX(CASE WHEN pt.key = 'promo' THEN vp.price END) AS promo_price,
        MAX(CASE WHEN pt.key = 'student' THEN vp.price END) AS student_price,
        MAX(CASE WHEN pt.key = 'import' THEN vp.price END) AS import_price,
        COALESCE(spagg.max_supply_price, 0) AS max_supply_price
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.variantMargin} vp
        ON vp.variant_id = v.${vid}
      LEFT JOIN ${TABLES.pricingTier} pt
        ON pt.id = vp.tier_id
      LEFT JOIN LATERAL (
        SELECT MAX(sp.${spPrice}) AS max_supply_price
        FROM ${TABLES.supplyPrice} sp
        WHERE sp.${spVid} = v.${vid}
      ) spagg ON TRUE
      WHERE v.${vid} IN (${placeholders})
      GROUP BY v.${vid}, spagg.max_supply_price
    `;

    const result = await db.raw(query, ids);
    const rowById = new Map(
      (result.rows || []).map((row) => [Number(row.id), row]),
    );

    const computeOne = (id) => {
      const row = rowById.get(id);
      if (!row) return null;

      const pricingBase = toNum(row.max_supply_price);
      const ctvPrice = toNum(row.ctv_price);
      const retailPrice = toNum(row.customer_price);
      const promoPrice = toNum(row.promo_price);
      const studentPrice = toNum(row.student_price);
      const importPrice = toNum(row.import_price);

      const costRounded = Math.max(0, roundToThousands(Math.round(pricingBase)));
      const cost = importPrice > 0 ? importPrice : pricingBase;

      return {
        variantId: id,
        ctvPrice: ctvPrice > 0 ? ctvPrice : retailPrice,
        retailPrice,
        promoPrice: promoPrice > 0 ? promoPrice : retailPrice,
        studentPrice: studentPrice > 0 ? studentPrice : retailPrice,
        cost,
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
