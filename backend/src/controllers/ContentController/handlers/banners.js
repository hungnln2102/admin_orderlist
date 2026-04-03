const db = require("../../../config/database");
const logger = require("../../../utils/logger");

exports.list = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM content.banners ORDER BY sort_order, id`
    );
    res.json(rows);
  } catch (err) {
    logger.error("content/banners list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải banner." });
  }
};

exports.create = async (req, res) => {
  const { image_url } = req.body;
  if (!image_url?.trim()) {
    return res.status(400).json({ error: "URL ảnh bắt buộc." });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO content.banners (image_url, sort_order)
       VALUES ($1, (SELECT COALESCE(MAX(sort_order),0)+1 FROM content.banners))
       RETURNING *`,
      [image_url.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error("content/banners create", { error: err.message });
    res.status(500).json({ error: "Lỗi tạo banner." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;
  try {
    const { rows: existing } = await db.query(
      `SELECT * FROM content.banners WHERE id = $1`,
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: "Không tìm thấy." });
    const cur = existing[0];
    const nextImage =
      image_url !== undefined ? String(image_url).trim() : cur.image_url;
    if (!nextImage) {
      return res.status(400).json({ error: "URL ảnh không được để trống." });
    }
    const { rows } = await db.query(
      `UPDATE content.banners
       SET image_url=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [nextImage, id]
    );
    res.json(rows[0]);
  } catch (err) {
    logger.error("content/banners update", { error: err.message });
    res.status(500).json({ error: "Lỗi cập nhật banner." });
  }
};

exports.toggle = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE content.banners SET active = NOT active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    res.json(rows[0]);
  } catch (err) {
    logger.error("content/banners toggle", { error: err.message });
    res.status(500).json({ error: "Lỗi bật/tắt banner." });
  }
};

exports.reorder = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "Danh sách id bắt buộc." });
  }
  try {
    const cases = ids.map((id, i) => `WHEN ${Number(id)} THEN ${i + 1}`).join(" ");
    const idList = ids.map(Number).join(",");
    await db.query(
      `UPDATE content.banners SET sort_order = CASE id ${cases} END, updated_at = NOW()
       WHERE id IN (${idList})`
    );
    const { rows } = await db.query(
      "SELECT * FROM content.banners ORDER BY sort_order, id"
    );
    res.json(rows);
  } catch (err) {
    logger.error("content/banners reorder", { error: err.message });
    res.status(500).json({ error: "Lỗi sắp xếp banner." });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM content.banners WHERE id = $1", [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Không tìm thấy." });
    res.json({ ok: true });
  } catch (err) {
    logger.error("content/banners delete", { error: err.message });
    res.status(500).json({ error: "Lỗi xóa banner." });
  }
};
