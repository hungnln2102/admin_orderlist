const { db } = require("../../db");
const { SCHEMA_PRODUCT, PRICING_TIER_SCHEMA } = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const { invalidate: invalidateTierCache } = require("../../services/pricing/tierCache");

const TIER_TABLE = `${SCHEMA_PRODUCT}.${PRICING_TIER_SCHEMA.PRICING_TIER.TABLE}`;
const MARGIN_TABLE = `${SCHEMA_PRODUCT}.${PRICING_TIER_SCHEMA.VARIANT_MARGIN.TABLE}`;
const TIER_COLS = PRICING_TIER_SCHEMA.PRICING_TIER.COLS;
const MARGIN_COLS = PRICING_TIER_SCHEMA.VARIANT_MARGIN.COLS;

const listTiers = async (_req, res) => {
  try {
    const rows = await db(TIER_TABLE)
      .select("*")
      .orderBy(TIER_COLS.SORT_ORDER, "asc");
    res.json(rows);
  } catch (err) {
    logger.error("[PricingTier] listTiers failed", { error: err.message });
    res.status(500).json({ error: "Không thể tải danh sách pricing tiers." });
  }
};

const createTier = async (req, res) => {
  const { key, prefix, label, pricing_rule, base_tier_key, sort_order } = req.body;
  if (!key || !prefix || !label || !pricing_rule) {
    return res.status(400).json({ error: "Thiếu key, prefix, label hoặc pricing_rule." });
  }
  try {
    const [row] = await db(TIER_TABLE)
      .insert({
        [TIER_COLS.KEY]: key.toLowerCase().trim(),
        [TIER_COLS.PREFIX]: prefix.toUpperCase().trim(),
        [TIER_COLS.LABEL]: label.trim(),
        [TIER_COLS.PRICING_RULE]: pricing_rule,
        [TIER_COLS.BASE_TIER_KEY]: base_tier_key || null,
        [TIER_COLS.SORT_ORDER]: sort_order || 0,
      })
      .returning("*");
    invalidateTierCache();
    res.status(201).json(row);
  } catch (err) {
    logger.error("[PricingTier] createTier failed", { error: err.message });
    if (err.code === "23505") {
      return res.status(409).json({ error: "Key hoặc prefix đã tồn tại." });
    }
    res.status(500).json({ error: "Không thể tạo pricing tier." });
  }
};

const updateTier = async (req, res) => {
  const { id } = req.params;
  const { label, pricing_rule, base_tier_key, sort_order, is_active } = req.body;
  try {
    const updates = {};
    if (label !== undefined) updates[TIER_COLS.LABEL] = label.trim();
    if (pricing_rule !== undefined) updates[TIER_COLS.PRICING_RULE] = pricing_rule;
    if (base_tier_key !== undefined) updates[TIER_COLS.BASE_TIER_KEY] = base_tier_key || null;
    if (sort_order !== undefined) updates[TIER_COLS.SORT_ORDER] = sort_order;
    if (is_active !== undefined) updates[TIER_COLS.IS_ACTIVE] = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Không có trường nào để cập nhật." });
    }

    const [row] = await db(TIER_TABLE)
      .where({ [TIER_COLS.ID]: id })
      .update(updates)
      .returning("*");

    if (!row) return res.status(404).json({ error: "Không tìm thấy tier." });
    invalidateTierCache();
    res.json(row);
  } catch (err) {
    logger.error("[PricingTier] updateTier failed", { error: err.message });
    res.status(500).json({ error: "Không thể cập nhật tier." });
  }
};

const getVariantMargins = async (req, res) => {
  const variantId = Number(req.params.id);
  if (!variantId) return res.status(400).json({ error: "variant_id không hợp lệ." });
  try {
    const rows = await db(MARGIN_TABLE)
      .join(TIER_TABLE, `${MARGIN_TABLE}.${MARGIN_COLS.TIER_ID}`, `${TIER_TABLE}.${TIER_COLS.ID}`)
      .where({ [MARGIN_COLS.VARIANT_ID]: variantId })
      .select(
        `${TIER_TABLE}.${TIER_COLS.KEY} as tier_key`,
        `${TIER_TABLE}.${TIER_COLS.PREFIX} as prefix`,
        `${MARGIN_TABLE}.${MARGIN_COLS.MARGIN_RATIO} as margin_ratio`,
        `${MARGIN_TABLE}.${MARGIN_COLS.TIER_ID} as tier_id`
      );
    res.json(rows);
  } catch (err) {
    logger.error("[PricingTier] getVariantMargins failed", { error: err.message });
    res.status(500).json({ error: "Không thể tải margins." });
  }
};

const upsertVariantMargins = async (req, res) => {
  const variantId = Number(req.params.id);
  if (!variantId) return res.status(400).json({ error: "variant_id không hợp lệ." });

  const { margins } = req.body;
  if (!Array.isArray(margins)) {
    return res.status(400).json({ error: "margins phải là mảng [{ tier_id, margin_ratio }]." });
  }

  const trx = await db.transaction();
  try {
    for (const { tier_id, margin_ratio } of margins) {
      if (!tier_id) continue;
      const ratio = Number(margin_ratio) || 0;
      await trx.raw(
        `INSERT INTO ${MARGIN_TABLE} (variant_id, tier_id, margin_ratio)
         VALUES (?, ?, ?)
         ON CONFLICT (variant_id, tier_id)
         DO UPDATE SET margin_ratio = EXCLUDED.margin_ratio`,
        [variantId, tier_id, ratio]
      );
    }
    await trx.commit();
    res.json({ success: true });
  } catch (err) {
    await trx.rollback();
    logger.error("[PricingTier] upsertVariantMargins failed", { error: err.message });
    res.status(500).json({ error: "Không thể cập nhật margins." });
  }
};

module.exports = {
  listTiers,
  createTier,
  updateTier,
  getVariantMargins,
  upsertVariantMargins,
};
