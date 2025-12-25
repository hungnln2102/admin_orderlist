const { db } = require("../../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../../config/dbSchema");
const { normalizeDateInput } = require("../../utils/normalizers");

const warehouseDef = getDefinition("WAREHOUSE");
const cols = warehouseDef.columns;
const warehouseTable = tableName(DB_SCHEMA.WAREHOUSE.TABLE);

const listWarehouse = async (_req, res) => {
  try {
    const rows = await db(warehouseTable)
      .select({
        id: cols.id,
        category: cols.category,
        account: cols.account,
        password: cols.password,
        backup_email: cols.backupEmail,
        two_fa: cols.twoFa,
        note: cols.note,
        status: cols.status,
        created_at: cols.createdAt,
      })
      .orderBy(cols.id, "asc");
    res.json(rows || []);
  } catch (error) {
    console.error("[warehouse] Query failed:", error);
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
    created_at,
  } = req.body || {};

  try {
    const [row] = await db(warehouseTable)
      .insert({
        [cols.category]: category ?? null,
        [cols.account]: account ?? null,
        [cols.password]: password ?? null,
        [cols.backupEmail]: backup_email ?? null,
        [cols.twoFa]: two_fa ?? null,
        [cols.note]: note ?? null,
        [cols.status]: status ?? null,
        [cols.createdAt]: normalizeDateInput(created_at) || new Date().toISOString(),
      })
      .returning({
        id: cols.id,
        category: cols.category,
        account: cols.account,
        password: cols.password,
        backup_email: cols.backupEmail,
        two_fa: cols.twoFa,
        note: cols.note,
        status: cols.status,
        created_at: cols.createdAt,
      });

    res.status(201).json(row);
  } catch (error) {
    console.error("[warehouse] Insert failed:", error);
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
    created_at,
  } = req.body || {};

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const [row] = await db(warehouseTable)
      .where(cols.id, id)
      .update({
        [cols.category]: category ?? null,
        [cols.account]: account ?? null,
        [cols.password]: password ?? null,
        [cols.backupEmail]: backup_email ?? null,
        [cols.twoFa]: two_fa ?? null,
        [cols.note]: note ?? null,
        [cols.status]: status ?? null,
        [cols.createdAt]: normalizeDateInput(created_at) || null,
      })
      .returning({
        id: cols.id,
        category: cols.category,
        account: cols.account,
        password: cols.password,
        backup_email: cols.backupEmail,
        two_fa: cols.twoFa,
        note: cols.note,
        status: cols.status,
        created_at: cols.createdAt,
      });

    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    res.json(row);
  } catch (error) {
    console.error(`[warehouse] Update failed for id=${id}:`, error);
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
    console.error(`[warehouse] Delete failed for id=${id}:`, error);
    res.status(500).json({ error: "Không thể xóa kho hàng." });
  }
};

module.exports = {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
