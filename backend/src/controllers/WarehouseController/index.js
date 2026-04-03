const { db } = require("../../db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("../../config/dbSchema");
const { normalizeDateInput } = require("../../utils/normalizers");
const { syncOrdersForPackagesUsingStock } = require("../../services/packageOrderAccountSync");
const logger = require("../../utils/logger");

const warehouseDef = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);
const cols = warehouseDef.columns;
const warehouseTable = tableName(warehouseDef.tableName, SCHEMA_PRODUCT);

const pkgDef = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const pkgCols = pkgDef.columns;
const pkgTable = tableName(pkgDef.tableName, SCHEMA_PRODUCT);

const SELECT_MAP = {
  id: cols.id,
  category: cols.productType,
  account: cols.accountUsername,
  password: cols.passwordEncrypted,
  backup_email: cols.backupEmail,
  two_fa: cols.twoFaEncrypted,
  note: cols.note,
  status: cols.status,
  expires_at: cols.expiresAt,
  is_verified: cols.isVerified,
  created_at: cols.createdAt,
  updated_at: cols.updatedAt,
};

const listWarehouse = async (_req, res) => {
  try {
    const alias = "ps";
    const rows = await db(`${warehouseTable} as ${alias}`)
      .select({
        id: `${alias}.${cols.id}`,
        category: `${alias}.${cols.productType}`,
        account: `${alias}.${cols.accountUsername}`,
        password: `${alias}.${cols.passwordEncrypted}`,
        backup_email: `${alias}.${cols.backupEmail}`,
        two_fa: `${alias}.${cols.twoFaEncrypted}`,
        note: `${alias}.${cols.note}`,
        status: db.raw(
          `CASE WHEN EXISTS (SELECT 1 FROM ${pkgTable} WHERE ${pkgCols.stockId} = ${alias}.${cols.id} OR ${pkgCols.storageId} = ${alias}.${cols.id}) THEN 'Đang Sử Dụng' ELSE 'Tồn' END`
        ),
        expires_at: `${alias}.${cols.expiresAt}`,
        is_verified: `${alias}.${cols.isVerified}`,
        created_at: `${alias}.${cols.createdAt}`,
        updated_at: `${alias}.${cols.updatedAt}`,
      })
      .orderBy(`${alias}.${cols.id}`, "asc");
    res.json(rows || []);
  } catch (error) {
    logger.error("[warehouse] Query failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải kho hàng." });
  }
};

const createWarehouse = async (req, res) => {
  const {
    category,
    account,
    password,
    backup_email,
    two_fa,
    note,
    status,
    expires_at,
    is_verified,
  } = req.body || {};

  try {
    const now = new Date().toISOString();
    const [row] = await db(warehouseTable)
      .insert({
        [cols.productType]: category ?? null,
        [cols.accountUsername]: account ?? null,
        [cols.passwordEncrypted]: password ?? null,
        [cols.backupEmail]: backup_email ?? null,
        [cols.twoFaEncrypted]: two_fa ?? null,
        [cols.note]: note ?? null,
        [cols.status]: status ?? "Tồn",
        [cols.expiresAt]: normalizeDateInput(expires_at) || null,
        [cols.isVerified]: is_verified ?? false,
        [cols.createdAt]: now,
        [cols.updatedAt]: now,
      })
      .returning(SELECT_MAP);

    res.status(201).json(row);
  } catch (error) {
    logger.error("[warehouse] Insert failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tạo kho hàng." });
  }
};

const updateWarehouse = async (req, res) => {
  const { id } = req.params;
  const {
    category,
    account,
    password,
    backup_email,
    two_fa,
    note,
    status,
    expires_at,
    is_verified,
  } = req.body || {};

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const row = await db.transaction(async (trx) => {
      const before = await trx(warehouseTable).where(cols.id, id).first();
      const [updated] = await trx(warehouseTable)
        .where(cols.id, id)
        .update({
          [cols.productType]: category ?? null,
          [cols.accountUsername]: account ?? null,
          [cols.passwordEncrypted]: password ?? null,
          [cols.backupEmail]: backup_email ?? null,
          [cols.twoFaEncrypted]: two_fa ?? null,
          [cols.note]: note ?? null,
          [cols.status]: status ?? null,
          [cols.expiresAt]: normalizeDateInput(expires_at) || null,
          [cols.isVerified]: is_verified ?? false,
          [cols.updatedAt]: new Date().toISOString(),
        })
        .returning(SELECT_MAP);

      if (!updated) return null;

      if (before) {
        const oldAcc = before[cols.accountUsername] ?? null;
        const newAcc = updated.account ?? null;
        const same =
          String(oldAcc ?? "").trim() === String(newAcc ?? "").trim();
        if (!same) {
          await syncOrdersForPackagesUsingStock(trx, id, oldAcc, newAcc);
        }
      }
      return updated;
    });

    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    res.json(row);
  } catch (error) {
    logger.error("[warehouse] Update failed", { id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật kho hàng." });
  }
};

const deleteWarehouse = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const deleted = await db(warehouseTable).where(cols.id, id).del();
    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("[warehouse] Delete failed", { id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa kho hàng." });
  }
};

module.exports = {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
