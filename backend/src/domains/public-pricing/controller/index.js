const { db } = require("../../../db");
const { roundToThousands } = require("../../../services/pricing/core");
const {
  TABLES,
  variantCols,
  productSchemaCols,
  productCategoryCols,
  categoryCols,
  productDescCols,
  supplyPriceCols,
} = require("../../products/controller/constants");
const { quoteIdent } = require("../../../utils/sql");

const MAX_BATCH = 200;
const MAX_IDS = 500;

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

async function getSellerPricingTable(_req, res, next) {
  try {
    const vid = quoteIdent(variantCols.id);
    const vProductId = quoteIdent(variantCols.productId);
    const vDescId = quoteIdent(variantCols.descVariantId);
    const vDisplayName = quoteIdent(variantCols.displayName || "display_name");
    const vVariantName = quoteIdent(variantCols.variantName || "variant_name");
    const vBasePrice = quoteIdent(variantCols.basePrice || "base_price");
    const vIsActive = quoteIdent(variantCols.isActive);
    const pId = quoteIdent(productSchemaCols.id);
    const pPackageName = quoteIdent(productSchemaCols.packageName);
    const pcProductId = quoteIdent(productCategoryCols.productId);
    const pcCategoryId = quoteIdent(productCategoryCols.categoryId);
    const cId = quoteIdent(categoryCols.id);
    const cName = quoteIdent(categoryCols.name);
    const dId = quoteIdent(productDescCols.id);
    const dRules = quoteIdent(productDescCols.rules);
    const marginJoin = TABLES.variantMargin;
    const tierJoin = TABLES.pricingTier;

    const query = `
      SELECT
        v.${vid} AS variant_id,
        v.${vProductId} AS product_id,
        COALESCE(NULLIF(TRIM(v.${vVariantName}::text), ''), v.${vid}::text) AS variant_name,
        COALESCE(NULLIF(TRIM(v.${vDisplayName}::text), ''), '') AS display_name,
        COALESCE(NULLIF(TRIM(p.${pPackageName}::text), ''), '') AS product_name,
        COALESCE(NULLIF(TRIM(d.${dRules}::text), ''), '') AS product_rules,
        COALESCE(v.${vBasePrice}, 0) AS gia_goc_raw,
        MAX(CASE WHEN pt.key = 'ctv' THEN vm.price END) AS gia_si_raw,
        MAX(CASE WHEN pt.key = 'customer' THEN vm.price END) AS gia_le_raw,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.${cId},
              'name', c.${cName}
            )
          ) FILTER (WHERE c.${cId} IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.product} p
        ON p.${pId} = v.${vProductId}
      LEFT JOIN ${TABLES.productDesc} d
        ON d.${dId} = v.${vDescId}
      LEFT JOIN ${TABLES.productCategory} pc
        ON pc.${pcProductId} = p.${pId}
      LEFT JOIN ${TABLES.category} c
        ON c.${cId} = pc.${pcCategoryId}
      LEFT JOIN ${marginJoin} vm
        ON vm.variant_id = v.${vid}
      LEFT JOIN ${tierJoin} pt
        ON pt.id = vm.tier_id
      WHERE COALESCE(v.${vIsActive}, TRUE) = TRUE
      GROUP BY
        v.${vid},
        v.${vProductId},
        v.${vVariantName},
        v.${vDisplayName},
        v.${vBasePrice},
        p.${pPackageName},
        d.${dRules}
      ORDER BY variant_name ASC
    `;

    const result = await db.raw(query);
    const rows = result.rows || [];

    const items = rows.map((row) => {
      const giaLe = toNum(row.gia_le_raw);
      const giaSi = toNum(row.gia_si_raw) || giaLe;
      const giaGoc = toNum(row.gia_goc_raw);
      return {
        variant_id: toNum(row.variant_id),
        product_id: toNum(row.product_id),
        variant_name: String(row.variant_name || "").trim() || "-",
        display_name: String(row.display_name || "").trim(),
        product_name: String(row.product_name || "").trim(),
        product_rules: String(row.product_rules || "").trim(),
        categories: Array.isArray(row.categories) ? row.categories : [],
        gia_goc: giaGoc,
        gia_si: giaSi,
        gia_le: giaLe,
      };
    });

    return res.json({ items });
  } catch (e) {
    return next(e);
  }
}

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
    const rowById = new Map((result.rows || []).map((row) => [Number(row.id), row]));

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
  getSellerPricingTable,
  postCalculate,
  postVariantsPricing,
};
