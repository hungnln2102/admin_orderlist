const { Pool } = require("pg");
const { loadBackendEnv } = require("../../src/config/loadEnv");
const { roundGiaBanValue } = require("../../src/utils/orderHelpers");

loadBackendEnv();

const clampOpenRatio = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.9999, Math.max(0, value));
};

const normalizeMarkupRatio = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric >= 1) return 0;
  return clampOpenRatio(numeric);
};

const normalizeDiscountRatio = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return clampOpenRatio(numeric > 1 ? numeric / 100 : numeric);
};

const roundToThousands = (value) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric === 0) return 0;
  const remainder = numeric % 1000;
  if (remainder === 0) return numeric;
  return remainder >= 500 ? numeric + (1000 - remainder) : numeric - remainder;
};

const roundPricingValue = (value) =>
  Math.max(0, roundToThousands(roundGiaBanValue(value)));

const calculateMarkupPrice = (basePrice, marginRatio) => {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const margin = normalizeMarkupRatio(marginRatio);
  if (margin <= 0) return base;
  const denominator = Math.max(0.0001, 1 - margin);
  return base / denominator;
};

const calculateDiscountPrice = (basePrice, discountRatio) => {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const discount = normalizeDiscountRatio(discountRatio);
  return base * (1 - discount);
};

const toFiniteMoney = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

async function ensureVariantPriceTable(client) {
  const { rows } = await client.query(`
    SELECT
      to_regclass('product.variant_margin') IS NOT NULL AS has_variant_margin,
      to_regclass('product.variant_price') IS NOT NULL AS has_variant_price
  `);
  const state = rows[0] || {};

  if (state.has_variant_margin && !state.has_variant_price) {
    await client.query(`ALTER TABLE product.variant_margin RENAME TO variant_price`);
  }

  if (!state.has_variant_margin && !state.has_variant_price) {
    throw new Error(
      "Không tìm thấy cả product.variant_margin và product.variant_price."
    );
  }

  await client.query(`
    ALTER TABLE product.variant_price
    ADD COLUMN IF NOT EXISTS price NUMERIC(15,2)
  `);
}

function resolveTierPrice({
  tier,
  tiersByKey,
  marginsByKey,
  priceCache,
  pricingBase,
  importCost,
}) {
  if (priceCache[tier.key] !== undefined) return priceCache[tier.key];

  if (tier.pricing_rule === "fixed_zero") {
    priceCache[tier.key] = 0;
    return 0;
  }

  if (tier.pricing_rule === "cost") {
    const cost = toFiniteMoney(importCost > 0 ? importCost : pricingBase);
    priceCache[tier.key] = cost;
    return cost;
  }

  let base = toFiniteMoney(pricingBase);
  if (tier.base_tier_key && tiersByKey[tier.base_tier_key]) {
    base = resolveTierPrice({
      tier: tiersByKey[tier.base_tier_key],
      tiersByKey,
      marginsByKey,
      priceCache,
      pricingBase,
      importCost,
    });
  }

  const ratio = marginsByKey[tier.key];
  if (tier.pricing_rule === "markup") {
    const value = calculateMarkupPrice(base, ratio);
    priceCache[tier.key] = value;
    return value;
  }
  if (tier.pricing_rule === "discount") {
    const value = calculateDiscountPrice(base, ratio);
    priceCache[tier.key] = value;
    return value;
  }

  priceCache[tier.key] = base;
  return base;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Thiếu DATABASE_URL.");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureVariantPriceTable(client);

    const tiersResult = await client.query(`
      SELECT id, key, pricing_rule, base_tier_key, sort_order
      FROM product.pricing_tier
      WHERE COALESCE(is_active, true) = true
      ORDER BY sort_order ASC, id ASC
    `);
    const tiers = tiersResult.rows || [];
    if (!tiers.length) {
      throw new Error("Không tìm thấy tier trong product.pricing_tier.");
    }
    const tiersByKey = Object.fromEntries(tiers.map((tier) => [tier.key, tier]));

    const variantBaseResult = await client.query(`
      SELECT
        v.id AS variant_id,
        COALESCE(MAX(sc.price), v.base_price, 0)::numeric AS pricing_base,
        COALESCE(MAX(sc.price), v.base_price, 0)::numeric AS import_cost
      FROM product.variant v
      LEFT JOIN product.supplier_cost sc
        ON sc.variant_id = v.id
      GROUP BY v.id, v.base_price
    `);

    const marginResult = await client.query(`
      SELECT
        vp.variant_id,
        vp.tier_id,
        vp.margin_ratio,
        pt.key AS tier_key
      FROM product.variant_price vp
      JOIN product.pricing_tier pt ON pt.id = vp.tier_id
    `);

    const rowsByVariant = new Map();
    for (const row of marginResult.rows || []) {
      const variantId = Number(row.variant_id);
      if (!rowsByVariant.has(variantId)) rowsByVariant.set(variantId, []);
      rowsByVariant.get(variantId).push(row);
    }

    let updatedRows = 0;
    for (const variantBase of variantBaseResult.rows || []) {
      const variantId = Number(variantBase.variant_id);
      const currentRows = rowsByVariant.get(variantId) || [];
      if (!currentRows.length) continue;

      const marginsByKey = {};
      for (const row of currentRows) {
        marginsByKey[row.tier_key] = row.margin_ratio;
      }

      const priceCache = {};
      for (const row of currentRows) {
        const tier = tiersByKey[row.tier_key];
        if (!tier) continue;

        const rawPrice = resolveTierPrice({
          tier,
          tiersByKey,
          marginsByKey,
          priceCache,
          pricingBase: toFiniteMoney(variantBase.pricing_base),
          importCost: toFiniteMoney(variantBase.import_cost),
        });
        const finalPrice = roundPricingValue(rawPrice);

        await client.query(
          `
          UPDATE product.variant_price
          SET price = $3
          WHERE variant_id = $1 AND tier_id = $2
        `,
          [variantId, Number(row.tier_id), finalPrice]
        );
        updatedRows += 1;
      }
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          ok: true,
          message:
            "Đã migrate variant_margin -> variant_price, thêm cột price và backfill giá theo công thức hiện tại.",
          updatedRows,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

