const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("../../config/dbSchema");

const TABLE = tableName(ADMIN_SCHEMA.IP_WHITELISTS.TABLE, SCHEMA_ADMIN);
const C = ADMIN_SCHEMA.IP_WHITELISTS.COLS;

const mapRow = (r) => ({
  id: r[C.ID],
  ipAddress: r[C.IP_ADDRESS],
  description: r[C.LABEL] ?? null,
  isActive: r[C.IS_ACTIVE],
  createdAt: r[C.CREATED_AT],
  updatedAt: r[C.UPDATED_AT],
});

const listIpWhitelists = async (_req, res) => {
  try {
    const rows = await db(TABLE).select("*").orderBy(C.CREATED_AT, "desc");
    res.json({ items: rows.map(mapRow) });
  } catch (err) {
    logger.error("ip-whitelist list error", err);
    res.status(500).json({ error: "Lỗi khi lấy danh sách IP whitelist." });
  }
};

const createIpWhitelist = async (req, res) => {
  try {
    const { ipAddress, description } = req.body;
    if (!ipAddress || !String(ipAddress).trim()) {
      return res.status(400).json({ error: "Địa chỉ IP là bắt buộc." });
    }

    const [row] = await db(TABLE)
      .insert({
        [C.IP_ADDRESS]: String(ipAddress).trim(),
        [C.LABEL]: description ?? null,
      })
      .returning("*");

    res.status(201).json(mapRow(row));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Địa chỉ IP đã tồn tại." });
    }
    logger.error("ip-whitelist create error", err);
    res.status(500).json({ error: "Lỗi khi thêm IP whitelist." });
  }
};

const updateIpWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const { ipAddress, description, isActive } = req.body;

    const updates = { [C.UPDATED_AT]: db.fn.now() };
    if (ipAddress !== undefined) updates[C.IP_ADDRESS] = String(ipAddress).trim();
    if (description !== undefined) updates[C.LABEL] = description;
    if (isActive !== undefined) updates[C.IS_ACTIVE] = Boolean(isActive);

    const [row] = await db(TABLE).where(C.ID, id).update(updates).returning("*");
    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy IP whitelist." });
    }

    res.json(mapRow(row));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Địa chỉ IP đã tồn tại." });
    }
    logger.error("ip-whitelist update error", err);
    res.status(500).json({ error: "Lỗi khi cập nhật IP whitelist." });
  }
};

const removeIpWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db(TABLE).where(C.ID, id).del();
    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy IP whitelist." });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error("ip-whitelist delete error", err);
    res.status(500).json({ error: "Lỗi khi xoá IP whitelist." });
  }
};

module.exports = {
  listIpWhitelists,
  createIpWhitelist,
  updateIpWhitelist,
  removeIpWhitelist,
};
