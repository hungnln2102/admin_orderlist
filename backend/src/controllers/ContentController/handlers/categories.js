const db = require("../../../config/database");
const logger = require("../../../utils/logger");

exports.list = async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.id, c.name, c.slug, c.description, c.sort_order,
             c.created_at, c.updated_at,
             COALESCE(cnt.total, 0)::int AS article_count
      FROM content.article_categories c
      LEFT JOIN (
        SELECT category_id, COUNT(*)::int AS total
        FROM content.articles GROUP BY category_id
      ) cnt ON cnt.category_id = c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json(rows);
  } catch (err) {
    logger.error("content/categories list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải danh mục." });
  }
};

exports.create = async (req, res) => {
  const { name, slug, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Tên danh mục bắt buộc." });
  try {
    const finalSlug = (slug || name).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { rows } = await db.query(
      `INSERT INTO content.article_categories (name, slug, description, sort_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order),0)+1 FROM content.article_categories))
       RETURNING *`,
      [name.trim(), finalSlug, (description || "").trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug đã tồn tại." });
    logger.error("content/categories create", { error: err.message });
    res.status(500).json({ error: "Lỗi tạo danh mục." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, slug, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Tên danh mục bắt buộc." });
  try {
    const finalSlug = (slug || name).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { rows } = await db.query(
      `UPDATE content.article_categories
       SET name = $1, slug = $2, description = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name.trim(), finalSlug, (description || "").trim(), id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug đã tồn tại." });
    logger.error("content/categories update", { error: err.message });
    res.status(500).json({ error: "Lỗi cập nhật danh mục." });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM content.article_categories WHERE id = $1", [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Không tìm thấy." });
    res.json({ ok: true });
  } catch (err) {
    logger.error("content/categories delete", { error: err.message });
    res.status(500).json({ error: "Lỗi xóa danh mục." });
  }
};
