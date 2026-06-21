const {
  createImportPackage,
  expireImportPackage,
  listRules,
  getRuleByProductId,
  upsertRule,
  deleteRule,
} = require("./service");
const { toNullableNumber } = require("../../utils/normalizers");
const logger = require("../../utils/logger");

// POST /api/import-packages
const handleCreate = async (req, res) => {
  const body = req.body || {};
  const productId = toNullableNumber(body.productId ?? body.package_id);

  if (!productId || !Number.isFinite(productId) || productId < 1) {
    return res
      .status(400)
      .json({ error: "productId la bat buoc va phai hop le." });
  }

  try {
    const result = await createImportPackage({
      productId,
      supplierId: toNullableNumber(body.supplierId ?? body.supplier_id),
      importPrice: toNullableNumber(body.importPrice ?? body.import_price),
      slotLimit: toNullableNumber(body.slotLimit ?? body.slot_limit),
      matchMode: body.matchMode ?? body.match_mode ?? "information_order",
      account: body.account ?? null,
      password: body.password ?? null,
      backup_email: body.backup_email ?? null,
      two_fa: body.two_fa ?? null,
      expires_at: body.expires_at ?? null,
      note: body.note ?? null,
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error("[import-packages] Create failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Khong the tao hang nhap + goi san pham." });
  }
};

// POST /api/import-packages/:stockId/expire
const handleExpire = async (req, res) => {
  const stockId = toNullableNumber(req.params.stockId);
  if (!stockId) {
    return res.status(400).json({ error: "stockId la bat buoc." });
  }
  const deleteStock = req.body?.deleteStock === true || req.body?.delete_stock === true;

  try {
    const result = await expireImportPackage(stockId, deleteStock);
    res.json(result);
  } catch (error) {
    logger.error("[import-packages] Expire failed", {
      stockId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Khong the xu ly het han." });
  }
};

// ---- Rules handlers ----

// GET /api/import-packages/rules
const handleListRules = async (_req, res) => {
  try {
    const rules = await listRules();
    res.json(rules);
  } catch (error) {
    logger.error("[import-packages] List rules failed", { error: error.message });
    res.status(500).json({ error: "Khong the tai danh sach rules." });
  }
};

// GET /api/import-packages/rules/:productId
const handleGetRule = async (req, res) => {
  const productId = toNullableNumber(req.params.productId);
  if (!productId) {
    return res.status(400).json({ error: "productId la bat buoc." });
  }
  try {
    const rule = await getRuleByProductId(productId);
    if (!rule) {
      return res.status(404).json({ error: "Khong tim thay rule cho san pham nay." });
    }
    res.json(rule);
  } catch (error) {
    logger.error("[import-packages] Get rule failed", { productId, error: error.message });
    res.status(500).json({ error: "Khong the tai rule." });
  }
};

// PUT /api/import-packages/rules/:productId
const handleUpsertRule = async (req, res) => {
  const productId = toNullableNumber(req.params.productId);
  if (!productId) {
    return res.status(400).json({ error: "productId la bat buoc." });
  }
  try {
    const rule = await upsertRule(productId, req.body || {});
    res.json(rule);
  } catch (error) {
    logger.error("[import-packages] Upsert rule failed", { productId, error: error.message });
    res.status(500).json({ error: "Khong the luu rule." });
  }
};

// DELETE /api/import-packages/rules/:productId
const handleDeleteRule = async (req, res) => {
  const productId = toNullableNumber(req.params.productId);
  if (!productId) {
    return res.status(400).json({ error: "productId la bat buoc." });
  }
  try {
    const deleted = await deleteRule(productId);
    if (!deleted) {
      return res.status(404).json({ error: "Khong tim thay rule de xoa." });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("[import-packages] Delete rule failed", { productId, error: error.message });
    res.status(500).json({ error: "Khong the xoa rule." });
  }
};

module.exports = {
  handleCreate,
  handleExpire,
  handleListRules,
  handleGetRule,
  handleUpsertRule,
  handleDeleteRule,
};
