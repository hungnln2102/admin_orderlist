const db = require("../../../config/database");
const logger = require("../../../utils/logger");

/** Danh sách bài đã đăng — dùng cho storefront (không cần session). */
exports.listPublished = async (req, res) => {
  const rawLimit = Number(req.query.limit) || 6;
  const limit = Math.min(20, Math.max(1, rawLimit));
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.image_url, a.content,
              a.published_at, a.created_at,
              COALESCE(c.name, '') AS category
       FROM content.articles a
       LEFT JOIN content.article_categories c ON c.id = a.category_id
       WHERE a.status = 'published'
       ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (err) {
    logger.error("public/content/articles list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải bài viết." });
  }
};

/** Chi tiết theo slug — chỉ bài đã đăng. */
exports.getBySlug = async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "Thiếu slug." });
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.image_url, a.content,
              a.published_at, a.created_at, a.updated_at,
              COALESCE(c.name, '') AS category
       FROM content.articles a
       LEFT JOIN content.article_categories c ON c.id = a.category_id
       WHERE a.slug = $1 AND a.status = 'published'`,
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy bài viết." });
    res.json(rows[0]);
  } catch (err) {
    logger.error("public/content/articles getBySlug", { error: err.message });
    res.status(500).json({ error: "Lỗi tải bài viết." });
  }
};
