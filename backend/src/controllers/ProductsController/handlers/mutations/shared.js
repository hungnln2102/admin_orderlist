const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const {
  productCols,
  variantCols,
  productSchemaCols,
  productDescCols,
  supplyPriceCols,
  categoryCols,
  productCategoryCols,
  TABLES,
  MARGIN_PIVOT_SQL,
} = require("../../constants");

const fetchVariantView = async (variantId) => {
  const query = `
    SELECT
      v.id AS id,
      v.${quoteIdent(variantCols.displayName)} AS id_product,
      v.${quoteIdent(variantCols.displayName)} AS san_pham,
      v.${quoteIdent(variantCols.variantName)} AS package_product,
      p.${quoteIdent(productSchemaCols.packageName)} AS package,
      v.${quoteIdent(variantCols.imageUrl)} AS image_url,
      p.${quoteIdent(productSchemaCols.imageUrl)} AS package_image_url,
      v.${quoteIdent(variantCols.basePrice)} AS base_price,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.${quoteIdent(categoryCols.id)},
            'name', c.${quoteIdent(categoryCols.name)},
            'color', c.${quoteIdent(categoryCols.color)}
          )
        ) FILTER (WHERE c.${quoteIdent(categoryCols.id)} IS NOT NULL),
        '[]'::json
      ) AS categories,
      margins.pct_ctv,
      margins.pct_khach,
      margins.pct_promo,
      margins.pct_stu,
      v.${quoteIdent(variantCols.isActive)} AS is_active,
      v.${quoteIdent(variantCols.updatedAt)} AS update,
      spagg.max_supply_price AS max_supply_price
    FROM ${TABLES.variant} v
    LEFT JOIN ${TABLES.product} p
      ON p.${quoteIdent(productCols.id)} = v.${quoteIdent(variantCols.productId)}
    LEFT JOIN ${TABLES.productDesc} d
      ON d.${quoteIdent(productDescCols.id)} = v.${quoteIdent(variantCols.descVariantId)}
    LEFT JOIN ${TABLES.productCategory} pcj
      ON pcj.${quoteIdent(productCategoryCols.productId)} = p.${quoteIdent(productCols.id)}
    LEFT JOIN ${TABLES.category} c
      ON c.${quoteIdent(categoryCols.id)} = pcj.${quoteIdent(productCategoryCols.categoryId)}
    LEFT JOIN LATERAL (${MARGIN_PIVOT_SQL}) margins ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
      FROM ${TABLES.supplyPrice} sp
      WHERE sp.${quoteIdent(supplyPriceCols.variantId)} = v.id
    ) spagg ON TRUE
    WHERE v.id = ?
    GROUP BY
      v.id,
      v.${quoteIdent(variantCols.displayName)},
      v.${quoteIdent(variantCols.variantName)},
      v.${quoteIdent(variantCols.basePrice)},
      p.${quoteIdent(productSchemaCols.packageName)},
      p.${quoteIdent(productSchemaCols.imageUrl)},
      v.${quoteIdent(variantCols.imageUrl)},
      margins.pct_ctv,
      margins.pct_khach,
      margins.pct_promo,
      margins.pct_stu,
      v.${quoteIdent(variantCols.isActive)},
      v.${quoteIdent(variantCols.updatedAt)},
      spagg.max_supply_price
    LIMIT 1;
  `;
  const res = await db.raw(query, [variantId]);
  return res.rows && res.rows[0] ? res.rows[0] : null;
};

const isVariantPkeyConflict = (error) =>
  error && error.code === "23505" && error.constraint === "variant_pkey";

const normalizeCategoryIds = (input) => {
  if (!Array.isArray(input)) return null;
  const normalized = input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return Array.from(new Set(normalized));
};

const CATEGORY_COLORS = [
  "#facc15",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#eab308",
];

const hasProductCategoryColor = Boolean(productCategoryCols.color);

const normalizeCategoryColors = (input) => {
  if (!input) return new Map();
  const map = new Map();
  if (Array.isArray(input)) {
    input.forEach((entry) => {
      const id = Number(
        entry?.id ?? entry?.categoryId ?? entry?.category_id ?? NaN
      );
      const color = String(entry?.color ?? "").trim();
      if (Number.isFinite(id) && color) {
        map.set(id, color);
      }
    });
    return map;
  }
  if (typeof input === "object") {
    Object.entries(input).forEach(([key, value]) => {
      const id = Number(key);
      const color = String(value ?? "").trim();
      if (Number.isFinite(id) && color) {
        map.set(id, color);
      }
    });
  }
  return map;
};

const pickCategoryColor = (categoryId, overrides, existing) => {
  const id = Number(categoryId);
  if (overrides && overrides.has(id)) {
    return overrides.get(id);
  }
  if (existing && existing.has(id)) {
    return existing.get(id);
  }
  const index = Number.isFinite(id) ? Math.abs(id) % CATEGORY_COLORS.length : 0;
  return CATEGORY_COLORS[index];
};

const resetVariantSequence = async () => {
  const tableRef = TABLES.variant;
  const idColumn = variantCols.id || "id";
  await db.raw(
    `
    SELECT setval(
      pg_get_serial_sequence(?, ?),
      COALESCE((SELECT MAX(${quoteIdent(idColumn)}) FROM ${tableRef}), 0)
    );
  `,
    [tableRef, idColumn]
  );
};

module.exports = {
  fetchVariantView,
  isVariantPkeyConflict,
  normalizeCategoryIds,
  normalizeCategoryColors,
  pickCategoryColor,
  hasProductCategoryColor,
  resetVariantSequence,
};
